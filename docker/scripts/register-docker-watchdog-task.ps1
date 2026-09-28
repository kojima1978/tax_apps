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
# Schedule: a repetition interval anchored to midnight.
#
# This used to be four fixed Daily triggers, and that was wrong. A Daily trigger
# only fires if the machine happens to be running at that exact minute;
# otherwise the occurrence depends on StartWhenAvailable catching it up, and on
# this machine catch-up is unreliable - on 2026-09-28 all four occurrences
# (08/12/16/20) were dropped outright and NextRunTime simply moved to the next
# day. A repetition interval does not have that failure mode: after the machine
# wakes, the next tick arrives within the interval no matter what was missed.
#
# Anchoring to midnight is what makes a repetition safe here. The original
# reason for moving to Daily triggers was that "-Once -At (Get-Date)" anchors
# every tick to the moment of registration, and backup.sh re-registers this task
# automatically when it goes missing - so the run times wandered, sometimes into
# the middle of the night. "-Once -At (Get-Date).Date" pins the anchor to 00:00,
# so the ticks land on the same clock times (00/04/08/12/16/20 at the default
# interval) however many times the task is re-created.
#
# Four hours rather than twelve: recovery takes two runs to fully settle by
# design. A container started by one run is still inside its health
# start_period, so an unhealthy one is only restarted by the NEXT run. At two
# runs a day that second chance was up to twelve hours away, which meant a
# container that came up but never turned healthy stayed broken for most of a
# day.
#
# The start boundary is in the past, so Windows starts the task shortly after
# registration. That is intended - the watchdog is idempotent and cheap, and a
# run right after re-registration is the run you most want.
#
# Changing the cadence means changing the default below. Editing the registered
# task alone does not stick: backup.sh re-registers this task with no arguments
# whenever it finds it missing, which restores whatever is written here.
[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [string]$TaskName = "Tax Apps Docker Watchdog",
    [int]$IntervalHours = 4,
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

# Reject an interval that does not divide the day evenly: the ticks would land
# on different clock times each day, which is the wandering-schedule problem
# that the midnight anchor exists to prevent.
if ($IntervalHours -lt 1 -or $IntervalHours -gt 12) {
    throw "IntervalHours must be between 1 and 12: $IntervalHours"
}
if ((24 % $IntervalHours) -ne 0) {
    throw "IntervalHours must divide 24 evenly (1, 2, 3, 4, 6, 8, 12): $IntervalHours"
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

# RepetitionDuration has to be given explicitly: without it a "-Once" trigger
# with a repetition stops after one day.
$trigger = New-ScheduledTaskTrigger `
    -Once `
    -At (Get-Date).Date `
    -RepetitionInterval (New-TimeSpan -Hours $IntervalHours) `
    -RepetitionDuration (New-TimeSpan -Days 3650)

# ExecutionTimeLimit is 90 minutes because a single run can legitimately take a
# long time: Wait-DockerRecovery waits up to MaxRecoverySeconds (300s),
# "manage.sh recover" up to AppRecoveryTimeoutSeconds (600s) - which includes
# waiting out a backup that holds the shared operation lock - and the run now
# also performs any overdue unattended work (manage.sh due: the day's backup and
# the weekly restore drill, up to DueWorkTimeoutSeconds). Being killed mid-run
# can leave the operation lock held, so the limit must not cut a legitimate run
# short.
$settings = New-ScheduledTaskSettingsSet `
    -MultipleInstances IgnoreNew `
    -StartWhenAvailable `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 90)

$principal = New-ScheduledTaskPrincipal `
    -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) `
    -LogonType Interactive `
    -RunLevel Limited

$scheduleLabel = "every $IntervalHours hour(s) from 00:00"
$description = "Checks Docker Desktop $scheduleLabel, restarts it when docker info does not respond, starts Tax Apps containers that are not running, restarts unhealthy ones, and runs any overdue unattended work (backup / restore drill)."

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
    Write-Host "  Schedule  : $scheduleLabel"
    Write-Host "  Script    : $WatchdogScript"
    Write-Host "  RunLevel  : Limited (no UAC elevation required)"
    Write-Host "  Next run  : $((Get-ScheduledTaskInfo -TaskName $TaskName).NextRunTime)"
}
