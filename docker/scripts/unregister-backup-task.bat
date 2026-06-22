@echo off
:: =============================================
:: Tax Apps - Daily Backup Task Uninstaller
:: =============================================
:: Double-click to unregister the daily backup
:: scheduled task. Triggers UAC for elevation.
:: =============================================

cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0register-backup-task.ps1" -Unregister

echo.
pause
