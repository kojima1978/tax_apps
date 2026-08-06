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
[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [string]$TaskName = "Tax Apps Docker Watchdog",
    [int]$IntervalMinutes = 15,
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

if ($IntervalMinutes -lt 5) {
    throw "IntervalMinutes must be 5 or greater."
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

$trigger = New-ScheduledTaskTrigger `
    -Once `
    -At (Get-Date).AddMinutes(1) `
    -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes) `
    -RepetitionDuration (New-TimeSpan -Days 3650)

$settings = New-ScheduledTaskSettingsSet `
    -MultipleInstances IgnoreNew `
    -StartWhenAvailable `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 15)

$principal = New-ScheduledTaskPrincipal `
    -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) `
    -LogonType Interactive `
    -RunLevel Limited

$description = "Checks Docker Desktop every $IntervalMinutes minutes, restarts it when docker info does not respond, starts Tax Apps containers that are not running, and restarts unhealthy ones."

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
    Write-Host "  Interval  : $IntervalMinutes minutes"
    Write-Host "  Script    : $WatchdogScript"
    Write-Host "  RunLevel  : Limited (no UAC elevation required)"
    Write-Host "  Next run  : $($registered.Triggers[0].StartBoundary)"
}
