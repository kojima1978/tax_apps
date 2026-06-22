@echo off
:: ============================================
:: Tax Apps - Daily Backup Task Installer
:: ============================================
:: Double-click to register the daily backup for the current user.
:: ============================================

cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0register-backup-task.ps1"

echo.
pause
