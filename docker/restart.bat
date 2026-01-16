@echo off
echo ========================================
echo   Portal Launcher - Restarting Services
echo ========================================
echo.

cd /d "%~dp0"

echo Stopping services...
docker compose down

echo.
echo Starting services...
docker compose up -d --build

echo.
echo ========================================
echo   Services Restarted!
echo ========================================
echo.
echo Portal:              http://localhost:3000
echo.
pause
