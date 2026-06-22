[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [string]$TaskName = "Tax Apps Daily Backup",
    [string]$Time = "03:00",
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

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackupBat = Join-Path $ScriptDir "backup-db.bat"

if (-not (Test-Path -LiteralPath $BackupBat)) {
    throw "backup-db.bat was not found: $BackupBat"
}

$action = New-ScheduledTaskAction `
    -Execute "cmd.exe" `
    -Argument "/c `"$BackupBat`"" `
    -WorkingDirectory $ScriptDir

$trigger = New-ScheduledTaskTrigger `
    -Daily `
    -At $Time

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

$description = "Runs backup-db.bat daily at $Time to back up all Tax Apps databases (PostgreSQL, SQLite)."

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
    Write-Host "  Schedule : Daily at $Time"
    Write-Host "  Script   : $BackupBat"
    Write-Host "  Next run : $($registered.Triggers[0].StartBoundary)"
}
