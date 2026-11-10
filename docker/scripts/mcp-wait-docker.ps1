# ============================================
# MCP サーバーを起こす前に Docker の準備を待つ（mcp-launch.bat から呼ぶ）
# ============================================
#
# Claude デスクトップは PC の起動直後に Docker Desktop より先に立ち上がることがあり、
# 登録コマンドが `docker run` そのものだと、その場で
#   failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine
# で終わって、二度と繋ぎ直さない（2026-11-10 に実際に起きた）。
# ここでは Docker が応答するまで待ち、イメージとネットワークがあることまで確かめる。
#
# **stdout には何も書かない**（stdout は MCP の通信路。呼び出し側も 1>&2 で塞いでいる）。
# 知らせることは stderr に UTF-8 で1行ずつ書く ── Claude デスクトップの MCP ログ
# （%LOCALAPPDATA%\Claude\logs\mcp-server-tax-apps.log）にそのまま残り、人が原因を読める。
#
# 待ち時間の既定は 50 秒。Claude デスクトップは起動直後に initialize を送ってくるので、
# 待っている間もその応答待ちの時計は進んでいる。MCP の SDK の既定のタイムアウト（60 秒）を
# 越えて待つと、こちらの「直し方」が出る前にクライアント側のタイムアウトで終わってしまう。
# 変えるときは環境変数 TAX_APPS_MCP_DOCKER_WAIT（秒）。
#
# 終了コード: 0 準備できた / 1 Docker が応答しない・docker が無い / 2 イメージが無い / 3 ネットワークが無い
#
# 文字コード: 日本語を含むので UTF-8（BOM 付き）。BOM が無いと Windows PowerShell 5.1 で化ける。
# ============================================

param(
  [int]$WaitSeconds = 50,
  [string]$Image = 'tax-apps-mcp',
  [string]$Network = 'tax-apps-network'
)

$ErrorActionPreference = 'Continue'
if ($env:TAX_APPS_MCP_DOCKER_WAIT -match '^\d+$') { $WaitSeconds = [int]$env:TAX_APPS_MCP_DOCKER_WAIT }

$stderr = New-Object System.IO.StreamWriter([Console]::OpenStandardError(), (New-Object System.Text.UTF8Encoding($false)))
$stderr.AutoFlush = $true
function Write-Note([string]$Message) { $stderr.WriteLine("[tax-apps-mcp] $Message") }

$docker = Get-Command docker.exe -ErrorAction SilentlyContinue
if (-not $docker) {
  Write-Note 'docker コマンドが見つかりません。Docker Desktop をインストールしてから Claude デスクトップを開き直してください。'
  exit 1
}

# docker を1回叩いて成否だけ返す。起動途中のエンジンは応答せずに固まることがあるので
# 1回ごとに時間を切る。出力はパイプが詰まらないよう、待つ前から読み始める。
function Test-Docker([string[]]$DockerArgs, [int]$TimeoutMs = 10000) {
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = $docker.Source
  $psi.Arguments = ($DockerArgs | ForEach-Object { '"' + $_ + '"' }) -join ' '
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true
  $psi.RedirectStandardInput = $true
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $process = [System.Diagnostics.Process]::Start($psi)
  $process.StandardInput.Close()
  $null = $process.StandardOutput.ReadToEndAsync()
  $null = $process.StandardError.ReadToEndAsync()
  if (-not $process.WaitForExit($TimeoutMs)) {
    try { $process.Kill() } catch { }
    return $false
  }
  return ($process.ExitCode -eq 0)
}

$deadline = (Get-Date).AddSeconds($WaitSeconds)
$announced = $false
while (-not (Test-Docker @('info', '--format', '{{.ServerVersion}}'))) {
  if ((Get-Date) -ge $deadline) {
    Write-Note "Docker Desktop が起動していません（$WaitSeconds 秒待ちました）。Docker Desktop を起動してから Claude デスクトップを開き直してください。"
    exit 1
  }
  if (-not $announced) {
    Write-Note "Docker の起動を待っています（最長 $WaitSeconds 秒）..."
    $announced = $true
  }
  Start-Sleep -Seconds 2
}
if ($announced) { Write-Note 'Docker が応答しました。MCP サーバーを起動します。' }

if (-not (Test-Docker @('image', 'inspect', '--format', '{{.Id}}', $Image))) {
  Write-Note "イメージ $Image がありません。リポジトリ直下で docker/scripts/setup-mcp.sh を実行してから Claude デスクトップを開き直してください。"
  exit 2
}

if (-not (Test-Docker @('network', 'inspect', '--format', '{{.Id}}', $Network))) {
  Write-Note "ネットワーク $Network がありません。docker/scripts/manage.sh start でアプリを起動してから Claude デスクトップを開き直してください。"
  exit 3
}

exit 0
