@echo off
:: =============================================
:: Tax Apps - Weekly Restore Drill Task Uninstaller
:: =============================================
:: Double-click to unregister the weekly restore
:: drill scheduled task.
:: =============================================

cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0register-restore-drill-task.ps1" -Unregister

echo.
pause
