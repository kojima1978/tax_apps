# ============================================
# Show a desktop notification (best effort)
# ============================================
#
# Called from ops-common.sh (ops_show_toast) when an unattended job starts
# failing. Never fails the caller: every path is wrapped, and the script
# always exits 0.
#
# ASCII ONLY. Windows PowerShell 5.1 reads a BOM-less .ps1 as the system
# code page (932 here), so a single non-ASCII character breaks parsing.
# The Japanese wording lives in the Desktop alert file, not here.
#
# Two paths are tried in order:
#   1. WinRT toast - the real notification, stays in the Action Center
#   2. Tray balloon - works even when toasts are blocked by policy
#
# Usage:
#   powershell -NoProfile -ExecutionPolicy Bypass -File notify-failure.ps1 `
#       -Title "Tax Apps" -Message "..."

param(
    [string]$Title = "Tax Apps",
    [string]$Message = "An unattended job needs attention."
)

$ErrorActionPreference = "Stop"

function Escape-Xml {
    param([string]$Text)
    return $Text.Replace('&', '&amp;').Replace('<', '&lt;').Replace('>', '&gt;')
}

function Show-Toast {
    param([string]$Title, [string]$Message)

    # PowerShell's own AppUserModelId. Using a shortcut that already exists
    # avoids having to register one (which would need a Start Menu entry).
    $appId = '{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\WindowsPowerShell\v1.0\powershell.exe'

    [void][Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime]
    [void][Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom, ContentType = WindowsRuntime]

    $xml = @"
<toast scenario="reminder">
  <visual>
    <binding template="ToastGeneric">
      <text>$(Escape-Xml $Title)</text>
      <text>$(Escape-Xml $Message)</text>
    </binding>
  </visual>
</toast>
"@

    $doc = New-Object Windows.Data.Xml.Dom.XmlDocument
    $doc.LoadXml($xml)
    $toast = New-Object Windows.UI.Notifications.ToastNotification $doc
    [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($appId).Show($toast)
}

function Show-Balloon {
    param([string]$Title, [string]$Message)

    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing

    $icon = New-Object System.Windows.Forms.NotifyIcon
    try {
        $icon.Icon = [System.Drawing.SystemIcons]::Warning
        $icon.BalloonTipIcon = [System.Windows.Forms.ToolTipIcon]::Warning
        $icon.BalloonTipTitle = $Title
        $icon.BalloonTipText = $Message
        $icon.Visible = $true
        $icon.ShowBalloonTip(15000)
        # The balloon disappears with the process, so stay alive briefly.
        Start-Sleep -Seconds 12
    } finally {
        $icon.Visible = $false
        $icon.Dispose()
    }
}

try {
    Show-Toast -Title $Title -Message $Message
} catch {
    try {
        Show-Balloon -Title $Title -Message $Message
    } catch {
        # Nothing to do. The Desktop alert file is the reliable channel;
        # the notification is only there to make it noticed sooner.
    }
}

exit 0
