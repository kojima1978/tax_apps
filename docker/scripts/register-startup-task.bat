@echo off
:: ============================================
:: Tax Apps - Logon Startup Task Installer
:: ============================================
:: Double-click to register the logon startup task for the current user.
:: No UAC elevation is required (see the .ps1 header for why).
:: ============================================

cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0register-startup-task.ps1"

echo.
pause
