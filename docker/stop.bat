@echo off
echo ========================================
echo   Portal Launcher - Stopping Services
echo ========================================
echo.

cd /d "%~dp0"

echo Stopping all services...
docker compose down

echo.
echo ========================================
echo   All services stopped.
echo ========================================
pause
