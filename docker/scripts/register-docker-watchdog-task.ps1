# Registers the Docker watchdog as a scheduled task.
#
# This task deliberately runs WITHOUT elevation (RunLevel Limited), the same as
# the backup and restore-drill tasks. Everything the watchdog actually needs
# works unelevated: stopping Docker Desktop processes owned by this user,
# "wsl --shutdown", and relaunching Docker Desktop.exe. Only the optional
# "Restart-Service com.docker.service" needs admin, and the watchdog already
# treats that as best-effort - the service is Manual/Stopped on this machine
# and Docker Desktop does not depend on it.
#
# Requiring UAC here was a reliability problem, not a safety feature: the task
# could only ever be (re)created by an elevated double-click, so once it went
# missing it stayed missing. It has already silently disappeared twice.
#
# Schedule: twice a day at fixed times, not a short repetition interval.
#
# Fixed times are used instead of "-Once + RepetitionInterval 12h" on purpose.
# A repetition interval is anchored to whenever the task happened to be
# registered, so re-registering it (backup.sh does that automatically when the
# task goes missing) silently moves both daily runs to a new, possibly
# middle-of-the-night, clock time. Daily triggers always land on the same hours
# no matter when they were created.
#
# StartWhenAvailable covers the machine being off at 08:00 / 20:00: the missed
# occurrence runs at the next opportunity.
[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [string]$TaskName = "Tax Apps Docker Watchdog",
    [string[]]$DailyTimes = @("08:00", "20:00"),
    [switch]$Unregister
)

$ErrorActionPreference = "Stop"

if ($Unregister) {
    $existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if (-not $existing) {
        Write-Warning "Task '$TaskName' does not exist."
        return
    }
    if ($PSCmdlet.ShouldProcess($TaskName, "Unregister scheduled task")) {
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
        Write-Host "Unregistered scheduled task: $TaskName"
    }
    return
}

if (-not $DailyTimes -or $DailyTimes.Count -lt 1) {
    throw "DailyTimes must contain at least one time of day."
}

# Parse up front so a typo fails here rather than registering a task with a
# trigger at some unintended hour.
$parsedTimes = foreach ($time in $DailyTimes) {
    $parsed = [datetime]::MinValue
    if (-not [datetime]::TryParse($time, [ref]$parsed)) {
        throw "DailyTimes contains a value that is not a time of day: $time"
    }
    (Get-Date).Date.AddHours($parsed.Hour).AddMinutes($parsed.Minute)
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$WatchdogScript = Join-Path $ScriptDir "docker-watchdog.ps1"

if (-not (Test-Path -LiteralPath $WatchdogScript)) {
    throw "docker-watchdog.ps1 was not found: $WatchdogScript"
}

$taskArgs = "-NoProfile -ExecutionPolicy Bypass -File `"$WatchdogScript`""

$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument $taskArgs `
    -WorkingDirectory $ScriptDir

$trigger = foreach ($at in $parsedTimes) {
    New-ScheduledTaskTrigger -Daily -At $at
}

# ExecutionTimeLimit is 30 minutes because a single run can legitimately take a
# long time: Wait-DockerRecovery waits up to MaxRecoverySeconds (300s) and
# "manage.sh recover" up to AppRecoveryTimeoutSeconds (600s), plus the docker
# info checks and the unhealthy-container restarts. At the old 15-minute cadence
# a killed run was cheap - the next one came 15 minutes later. Now the next run
# is half a day away, and being killed mid-recover can leave manage.sh's
# operation lock held, so the limit must not cut a legitimate run short.
$settings = New-ScheduledTaskSettingsSet `
    -MultipleInstances IgnoreNew `
    -StartWhenAvailable `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 30)

$principal = New-ScheduledTaskPrincipal `
    -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) `
    -LogonType Interactive `
    -RunLevel Limited

$timesLabel = ($DailyTimes -join ", ")
$description = "Checks Docker Desktop daily at $timesLabel, restarts it when docker info does not respond, starts Tax Apps containers that are not running, and restarts unhealthy ones."

$existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
$isUpdate = $null -ne $existingTask

if ($PSCmdlet.ShouldProcess($TaskName, "Register scheduled task")) {
    Register-ScheduledTask `
        -TaskName $TaskName `
        -Action $action `
        -Trigger $trigger `
        -Settings $settings `
        -Principal $principal `
        -Description $description `
        -Force | Out-Null

    $registered = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if (-not $registered) {
        throw "Failed to register scheduled task: $TaskName"
    }

    $label = if ($isUpdate) { "Updated" } else { "Registered" }
    Write-Host "$label scheduled task: $TaskName"
    Write-Host "  Schedule  : daily at $timesLabel"
    Write-Host "  Script    : $WatchdogScript"
    Write-Host "  RunLevel  : Limited (no UAC elevation required)"
    Write-Host "  Next run  : $((Get-ScheduledTaskInfo -TaskName $TaskName).NextRunTime)"
}
