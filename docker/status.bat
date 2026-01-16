@echo off
echo ========================================
echo   Portal Launcher - Service Status
echo ========================================
echo.

cd /d "%~dp0"

docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo.
pause
