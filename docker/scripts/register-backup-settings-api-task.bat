@echo off
:: Registers the local-only API used by the portal backup settings screen.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0register-backup-settings-api-task.ps1"
echo.
pause
