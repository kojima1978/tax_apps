[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [string]$TaskName = "Tax Apps Weekly Restore Drill",
    [string]$Time = "04:00",
    [string]$DaysOfWeek = "Sunday",
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
$DrillBat = Join-Path $ScriptDir "restore-drill.bat"

if (-not (Test-Path -LiteralPath $DrillBat)) {
    throw "restore-drill.bat was not found: $DrillBat"
}

# 失敗が誰の目にも触れないと訓練の意味がないので、必ずログへ落とす。
$LogDir = Join-Path (Split-Path -Parent $ScriptDir) "logs"
if (-not (Test-Path -LiteralPath $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}
$LogFile = Join-Path $LogDir "restore-drill.log"

$action = New-ScheduledTaskAction `
    -Execute "cmd.exe" `
    -Argument "/c `"`"$DrillBat`" >> `"$LogFile`" 2>&1`"" `
    -WorkingDirectory $ScriptDir

# 日次バックアップ(03:00)が終わってから、その成果物を対象に走らせる。
$trigger = New-ScheduledTaskTrigger `
    -Weekly `
    -DaysOfWeek $DaysOfWeek `
    -At $Time

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

$description = "Runs restore-drill.bat weekly ($DaysOfWeek $Time). Restores the latest encrypted backup into a throwaway PostgreSQL container and verifies the SQLite copies, proving the dumps are actually restorable."

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
    # StartBoundary は「登録日の指定時刻」なので週次だと過去日付になる。
    # 実際に次に走る時刻は TaskInfo 側にしか無い。
    $nextRun = (Get-ScheduledTaskInfo -TaskName $TaskName).NextRunTime
    Write-Host "$label scheduled task: $TaskName"
    Write-Host "  Schedule : Weekly on $DaysOfWeek at $Time"
    Write-Host "  Script   : $DrillBat"
    Write-Host "  Log      : $LogFile"
    Write-Host "  Next run : $nextRun"
}
