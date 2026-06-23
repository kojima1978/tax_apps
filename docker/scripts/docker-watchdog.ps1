[CmdletBinding()]
param(
    [int]$DockerInfoTimeoutSeconds = 30,
    [int]$RetryDelaySeconds = 10,
    [int]$CooldownMinutes = 45,
    [int]$MaxRecoverySeconds = 300,
    [switch]$StartAppsAfterRecovery,
    [switch]$SkipContainerHealthRecovery,
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

function Start-TaxAppsAfterRecovery {
    if (-not $StartAppsAfterRecovery) {
        return
    }

    $manageBat = Join-Path $ScriptDir "manage.bat"
    if (-not (Test-Path -LiteralPath $manageBat)) {
        Write-WatchdogLog "WARN" "manage.bat not found; Tax Apps start skipped."
        return
    }

    Write-WatchdogLog "INFO" "Starting Tax Apps in prod mode after Docker recovery."
    $oldNoPause = $env:TAX_APPS_NO_PAUSE
    try {
        $env:TAX_APPS_NO_PAUSE = "1"
        $result = Invoke-ProcessWithTimeout `
            -FilePath $manageBat `
            -ArgumentList @("start", "--prod") `
            -TimeoutSeconds 900

        if ($result.ExitCode -eq 0) {
            Write-WatchdogLog "INFO" "Tax Apps start completed."
        }
        else {
            Write-WatchdogLog "WARN" "Tax Apps start exited with code $($result.ExitCode)."
        }
    }
    finally {
        $env:TAX_APPS_NO_PAUSE = $oldNoPause
    }
}

Enter-WatchdogLock
try {
    $dockerCli = Get-DockerCliPath
    Write-WatchdogLog "INFO" "Checking Docker daemon. DockerCli=$dockerCli"

    if (Test-DockerHealthy -DockerCli $dockerCli) {
        Restart-UnhealthyTaxAppsContainers -DockerCli $dockerCli
        exit 0
    }

    Write-WatchdogLog "INFO" "Retrying after ${RetryDelaySeconds}s."
    Start-Sleep -Seconds $RetryDelaySeconds

    if (Test-DockerHealthy -DockerCli $dockerCli) {
        Restart-UnhealthyTaxAppsContainers -DockerCli $dockerCli
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
        Start-TaxAppsAfterRecovery
        Restart-UnhealthyTaxAppsContainers -DockerCli $dockerCli
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
