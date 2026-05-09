[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [string]$TaskName = "Tax Apps Docker Watchdog",
    [int]$IntervalMinutes = 60,
    [switch]$StartAppsAfterRecovery
)

$ErrorActionPreference = "Stop"

if ($IntervalMinutes -lt 5) {
    throw "IntervalMinutes must be 5 or greater."
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$WatchdogScript = Join-Path $ScriptDir "docker-watchdog.ps1"

if (-not (Test-Path -LiteralPath $WatchdogScript)) {
    throw "docker-watchdog.ps1 was not found: $WatchdogScript"
}

$taskArgs = "-NoProfile -ExecutionPolicy Bypass -File `"$WatchdogScript`""
if ($StartAppsAfterRecovery) {
    $taskArgs += " -StartAppsAfterRecovery"
}

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
    -RunLevel Highest

$description = "Checks Docker Desktop every $IntervalMinutes minutes and restarts it when docker info does not respond."

if ($PSCmdlet.ShouldProcess($TaskName, "Register scheduled task")) {
    Register-ScheduledTask `
        -TaskName $TaskName `
        -Action $action `
        -Trigger $trigger `
        -Settings $settings `
        -Principal $principal `
        -Description $description `
        -Force | Out-Null

    Write-Host "Registered scheduled task: $TaskName"
    Write-Host "Interval: $IntervalMinutes minutes"
    Write-Host "Script: $WatchdogScript"
}
