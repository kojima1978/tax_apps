$path = "$PSScriptRoot\fix_manage_bat.ps1"
$content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
[System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
Write-Host "UTF-8 BOM added to fix_manage_bat.ps1"
