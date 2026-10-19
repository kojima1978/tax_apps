[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [string]$TaskName = "Tax Apps Backup Settings API",
    [switch]$Unregister
)

$ErrorActionPreference = "Stop"

if ($Unregister) {
    $existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($existing -and $PSCmdlet.ShouldProcess($TaskName, "Unregister scheduled task")) {
        Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    }
    return
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ApiScript = Join-Path $ScriptDir "backup-settings-api.ps1"
if (-not (Test-Path -LiteralPath $ApiScript)) { throw "backup-settings-api.ps1 was not found: $ApiScript" }

$taskArgs = "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$ApiScript`""
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $taskArgs -WorkingDirectory $ScriptDir
$trigger = New-ScheduledTaskTrigger -AtLogOn -User ([Security.Principal.WindowsIdentity]::GetCurrent().Name)
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -ExecutionTimeLimit ([TimeSpan]::Zero) `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -MultipleInstances IgnoreNew
$principal = New-ScheduledTaskPrincipal `
    -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) `
    -LogonType Interactive `
    -RunLevel Limited

if ($PSCmdlet.ShouldProcess($TaskName, "Register scheduled task")) {
    Register-ScheduledTask `
        -TaskName $TaskName `
        -Action $action `
        -Trigger $trigger `
        -Settings $settings `
        -Principal $principal `
        -Description "Local API for the Tax Apps backup settings screen. Listens only on 127.0.0.1." `
        -Force | Out-Null
    Start-ScheduledTask -TaskName $TaskName
    Write-Host "Registered and started scheduled task: $TaskName"
}
