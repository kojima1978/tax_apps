@echo off
:: ============================================
:: Tax Apps - Weekly Restore Drill Task Installer
:: ============================================
:: Double-click to register the weekly restore drill
:: for the current user.
:: ============================================

cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0register-restore-drill-task.ps1"

echo.
pause
