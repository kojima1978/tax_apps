[CmdletBinding()]
param(
    [ValidateRange(1024, 65535)]
    [int]$Port = 8765,
    [switch]$SelfTest
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = [IO.Path]::GetFullPath((Join-Path $ScriptDir "..\.."))
$ConfigDir = Join-Path $env:USERPROFILE ".tax-apps"
$SettingsPath = Join-Path $ConfigDir "backup-settings.env"
$ExternalPath = Join-Path $ConfigDir "backup-external-dest"
$BackupDir = Join-Path $ProjectRoot "docker\backups"
$LastRunDir = Join-Path $ProjectRoot "docker\logs\last-run"
$ManageBat = Join-Path $ScriptDir "manage.bat"
$ManualLog = Join-Path $ProjectRoot "docker\logs\manual-backup.log"
$JobPath = Join-Path $ProjectRoot "docker\logs\manual-backup-job.json"
$Utf8NoBom = New-Object Text.UTF8Encoding($false)
$RestoreJobPath = Join-Path $ProjectRoot 'docker\logs\portal-restore-job.json'

function Get-RestoreSources {
    $sources = @(
        [ordered]@{ id = 'local'; label = 'Local backups'; path = $BackupDir }
        [ordered]@{ id = 'latest'; label = 'Latest copy'; path = [IO.Path]::GetFullPath((Join-Path $ProjectRoot '..\tax_apps_backup_latest\all-apps')) }
    )
    $external = Get-ExternalSettings
    if ($external.enabled) { $sources += [ordered]@{ id = 'external'; label = 'External copy'; path = $external.path } }
    foreach ($drive in [IO.DriveInfo]::GetDrives()) {
        if ($drive.IsReady) {
            $folder = Join-Path $drive.RootDirectory.FullName 'tax-apps-backup'
            if ((Test-Path -LiteralPath $folder) -and $folder -ine $external.path) {
                $sources += [ordered]@{ id = ('drive-' + $drive.Name.Substring(0,1)); label = ('Drive ' + $drive.Name); path = $folder }
            }
        }
    }
    return $sources
}

function Get-RestoreTargets {
    # Read the same target arrays used by backup.sh, so new DB apps follow it.
    $source = [IO.File]::ReadAllText((Join-Path $ScriptDir 'backup.sh'), $Utf8NoBom)
    $ids = @()
    foreach ($name in @('PG_TARGETS', 'SQLITE_TARGETS')) {
        $block = [regex]::Match($source, ('(?ms)^' + $name + '=\(\s*(.*?)^\)')).Groups[1].Value
        foreach ($match in [regex]::Matches($block, '(?m)^\s*"([^"\r\n]+)"')) {
            $ids += ($match.Groups[1].Value -split ':')[-1]
        }
    }
    return @($ids | Select-Object -Unique)
}

function Get-RestoreCatalog {
    $items = @()
    foreach ($source in Get-RestoreSources) {
        $archives = @()
        $available = Test-Path -LiteralPath $source.path -PathType Container
        if ($available) {
            $archives = @(Get-ChildItem -LiteralPath $source.path -File -Filter '*.tar.gz.enc' |
                Where-Object { $_.Name -match '^(pre-restore_)?\d{4}-\d{2}-\d{2}_\d{6}\.tar\.gz\.enc$' } |
                Sort-Object LastWriteTime -Descending | ForEach-Object {
                    [ordered]@{ name = $_.Name; sizeBytes = $_.Length; modifiedAt = $_.LastWriteTime.ToString('o') }
                })
        }
        $items += [ordered]@{ id = $source.id; label = $source.label; available = $available; archives = $archives }
    }
    return [ordered]@{ sources = $items; targets = @(Get-RestoreTargets) }
}

function Get-RestoreJob {
    if (-not (Test-Path -LiteralPath $RestoreJobPath)) { return $null }
    $job = [IO.File]::ReadAllText($RestoreJobPath, $Utf8NoBom) | ConvertFrom-Json
    if ($job.status -eq 'running') {
        $process = Get-Process -Id ([int]$job.pid) -ErrorAction SilentlyContinue
        if (-not $process -or [Math]::Abs((([DateTimeOffset]$process.StartTime) - [DateTimeOffset]::Parse($job.startedAt)).TotalSeconds) -gt 10) {
            $job.status = 'failed'
        }
    }
    $log = if (Test-Path -LiteralPath $job.logPath) { [IO.File]::ReadAllText($job.logPath, $Utf8NoBom) } else { '' }
    return [ordered]@{
        id = $job.id; mode = $job.mode; status = $job.status; target = $job.target
        archive = $job.archive; sourceId = $job.sourceId; startedAt = $job.startedAt
        log = if ($log.Length -gt 100000) { $log.Substring($log.Length - 100000) } else { $log }
    }
}

function Start-RestoreJob {
    param($Body, [string]$Mode)
    $previous = Get-RestoreJob
    if ($previous -and $previous.status -eq 'running') { throw 'Another restore operation is running.' }
    if ((Get-ManualJob).running) { throw 'A backup is running. Wait for it to complete.' }
    $source = @(Get-RestoreSources | Where-Object { $_.id -ceq [string]$Body.sourceId })
    if ($source.Count -ne 1) { throw 'Select a valid backup source.' }
    $target = [string]$Body.target
    if ($target -ne '--all' -and $target -cnotin @(Get-RestoreTargets)) { throw 'Select a valid restore target.' }
    $archive = [string]$Body.archive
    if ($archive -cnotmatch '^(pre-restore_)?\d{4}-\d{2}-\d{2}_\d{6}\.tar\.gz\.enc$') { throw 'Invalid backup name.' }
    $archivePath = Join-Path $source[0].path $archive
    if (-not (Test-Path -LiteralPath $archivePath -PathType Leaf)) { throw 'Backup was not found. Reconnect the drive and refresh.' }
    if (-not (Test-Path -LiteralPath (Join-Path $ConfigDir 'backup.key'))) { throw 'Backup key is missing.' }
    $hash = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash
    if ($Mode -eq 'restore') {
        if ([string]$Body.confirmation -cne 'RESTORE') { throw 'Explicit restore confirmation is required.' }
        if (-not $previous -or $previous.id -cne [string]$Body.previewId -or $previous.mode -ne 'preview' -or $previous.status -ne 'ok') { throw 'Run a successful preview first.' }
        $record = [IO.File]::ReadAllText($RestoreJobPath, $Utf8NoBom) | ConvertFrom-Json
        if ($record.archive -cne $archive -or $record.target -cne $target -or $record.sourceId -cne $Body.sourceId -or $record.hash -cne $hash -or ((Get-Date) - [DateTime]::Parse($record.startedAt)).TotalMinutes -gt 15) { throw 'The selection changed or preview expired. Run preview again.' }
    }
    $id = [Guid]::NewGuid().ToString('N')
    $job = [ordered]@{
        id = $id; mode = $Mode; status = 'running'; target = $target; archive = $archive
        sourceId = $Body.sourceId; sourcePath = $source[0].path; hash = $hash
        logPath = (Join-Path $ProjectRoot 'docker\logs\portal-restore.log')
        startedAt = (Get-Date).ToString('o'); finishedAt = $null; exitCode = $null; pid = 0
    }
    Write-Utf8Atomic -Path $job.logPath -Content ''
    Write-Utf8Atomic -Path $RestoreJobPath -Content ($job | ConvertTo-Json)
    $worker = Join-Path $ScriptDir 'restore-settings-worker.ps1'
    $process = Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$worker`"", '-JobPath', "`"$RestoreJobPath`"") -WindowStyle Hidden -PassThru
    $job.pid = $process.Id
    Write-Utf8Atomic -Path $RestoreJobPath -Content ($job | ConvertTo-Json)
    return [ordered]@{ accepted = $true; id = $id }
}

function Write-Utf8Atomic {
    param([string]$Path, [string]$Content)

    $parent = Split-Path -Parent $Path
    [IO.Directory]::CreateDirectory($parent) | Out-Null
    $temp = "$Path.tmp.$PID"
    [IO.File]::WriteAllText($temp, $Content, $Utf8NoBom)
    Move-Item -LiteralPath $temp -Destination $Path -Force
}

function Read-KeyValueFile {
    param([string]$Path)

    $result = @{}
    if (-not (Test-Path -LiteralPath $Path)) { return $result }
    foreach ($line in [IO.File]::ReadAllLines($Path, $Utf8NoBom)) {
        if ($line -match '^([^#=]+)=(.*)$') {
            $result[$Matches[1].Trim()] = $Matches[2].Trim()
        }
    }
    return $result
}

function Get-BackupSettings {
    $values = Read-KeyValueFile -Path $SettingsPath
    return [ordered]@{
        automaticEnabled = if ($values.ContainsKey('TAX_APPS_AUTOMATIC_BACKUP_ENABLED')) { $values['TAX_APPS_AUTOMATIC_BACKUP_ENABLED'] -ne '0' } else { $true }
        intervalHours = if ($values.ContainsKey('TAX_APPS_DUE_BACKUP_HOURS')) { [int]$values['TAX_APPS_DUE_BACKUP_HOURS'] } else { 20 }
        dailyRetention = if ($values.ContainsKey('FULL_BACKUP_RETENTION_DAYS')) { [int]$values['FULL_BACKUP_RETENTION_DAYS'] } else { 7 }
        weeklyRetention = if ($values.ContainsKey('WEEKLY_BACKUP_RETENTION_WEEKS')) { [int]$values['WEEKLY_BACKUP_RETENTION_WEEKS'] } else { 4 }
        monthlyRetention = if ($values.ContainsKey('MONTHLY_BACKUP_RETENTION_MONTHS')) { [int]$values['MONTHLY_BACKUP_RETENTION_MONTHS'] } else { 6 }
    }
}

function Convert-ToMsysPath {
    param([string]$Path)

    $full = [IO.Path]::GetFullPath($Path)
    if ($full -match '^([A-Za-z]):\\(.*)$') {
        $drive = $Matches[1].ToLowerInvariant()
        return "/$drive/$($Matches[2] -replace '\\', '/')"
    }
    if ($full.StartsWith('\\')) {
        return '//' + $full.Substring(2).Replace('\', '/')
    }
    throw "External destination must be a drive or UNC path."
}

function Convert-FromMsysPath {
    param([string]$Path)

    if ($Path -match '^/([A-Za-z])/(.*)$') {
        return "$($Matches[1].ToUpperInvariant()):\$($Matches[2] -replace '/', '\')"
    }
    if ($Path.StartsWith('//')) {
        return '\\' + $Path.Substring(2).Replace('/', '\')
    }
    return $Path
}

function Get-ExternalSettings {
    $raw = $null
    if (Test-Path -LiteralPath $ExternalPath) {
        $raw = [IO.File]::ReadAllLines($ExternalPath, $Utf8NoBom) |
            Where-Object { $_ -and -not $_.TrimStart().StartsWith('#') } |
            Select-Object -First 1
    }
    $displayPath = if ($raw) { Convert-FromMsysPath -Path $raw.Trim() } else { '' }
    return [ordered]@{
        enabled = -not [string]::IsNullOrWhiteSpace($raw)
        path = $displayPath
        available = if ($displayPath) { Test-Path -LiteralPath $displayPath } else { $false }
    }
}

function Set-ExternalSettings {
    param([bool]$Enabled, [string]$Path)

    [IO.Directory]::CreateDirectory($ConfigDir) | Out-Null
    if (-not $Enabled) {
        if (Test-Path -LiteralPath $ExternalPath) {
            Move-Item -LiteralPath $ExternalPath -Destination "$ExternalPath.off" -Force
        }
        return
    }
    if ([string]::IsNullOrWhiteSpace($Path)) {
        throw "External destination is required when external copy is enabled."
    }

    $full = [IO.Path]::GetFullPath($Path.Trim())
    if (-not ($full -match '^[A-Za-z]:\\' -or $full.StartsWith('\\'))) {
        throw "External destination must be an absolute drive or UNC path."
    }
    $current = Get-ExternalSettings
    if (-not (Test-Path -LiteralPath $full) -and $current.enabled -and $current.path -ieq $full) {
        # A removable destination is commonly disconnected. Preserve the known,
        # marker-backed setting while still allowing the other settings to save.
        return
    }
    [IO.Directory]::CreateDirectory($full) | Out-Null

    $markerPath = Join-Path $full ".tax-apps-backup-id"
    $id = if (Test-Path -LiteralPath $markerPath) {
        [IO.File]::ReadAllText($markerPath, $Utf8NoBom).Trim()
    } else {
        [Guid]::NewGuid().ToString('N')
    }
    if ($id -notmatch '^[a-fA-F0-9-]{16,64}$') {
        $id = [Guid]::NewGuid().ToString('N')
    }
    Write-Utf8Atomic -Path $markerPath -Content ($id + "`n")
    $msysPath = Convert-ToMsysPath -Path $full
    Write-Utf8Atomic -Path $ExternalPath -Content ($msysPath + "`n# id: $id`n")
}

function Save-BackupSettings {
    param($Body)

    $interval = [int]$Body.intervalHours
    $daily = [int]$Body.dailyRetention
    $weekly = [int]$Body.weeklyRetention
    $monthly = [int]$Body.monthlyRetention
    if ($interval -lt 4 -or $interval -gt 168) { throw "Backup interval must be between 4 and 168 hours." }
    if ($daily -lt 1 -or $daily -gt 30) { throw "Daily retention must be between 1 and 30." }
    if ($weekly -lt 0 -or $weekly -gt 12) { throw "Weekly retention must be between 0 and 12." }
    if ($monthly -lt 0 -or $monthly -gt 24) { throw "Monthly retention must be between 0 and 24." }

    $automatic = if ([bool]$Body.automaticEnabled) { '1' } else { '0' }
    $content = @(
        "TAX_APPS_AUTOMATIC_BACKUP_ENABLED=$automatic"
        "TAX_APPS_DUE_BACKUP_HOURS=$interval"
        "FULL_BACKUP_RETENTION_DAYS=$daily"
        "WEEKLY_BACKUP_RETENTION_WEEKS=$weekly"
        "MONTHLY_BACKUP_RETENTION_MONTHS=$monthly"
        ''
    ) -join "`n"
    $external = $Body.external
    if ($null -ne $external) {
        Set-ExternalSettings -Enabled ([bool]$external.enabled) -Path ([string]$external.path)
    }
    Write-Utf8Atomic -Path $SettingsPath -Content $content
}

function Get-LastRun {
    param([string]$Name)

    $path = Join-Path $LastRunDir $Name
    if (-not (Test-Path -LiteralPath $path)) { return $null }
    $values = Read-KeyValueFile -Path $path
    return [ordered]@{
        status = if ($values.ContainsKey('status')) { $values['status'] } else { 'unknown' }
        at = if ($values.ContainsKey('at')) { $values['at'] } else { $null }
        epoch = if ($values.ContainsKey('epoch')) { [long]$values['epoch'] } else { $null }
        detail = if ($values.ContainsKey('detail')) { $values['detail'] } else { '' }
    }
}

function Get-ManualJob {
    if (-not (Test-Path -LiteralPath $JobPath)) { return [ordered]@{ running = $false } }
    try {
        $job = [IO.File]::ReadAllText($JobPath, $Utf8NoBom) | ConvertFrom-Json
        $process = Get-Process -Id ([int]$job.pid) -ErrorAction SilentlyContinue
        $startedAt = [DateTimeOffset]::Parse([string]$job.startedAt)
        $sameProcess = $null -ne $process -and [Math]::Abs((([DateTimeOffset]$process.StartTime) - $startedAt).TotalSeconds) -lt 5
        if (-not $sameProcess) { Remove-Item -LiteralPath $JobPath -Force -ErrorAction SilentlyContinue }
        return [ordered]@{ running = $sameProcess; pid = $job.pid; startedAt = $job.startedAt }
    } catch {
        Remove-Item -LiteralPath $JobPath -Force -ErrorAction SilentlyContinue
        return [ordered]@{ running = $false }
    }
}

function Get-StatusPayload {
    $settings = Get-BackupSettings
    $external = Get-ExternalSettings
    $archives = @()
    if (Test-Path -LiteralPath $BackupDir) {
        $archives = @(Get-ChildItem -LiteralPath $BackupDir -Filter '*.tar.gz.enc' -File |
            Sort-Object LastWriteTime -Descending |
            Select-Object -First 8 |
            ForEach-Object {
                [ordered]@{
                    name = $_.Name
                    sizeBytes = $_.Length
                    modifiedAt = $_.LastWriteTime.ToString('o')
                }
            })
    }
    $lastBackup = Get-LastRun -Name 'backup'
    $nextDueEpoch = $null
    if ($settings.automaticEnabled -and $null -ne $lastBackup -and $null -ne $lastBackup.epoch) {
        $nextDueEpoch = [long]$lastBackup.epoch + ([long]$settings.intervalHours * 3600)
    }

    return [ordered]@{
        apiVersion = 1
        settings = $settings
        external = $external
        lastBackup = $lastBackup
        lastExternalCopy = Get-LastRun -Name 'backup-external'
        lastDrill = Get-LastRun -Name 'drill'
        watchdog = Get-LastRun -Name 'watchdog'
        nextDueEpoch = $nextDueEpoch
        keyPresent = Test-Path -LiteralPath (Join-Path $ConfigDir 'backup.key')
        archives = $archives
        manualJob = Get-ManualJob
    }
}

function Start-ManualBackup {
    $restore = Get-RestoreJob
    if ($restore -and $restore.status -eq 'running') { throw 'A restore operation is running.' }
    $job = Get-ManualJob
    if ($job.running) { throw "A manual backup is already running." }
    if (-not (Test-Path -LiteralPath $ManageBat)) { throw "manage.bat was not found." }

    [IO.Directory]::CreateDirectory((Split-Path -Parent $ManualLog)) | Out-Null
    $psi = New-Object Diagnostics.ProcessStartInfo
    $psi.FileName = $env:ComSpec
    $psi.Arguments = "/d /s /c `"`"$ManageBat`" backup >> `"$ManualLog`" 2>&1`""
    $psi.WorkingDirectory = $ScriptDir
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $psi.EnvironmentVariables['TAX_APPS_NO_PAUSE'] = '1'
    $process = [Diagnostics.Process]::Start($psi)
    $record = [ordered]@{ pid = $process.Id; startedAt = (Get-Date).ToString('o') } | ConvertTo-Json -Compress
    Write-Utf8Atomic -Path $JobPath -Content $record
    return [ordered]@{ accepted = $true; pid = $process.Id }
}

function Find-HeaderEnd {
    param([byte[]]$Bytes, [int]$Length)
    for ($i = 0; $i -le $Length - 4; $i++) {
        if ($Bytes[$i] -eq 13 -and $Bytes[$i + 1] -eq 10 -and $Bytes[$i + 2] -eq 13 -and $Bytes[$i + 3] -eq 10) {
            return $i
        }
    }
    return -1
}

function Read-Request {
    param([Net.Sockets.NetworkStream]$Stream)

    $memory = New-Object IO.MemoryStream
    $buffer = New-Object byte[] 8192
    $headerEnd = -1
    $contentLength = 0
    while ($memory.Length -lt 1048576) {
        $read = $Stream.Read($buffer, 0, $buffer.Length)
        if ($read -le 0) { break }
        $memory.Write($buffer, 0, $read)
        $bytes = $memory.ToArray()
        if ($headerEnd -lt 0) {
            $headerEnd = Find-HeaderEnd -Bytes $bytes -Length $bytes.Length
            if ($headerEnd -ge 0) {
                $headerText = [Text.Encoding]::ASCII.GetString($bytes, 0, $headerEnd)
                if ($headerText -match '(?im)^Content-Length:\s*(\d+)\s*$') { $contentLength = [int]$Matches[1] }
            }
        }
        if ($headerEnd -ge 0 -and $memory.Length -ge ($headerEnd + 4 + $contentLength)) { break }
    }
    if ($headerEnd -lt 0) { throw "Invalid HTTP request." }

    $allBytes = $memory.ToArray()
    $headerText = [Text.Encoding]::ASCII.GetString($allBytes, 0, $headerEnd)
    $lines = $headerText -split "`r`n"
    if ($lines[0] -notmatch '^(GET|PUT|POST|OPTIONS)\s+([^\s]+)\s+HTTP/') { throw "Unsupported HTTP request." }
    $method = $Matches[1]
    $path = $Matches[2]
    $headers = @{}
    foreach ($line in $lines | Select-Object -Skip 1) {
        $separator = $line.IndexOf(':')
        if ($separator -gt 0) { $headers[$line.Substring(0, $separator).Trim().ToLowerInvariant()] = $line.Substring($separator + 1).Trim() }
    }
    $body = if ($contentLength -gt 0) { $Utf8NoBom.GetString($allBytes, $headerEnd + 4, $contentLength) } else { '' }
    return [ordered]@{ method = $method; path = $path; headers = $headers; body = $body }
}

function Send-Response {
    param([Net.Sockets.NetworkStream]$Stream, [int]$Status, $Payload, [string]$Origin)

    $reason = switch ($Status) { 200 { 'OK' } 202 { 'Accepted' } 204 { 'No Content' } 400 { 'Bad Request' } 403 { 'Forbidden' } 404 { 'Not Found' } 409 { 'Conflict' } default { 'Internal Server Error' } }
    $body = if ($Status -eq 204) { '' } else { $Payload | ConvertTo-Json -Depth 8 -Compress }
    $bodyBytes = $Utf8NoBom.GetBytes($body)
    $cors = if ($Origin) { "Access-Control-Allow-Origin: $Origin`r`nVary: Origin`r`n" } else { '' }
    $head = "HTTP/1.1 $Status $reason`r`nContent-Type: application/json; charset=utf-8`r`nContent-Length: $($bodyBytes.Length)`r`n${cors}Access-Control-Allow-Methods: GET, PUT, POST, OPTIONS`r`nAccess-Control-Allow-Headers: Content-Type`r`nCache-Control: no-store`r`nConnection: close`r`n`r`n"
    $headBytes = [Text.Encoding]::ASCII.GetBytes($head)
    $Stream.Write($headBytes, 0, $headBytes.Length)
    if ($bodyBytes.Length -gt 0) { $Stream.Write($bodyBytes, 0, $bodyBytes.Length) }
    $Stream.Flush()
}

function Test-AllowedOrigin {
    param([string]$Origin)
    return $Origin -match '^http://(localhost|127\.0\.0\.1)(:\d+)?$'
}

if ($SelfTest) {
    if ((Convert-FromMsysPath '/e/tax-apps-backup') -ne 'E:\tax-apps-backup') { throw 'Path conversion self-test failed.' }
    if ((Convert-ToMsysPath 'E:\tax-apps-backup') -ne '/e/tax-apps-backup') { throw 'Path conversion self-test failed.' }
    $test = Get-BackupSettings
    if ($test.intervalHours -lt 4) { throw 'Settings self-test failed.' }
    Write-Output 'backup-settings-api self-test: ok'
    exit 0
}

$listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, $Port)
$listener.Start()
try {
    while ($true) {
        $client = $listener.AcceptTcpClient()
        $origin = ''
        try {
            $stream = $client.GetStream()
            $request = Read-Request -Stream $stream
            $origin = if ($request.headers.ContainsKey('origin')) { [string]$request.headers['origin'] } else { '' }
            if ($origin -and -not (Test-AllowedOrigin -Origin $origin)) {
                Send-Response -Stream $stream -Status 403 -Payload @{ error = 'Origin is not allowed.' } -Origin ''
                continue
            }
            if ($request.method -eq 'OPTIONS') {
                Send-Response -Stream $stream -Status 204 -Payload @{} -Origin $origin
            } elseif ($request.method -eq 'GET' -and $request.path -eq '/api/status') {
                Send-Response -Stream $stream -Status 200 -Payload (Get-StatusPayload) -Origin $origin
            } elseif ($request.method -eq 'GET' -and $request.path -eq '/api/restore/catalog') {
                Send-Response -Stream $stream -Status 200 -Payload (Get-RestoreCatalog) -Origin $origin
            } elseif ($request.method -eq 'GET' -and $request.path -eq '/api/restore/job') {
                Send-Response -Stream $stream -Status 200 -Payload @{ job = (Get-RestoreJob); lastRestore = (Get-LastRun -Name 'restore') } -Origin $origin
            } elseif ($request.method -eq 'POST' -and $request.path -in @('/api/restore/preview', '/api/restore/execute')) {
                if (-not $origin -or $request.headers['host'] -notmatch '^(127\.0\.0\.1|localhost):\d+$') { throw 'Local browser origin is required.' }
                if ($request.headers['content-type'] -notmatch '^application/json') { throw 'Content-Type must be application/json.' }
                $mode = if ($request.path.EndsWith('/preview')) { 'preview' } else { 'restore' }
                Send-Response -Stream $stream -Status 202 -Payload (Start-RestoreJob -Body ($request.body | ConvertFrom-Json) -Mode $mode) -Origin $origin
            } elseif ($request.method -eq 'PUT' -and $request.path -eq '/api/settings') {
                if ($request.headers['content-type'] -notmatch '^application/json') { throw 'Content-Type must be application/json.' }
                $body = $request.body | ConvertFrom-Json
                Save-BackupSettings -Body $body
                Send-Response -Stream $stream -Status 200 -Payload (Get-StatusPayload) -Origin $origin
            } elseif ($request.method -eq 'POST' -and $request.path -eq '/api/backup') {
                try {
                    Send-Response -Stream $stream -Status 202 -Payload (Start-ManualBackup) -Origin $origin
                } catch {
                    if ($_.Exception.Message -like '*already running*') {
                        Send-Response -Stream $stream -Status 409 -Payload @{ error = $_.Exception.Message } -Origin $origin
                    } else { throw }
                }
            } else {
                Send-Response -Stream $stream -Status 404 -Payload @{ error = 'Not found.' } -Origin $origin
            }
        } catch {
            try { Send-Response -Stream $client.GetStream() -Status 400 -Payload @{ error = $_.Exception.Message } -Origin $origin } catch {}
        } finally {
            $client.Close()
        }
    }
} finally {
    $listener.Stop()
}
