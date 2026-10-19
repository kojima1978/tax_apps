param([Parameter(Mandatory = $true)][string]$JobPath)
$ErrorActionPreference = 'Stop'
$utf8 = New-Object Text.UTF8Encoding($false)
$job = [IO.File]::ReadAllText($JobPath, $utf8) | ConvertFrom-Json
for ($attempt = 0; $job.pid -eq 0 -and $attempt -lt 50; $attempt++) {
    Start-Sleep -Milliseconds 100
    $job = [IO.File]::ReadAllText($JobPath, $utf8) | ConvertFrom-Json
}
try {
    $bash = Join-Path $env:ProgramFiles 'Git\bin\bash.exe'
    if (-not (Test-Path -LiteralPath $bash)) { throw 'Git Bash was not found.' }
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $argsForBash = @('--login', (Join-Path $scriptDir 'backup.sh'), 'restore', $job.target, $job.archive, '--from', $job.sourcePath)
    if ($job.mode -eq 'preview') { $argsForBash += '--check' }
    elseif ($job.mode -eq 'restore') { $argsForBash += '--yes' }
    else { throw 'Invalid job mode.' }
    $env:NO_COLOR = '1'
    $OutputEncoding = $utf8
    [Console]::OutputEncoding = $utf8
    # Native stderr contains diagnostic output too; let Bash's exit code decide.
    $ErrorActionPreference = 'Continue'
    & $bash @argsForBash 2>&1 | ForEach-Object {
        [IO.File]::AppendAllText($job.logPath, ([string]$_ + "`n"), $utf8)
    }
    $ErrorActionPreference = 'Stop'
    $job.status = if ($LASTEXITCODE -eq 0) { 'ok' } else { 'failed' }
    $job.exitCode = $LASTEXITCODE
} catch {
    $job.status = 'failed'
    [IO.File]::AppendAllText($job.logPath, ($_.Exception.Message + "`n"), $utf8)
} finally {
    $job.finishedAt = (Get-Date).ToString('o')
    $temp = "$JobPath.tmp"
    [IO.File]::WriteAllText($temp, ($job | ConvertTo-Json -Depth 5), $utf8)
    Move-Item -LiteralPath $temp -Destination $JobPath -Force
}
