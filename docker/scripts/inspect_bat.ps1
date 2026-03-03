$sjis = [System.Text.Encoding]::GetEncoding(932)
$bytes = [System.IO.File]::ReadAllBytes("$PSScriptRoot\manage.bat")
$text = $sjis.GetString($bytes)
$text = $text -replace "`r`n", "`n"
$lines = $text -split "`n"

Write-Host "Total lines: $($lines.Count)"
Write-Host ""

# Check key labels exist
$checks = @(':cmd_restart', ':cmd_build', ':cmd_logs', ':require_app_arg', ':init_app_vars', ':format_dir_size', ':ensure_network', ':do_start_app', ':do_stop_app')
foreach ($c in $checks) {
    $found = $false
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -eq $c) { Write-Host "[OK] $c (line $i)"; $found = $true; break }
    }
    if (-not $found) { Write-Host "[MISS] $c" }
}

Write-Host ""
Write-Host "=== APP list ==="
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match '^set "APP_\d+=') { Write-Host $lines[$i] }
}

Write-Host ""
Write-Host "=== cmd_restart ==="
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -eq ':cmd_restart') {
        for ($j = $i; $j -le $i+10; $j++) { Write-Host $lines[$j] }
        break
    }
}

Write-Host ""
Write-Host "=== :require_app_arg ==="
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -eq ':require_app_arg') {
        for ($j = $i; $j -le $i+15; $j++) { Write-Host $lines[$j] }
        break
    }
}
