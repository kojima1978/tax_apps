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

# この日次タスクだけログを一切残していなかった。成功も失敗も画面に出ず、
# 手がかりは docker/backups にファイルが出来たかどうかだけ。
# 週次のリストア訓練と同じく、出力は必ずファイルへ落とす。
$LogDir = Join-Path (Split-Path -Parent $ScriptDir) "logs"
if (-not (Test-Path -LiteralPath $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}
$LogFile = Join-Path $LogDir "backup.log"

$action = New-ScheduledTaskAction `
    -Execute "cmd.exe" `
    -Argument "/c `"`"$BackupBat`" >> `"$LogFile`" 2>&1`"" `
    -WorkingDirectory $ScriptDir

$trigger = New-ScheduledTaskTrigger `
    -Daily `
    -At $Time

# ExecutionTimeLimit を 30 分から 60 分へ。backup.sh は操作ロックを最大 900 秒
# 待つようになった（ログオン直後にウォッチドッグや週次訓練と重なるのが常態で、
# 以前は負けた側がその回を丸ごと捨てていた）。待ち時間ぶんを足しても収まる幅が要る。
$settings = New-ScheduledTaskSettingsSet `
    -MultipleInstances IgnoreNew `
    -StartWhenAvailable `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 60)

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
    Write-Host "  Log      : $LogFile"
    Write-Host "  Next run : $($registered.Triggers[0].StartBoundary)"
}
