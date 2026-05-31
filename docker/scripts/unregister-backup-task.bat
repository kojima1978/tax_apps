@echo off
:: =============================================
:: Tax Apps - Daily Backup Task Uninstaller
:: =============================================
:: Double-click to unregister the daily backup
:: scheduled task. Triggers UAC for elevation.
:: =============================================

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Requesting administrator privileges...
    powershell -NoProfile -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0register-backup-task.ps1" -Unregister

echo.
pause
