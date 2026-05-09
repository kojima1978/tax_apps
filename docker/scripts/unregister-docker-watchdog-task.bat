@echo off
:: =============================================
:: Tax Apps - Docker Watchdog Task Uninstaller
:: =============================================
:: Double-click to unregister the Docker watchdog
:: scheduled task. Triggers UAC for elevation.
:: =============================================

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Requesting administrator privileges...
    powershell -NoProfile -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0register-docker-watchdog-task.ps1" -Unregister

echo.
pause
