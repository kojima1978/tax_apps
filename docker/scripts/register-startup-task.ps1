# Registers the Tax Apps logon startup task.
#
# What this closes: "restart: unless-stopped" does not survive a "docker compose stop".
# Compose flags those containers as manually stopped, so they stay down through every
# later daemon start. Once stop.bat had been pressed even once, nothing on this machine
# ever brought the apps back except a human running start-prod.bat.
#
# The task runs docker-watchdog.ps1 -StartupMode rather than "manage.bat start":
#   - it waits for the Docker engine first, which at logon is usually still coming up
#   - recovery is delegated to "manage.sh recover", so start / stop / recover all share
#     one definition of what running means (the APPS array in manage.sh)
#   - the stop marker is honoured, so "stop.bat then reboot" stays stopped
#   - it never rebuilds, and it keeps whichever mode (dev / prod) was last started
#
# Like the watchdog and backup tasks this runs unelevated (RunLevel Limited) so it can
# always be re-registered by a plain double-click.
#
# NOTE: keep this file ASCII-only. Windows PowerShell 5.1 reads a .ps1 without a BOM
# using the ANSI code page (932 here), so UTF-8 Japanese text breaks parsing.
[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [string]$TaskName = "Tax Apps Startup",
    [int]$DelayMinutes = 2,
    [int]$MaxRecoverySeconds = 900,
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

if ($DelayMinutes -lt 0) {
    throw "DelayMinutes must be 0 or greater."
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$WatchdogScript = Join-Path $ScriptDir "docker-watchdog.ps1"

if (-not (Test-Path -LiteralPath $WatchdogScript)) {
    throw "docker-watchdog.ps1 was not found: $WatchdogScript"
}

$taskArgs = "-NoProfile -ExecutionPolicy Bypass -File `"$WatchdogScript`"" +
            " -StartupMode -MaxRecoverySeconds $MaxRecoverySeconds"

$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument $taskArgs `
    -WorkingDirectory $ScriptDir

$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name

$trigger = New-ScheduledTaskTrigger -AtLogOn -User $currentUser
if ($DelayMinutes -gt 0) {
    # Give Docker Desktop's own autostart a head start; without this the task races it
    # and just sits in Wait-DockerRecovery for no reason.
    $trigger.Delay = "PT${DelayMinutes}M"
}

$settings = New-ScheduledTaskSettingsSet `
    -MultipleInstances IgnoreNew `
    -StartWhenAvailable `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 30)

$principal = New-ScheduledTaskPrincipal `
    -UserId $currentUser `
    -LogonType Interactive `
    -RunLevel Limited

$description = "At logon, waits for the Docker engine and then runs 'manage.sh recover' to bring up Tax Apps containers that are not running. Skipped while an intentional stop marker exists."

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
    Write-Host "  Trigger   : At logon of $currentUser (delay ${DelayMinutes}m)"
    Write-Host "  Script    : $WatchdogScript -StartupMode"
    Write-Host "  Wait limit: $MaxRecoverySeconds seconds for the Docker engine"
    Write-Host "  RunLevel  : Limited (no UAC elevation required)"
}
