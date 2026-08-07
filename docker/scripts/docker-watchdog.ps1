[CmdletBinding()]
param(
    [int]$DockerInfoTimeoutSeconds = 30,
    [int]$RetryDelaySeconds = 10,
    [int]$CooldownMinutes = 45,
    [int]$MaxRecoverySeconds = 300,
    [int]$AppRecoveryTimeoutSeconds = 600,
    [switch]$SkipAppRecovery,
    [switch]$SkipContainerHealthRecovery,
    # Used by the logon task. Right after logon, Docker Desktop is usually mid-startup
    # rather than broken, so killing it and restarting WSL - what the periodic run does -
    # would only make the first boot slower and flakier. In this mode we start Docker
    # Desktop only if it is not running at all, then simply wait.
    [switch]$StartupMode,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$DockerOpsDir = Split-Path -Parent $ScriptDir
$LogDir = Join-Path $DockerOpsDir "logs"
$LogPath = Join-Path $LogDir "docker-watchdog.log"
$StatePath = Join-Path $LogDir "docker-watchdog.state.json"
$LockPath = Join-Path $LogDir "docker-watchdog.lock"

New-Item -ItemType Directory -Path $LogDir -Force | Out-Null

function Write-WatchdogLog {
    param(
        [string]$Level,
        [string]$Message
    )

    $line = "{0} [{1}] {2}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Level, $Message
    Add-Content -LiteralPath $LogPath -Value $line -Encoding UTF8
    Write-Host $line
}

function Enter-WatchdogLock {
    if (Test-Path -LiteralPath $LockPath) {
        $age = (Get-Date) - (Get-Item -LiteralPath $LockPath).LastWriteTime
        if ($age.TotalMinutes -lt 30) {
            Write-WatchdogLog "WARN" "Another watchdog run appears active; skipping."
            exit 0
        }

        Write-WatchdogLog "WARN" "Removing stale watchdog lock."
        Remove-Item -LiteralPath $LockPath -Force -ErrorAction SilentlyContinue
    }

    New-Item -ItemType File -Path $LockPath -Value $PID -ErrorAction Stop | Out-Null
}

function Exit-WatchdogLock {
    Remove-Item -LiteralPath $LockPath -Force -ErrorAction SilentlyContinue
}

function Get-DockerCliPath {
    $dockerCommand = Get-Command "docker.exe" -ErrorAction SilentlyContinue
    if ($dockerCommand) {
        return $dockerCommand.Source
    }

    $defaultPath = Join-Path $env:ProgramFiles "Docker\Docker\resources\bin\docker.exe"
    if (Test-Path -LiteralPath $defaultPath) {
        return $defaultPath
    }

    throw "docker.exe was not found. Install Docker Desktop or add docker.exe to PATH."
}

function Join-ProcessArguments {
    param([string[]]$ArgumentList)

    $quoted = foreach ($argument in $ArgumentList) {
        if ($argument -match '[\s"]') {
            '"' + ($argument -replace '"', '\"') + '"'
        }
        else {
            $argument
        }
    }

    return ($quoted -join " ")
}

function Invoke-ProcessWithTimeout {
    param(
        [string]$FilePath,
        [string[]]$ArgumentList,
        [int]$TimeoutSeconds
    )

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo.FileName = $FilePath
    $process.StartInfo.Arguments = Join-ProcessArguments -ArgumentList $ArgumentList
    $process.StartInfo.UseShellExecute = $false
    $process.StartInfo.RedirectStandardOutput = $true
    $process.StartInfo.RedirectStandardError = $true
    $process.StartInfo.CreateNoWindow = $true

    try {
        [void]$process.Start()

        if (-not $process.WaitForExit($TimeoutSeconds * 1000)) {
            Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
            return [pscustomobject]@{
                TimedOut = $true
                ExitCode = $null
                StdOut = $process.StandardOutput.ReadToEnd()
                StdErr = $process.StandardError.ReadToEnd()
            }
        }

        return [pscustomobject]@{
            TimedOut = $false
            ExitCode = $process.ExitCode
            StdOut = $process.StandardOutput.ReadToEnd()
            StdErr = $process.StandardError.ReadToEnd()
        }
    }
    finally {
        $process.Dispose()
    }
}

function Start-DetachedProcess {
    param(
        [string]$FilePath,
        [string[]]$ArgumentList = @(),
        [string]$WorkingDirectory = ""
    )

    $processInfo = New-Object System.Diagnostics.ProcessStartInfo
    $processInfo.FileName = $FilePath
    $processInfo.Arguments = Join-ProcessArguments -ArgumentList $ArgumentList
    $processInfo.UseShellExecute = $true
    $processInfo.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Minimized
    if (-not [string]::IsNullOrWhiteSpace($WorkingDirectory)) {
        $processInfo.WorkingDirectory = $WorkingDirectory
    }

    [void][System.Diagnostics.Process]::Start($processInfo)
}

function Test-DockerHealthy {
    param([string]$DockerCli)

    $result = Invoke-ProcessWithTimeout `
        -FilePath $DockerCli `
        -ArgumentList @("info", "--format", "{{.ServerVersion}}") `
        -TimeoutSeconds $DockerInfoTimeoutSeconds

    if ($result.TimedOut) {
        Write-WatchdogLog "WARN" "docker info timed out after ${DockerInfoTimeoutSeconds}s."
        return $false
    }

    if ($result.ExitCode -eq 0) {
        $version = ($result.StdOut | Out-String).Trim()
        Write-WatchdogLog "INFO" "Docker daemon is healthy. ServerVersion=$version"
        return $true
    }

    $message = ($result.StdErr | Out-String).Trim()
    if ([string]::IsNullOrWhiteSpace($message)) {
        $message = "docker info exited with code $($result.ExitCode)."
    }
    Write-WatchdogLog "WARN" $message
    return $false
}

# Starts containers that are not running.
#
# This targets something completely different from the unhealthy-restart below:
# "docker ps" only ever returns running containers, so exited / created /
# removed ones can never be picked up there. "It did not come up" is almost
# always that state, so starting is delegated to manage.sh recover.
#
# manage.sh recover is built for being called here unattended (twice a day):
#   - never rebuilds / only touches apps that are down / keeps the last dev-prod mode
#   - does nothing right after stop, down or clean (an intentional shutdown)
#
# NOTE: keep this file ASCII-only. Windows PowerShell 5.1 reads a .ps1 without a
# BOM using the ANSI code page (932 here), so UTF-8 Japanese text breaks parsing.
function Invoke-TaxAppsRecovery {
    if ($SkipAppRecovery) {
        return
    }

    $manageBat = Join-Path $ScriptDir "manage.bat"
    if (-not (Test-Path -LiteralPath $manageBat)) {
        Write-WatchdogLog "WARN" "manage.bat not found; app recovery skipped."
        return
    }

    if ($DryRun) {
        Write-WatchdogLog "INFO" "DryRun is enabled; app recovery skipped."
        return
    }

    $oldNoPause = $env:TAX_APPS_NO_PAUSE
    try {
        # manage.bat pauses by default; always suppress that for unattended runs.
        $env:TAX_APPS_NO_PAUSE = "1"
        $result = Invoke-ProcessWithTimeout `
            -FilePath $manageBat `
            -ArgumentList @("recover") `
            -TimeoutSeconds $AppRecoveryTimeoutSeconds

        if ($result.TimedOut) {
            Write-WatchdogLog "WARN" "manage.bat recover timed out after ${AppRecoveryTimeoutSeconds}s."
            return
        }

        # While a manual start / stop is running, manage.sh rejects this via its
        # operation lock. That is not a fault; leave it to the next run.
        if ($result.ExitCode -ne 0) {
            $message = ($result.StdErr | Out-String).Trim()
            if ([string]::IsNullOrWhiteSpace($message)) {
                $message = "manage.bat recover exited with code $($result.ExitCode)."
            }
            Write-WatchdogLog "WARN" $message
            return
        }

        # manage.sh recover prints one ASCII summary line for exactly this.
        # Matching its Japanese log lines would depend on the console code page.
        $stdout = ($result.StdOut | Out-String)
        $sawSummary = $false
        foreach ($line in ($stdout -split "`r?`n")) {
            if ($line -notmatch 'RECOVER_RESULT\s+(.+)$') { continue }
            $sawSummary = $true
            $summary = $Matches[1].Trim()

            # "ok recovered=0 skipped=0" is the normal quiet case - everything was
            # already up - and logging it on every run would bury the lines that
            # matter. Anything else means an app was down: either it got started
            # (INFO) or it was left down (WARN). Being left down silently is exactly
            # the state that went unnoticed for three months.
            if ($summary -notmatch 'status=ok\b') {
                Write-WatchdogLog "WARN" "manage.sh recover did not run: $summary"
            }
            elseif ($summary -notmatch 'skipped=0\b') {
                Write-WatchdogLog "WARN" "manage.sh recover left apps down: $summary"
            }
            elseif ($summary -match 'recovered=0\b') {
                Write-Verbose "manage.sh recover: $summary"
            }
            else {
                Write-WatchdogLog "INFO" "manage.sh recover: $summary"
            }
        }

        if (-not $sawSummary) {
            Write-WatchdogLog "WARN" "manage.bat recover produced no RECOVER_RESULT line."
        }
    }
    finally {
        $env:TAX_APPS_NO_PAUSE = $oldNoPause
    }
}

function Restart-UnhealthyTaxAppsContainers {
    param([string]$DockerCli)

    if ($SkipContainerHealthRecovery) {
        return
    }

    $result = Invoke-ProcessWithTimeout `
        -FilePath $DockerCli `
        -ArgumentList @(
            "ps",
            "--filter", "label=tax-apps.autoheal=true",
            "--filter", "health=unhealthy",
            "--format", "{{.Names}}"
        ) `
        -TimeoutSeconds 30

    if ($result.TimedOut) {
        Write-WatchdogLog "WARN" "docker ps for unhealthy containers timed out."
        return
    }

    if ($result.ExitCode -ne 0) {
        $message = ($result.StdErr | Out-String).Trim()
        if ([string]::IsNullOrWhiteSpace($message)) {
            $message = "docker ps exited with code $($result.ExitCode)."
        }
        Write-WatchdogLog "WARN" "Could not check unhealthy containers. $message"
        return
    }

    $containers = @(
        ($result.StdOut -split "`r?`n") |
            Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
    )

    foreach ($container in $containers) {
        Write-WatchdogLog "WARN" "Restarting unhealthy Tax Apps container: $container"

        if ($DryRun) {
            Write-WatchdogLog "INFO" "DryRun is enabled; container restart skipped."
            continue
        }

        $restart = Invoke-ProcessWithTimeout `
            -FilePath $DockerCli `
            -ArgumentList @("restart", "--time", "30", $container) `
            -TimeoutSeconds 90

        if (-not $restart.TimedOut -and $restart.ExitCode -eq 0) {
            Write-WatchdogLog "INFO" "Container restarted: $container"
        }
        elseif ($restart.TimedOut) {
            Write-WatchdogLog "WARN" "docker restart timed out: $container"
        }
        else {
            $message = ($restart.StdErr | Out-String).Trim()
            Write-WatchdogLog "WARN" "docker restart failed for $container. $message"
        }
    }
}

function Get-WatchdogState {
    if (-not (Test-Path -LiteralPath $StatePath)) {
        return $null
    }

    try {
        return Get-Content -LiteralPath $StatePath -Raw | ConvertFrom-Json
    }
    catch {
        Write-WatchdogLog "WARN" "State file could not be read; ignoring it."
        return $null
    }
}

function Test-RestartCooldown {
    $state = Get-WatchdogState
    if (-not $state -or -not $state.LastRestartUtc) {
        return $false
    }

    try {
        $lastRestart = [datetime]::Parse($state.LastRestartUtc).ToUniversalTime()
    }
    catch {
        return $false
    }

    $elapsed = (Get-Date).ToUniversalTime() - $lastRestart
    if ($elapsed.TotalMinutes -lt $CooldownMinutes) {
        $remaining = [math]::Ceiling($CooldownMinutes - $elapsed.TotalMinutes)
        Write-WatchdogLog "WARN" "Docker is unhealthy, but restart cooldown is active. Remaining=${remaining}m"
        return $true
    }

    return $false
}

function Save-RestartState {
    param([string]$Reason)

    $state = [ordered]@{
        LastRestartUtc = (Get-Date).ToUniversalTime().ToString("o")
        LastReason = $Reason
    }

    $state | ConvertTo-Json | Set-Content -LiteralPath $StatePath -Encoding UTF8
}

function Restart-DockerDesktop {
    $reason = "docker info failed twice"
    Write-WatchdogLog "WARN" "Restarting Docker Desktop. Reason=$reason"

    if ($DryRun) {
        Write-WatchdogLog "INFO" "DryRun is enabled; restart skipped."
        return
    }

    $processNames = @(
        "Docker Desktop",
        "com.docker.backend",
        "com.docker.build",
        "docker-sandbox",
        "docker"
    )
    foreach ($name in $processNames) {
        Get-Process -Name $name -ErrorAction SilentlyContinue |
            Stop-Process -Force -ErrorAction SilentlyContinue
    }

    $service = Get-Service -Name "com.docker.service" -ErrorAction SilentlyContinue
    if ($service) {
        try {
            Restart-Service -Name "com.docker.service" -Force -ErrorAction Stop
            Write-WatchdogLog "INFO" "com.docker.service restarted."
        }
        catch {
            Write-WatchdogLog "WARN" "Could not restart com.docker.service. $($_.Exception.Message)"
        }
    }

    try {
        $wslResult = Invoke-ProcessWithTimeout `
            -FilePath "wsl.exe" `
            -ArgumentList @("--shutdown") `
            -TimeoutSeconds 30
        if (-not $wslResult.TimedOut -and $wslResult.ExitCode -eq 0) {
            Write-WatchdogLog "INFO" "WSL shutdown completed."
        }
        else {
            Write-WatchdogLog "WARN" "WSL shutdown did not complete cleanly."
        }
    }
    catch {
        Write-WatchdogLog "WARN" "wsl --shutdown failed. $($_.Exception.Message)"
    }

    $desktopExe = Join-Path $env:ProgramFiles "Docker\Docker\Docker Desktop.exe"
    if (-not (Test-Path -LiteralPath $desktopExe)) {
        throw "Docker Desktop.exe was not found: $desktopExe"
    }

    Start-DetachedProcess -FilePath $desktopExe
    Save-RestartState -Reason $reason
    Write-WatchdogLog "INFO" "Docker Desktop start requested."
}

# Startup-mode counterpart of Restart-DockerDesktop: launch Docker Desktop when it is
# not running, and otherwise keep hands off. No process kill, no "wsl --shutdown", and
# no cooldown state is written - a slow first boot must not consume the periodic run's
# restart budget.
function Start-DockerDesktopIfStopped {
    if (Get-Process -Name "Docker Desktop" -ErrorAction SilentlyContinue) {
        Write-WatchdogLog "INFO" "Docker Desktop is already running; waiting for the engine."
        return
    }

    $desktopExe = Join-Path $env:ProgramFiles "Docker\Docker\Docker Desktop.exe"
    if (-not (Test-Path -LiteralPath $desktopExe)) {
        throw "Docker Desktop.exe was not found: $desktopExe"
    }

    if ($DryRun) {
        Write-WatchdogLog "INFO" "DryRun is enabled; Docker Desktop start skipped."
        return
    }

    Start-DetachedProcess -FilePath $desktopExe
    Write-WatchdogLog "INFO" "Docker Desktop start requested (startup mode)."
}

function Wait-DockerRecovery {
    param([string]$DockerCli)

    $deadline = (Get-Date).AddSeconds($MaxRecoverySeconds)
    while ((Get-Date) -lt $deadline) {
        Start-Sleep -Seconds 15
        if (Test-DockerHealthy -DockerCli $DockerCli) {
            return $true
        }
    }

    return $false
}

# Recovery has two stages, and the order matters:
#   1. Invoke-TaxAppsRecovery             - start containers that are not running
#   2. Restart-UnhealthyTaxAppsContainers - restart ones that run but are unhealthy
# Stage 2 does not act on what stage 1 just started (health is "starting" during
# start_period, so they are not matched); those are picked up on the next run.
# Since the periodic task now runs only twice a day, "the next run" is up to half
# a day away: a container that starts but never turns healthy stays that way
# until then. The logon task is the other chance to catch it.
function Invoke-TaxAppsRecoverySequence {
    param([string]$DockerCli)

    Invoke-TaxAppsRecovery
    Restart-UnhealthyTaxAppsContainers -DockerCli $DockerCli
}

Enter-WatchdogLock
try {
    $dockerCli = Get-DockerCliPath
    Write-WatchdogLog "INFO" "Checking Docker daemon. DockerCli=$dockerCli"

    if (Test-DockerHealthy -DockerCli $dockerCli) {
        Invoke-TaxAppsRecoverySequence -DockerCli $dockerCli
        exit 0
    }

    Write-WatchdogLog "INFO" "Retrying after ${RetryDelaySeconds}s."
    Start-Sleep -Seconds $RetryDelaySeconds

    if (Test-DockerHealthy -DockerCli $dockerCli) {
        Invoke-TaxAppsRecoverySequence -DockerCli $dockerCli
        exit 0
    }

    if ($StartupMode) {
        Start-DockerDesktopIfStopped

        if (Wait-DockerRecovery -DockerCli $dockerCli) {
            Invoke-TaxAppsRecoverySequence -DockerCli $dockerCli
            exit 0
        }

        # Deliberately exit 0: the periodic run (daily at 08:00 / 20:00) is the one
        # allowed to escalate to a full restart. Failing the logon task here would only
        # show a red task in Task Scheduler for a machine that recovers on its own.
        Write-WatchdogLog "WARN" "Docker did not become healthy within ${MaxRecoverySeconds}s at logon; leaving it to the periodic run."
        exit 0
    }

    if (Test-RestartCooldown) {
        exit 0
    }

    Restart-DockerDesktop

    if ($DryRun) {
        exit 0
    }

    if (Wait-DockerRecovery -DockerCli $dockerCli) {
        Invoke-TaxAppsRecoverySequence -DockerCli $dockerCli
        exit 0
    }

    Write-WatchdogLog "ERROR" "Docker did not become healthy within ${MaxRecoverySeconds}s."
    exit 2
}
catch {
    Write-WatchdogLog "ERROR" $_.Exception.Message
    exit 2
}
finally {
    Exit-WatchdogLock
}
