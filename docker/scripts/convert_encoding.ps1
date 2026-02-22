param([string]$InputFile, [string]$OutputFile)

$utf8 = [System.Text.Encoding]::UTF8
$sjis = [System.Text.Encoding]::GetEncoding(932)

# Read as UTF-8
$content = [System.IO.File]::ReadAllText($InputFile, $utf8)

# Normalize line endings to CRLF
$content = $content -replace "`r`n", "`n"
$content = $content -replace "`n", "`r`n"

# Write as Shift-JIS
[System.IO.File]::WriteAllText($OutputFile, $content, $sjis)

# Verify
$bytes = [System.IO.File]::ReadAllBytes($OutputFile)
Write-Host "Written $($bytes.Length) bytes to $OutputFile"
Write-Host "First 15 bytes: $($bytes[0..14] -join ',')"
# Check for CRLF
$crlfCount = 0
for ($i = 0; $i -lt $bytes.Length - 1; $i++) {
    if ($bytes[$i] -eq 13 -and $bytes[$i+1] -eq 10) { $crlfCount++ }
}
Write-Host "CRLF count: $crlfCount"
