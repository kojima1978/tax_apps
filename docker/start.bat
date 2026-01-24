@echo off
echo ========================================
echo   Portal Launcher - Starting Services
echo ========================================
echo.

cd /d "%~dp0"

echo Starting all services...
docker compose up -d

echo.
echo ========================================
echo   Services Started!
echo ========================================
echo.
echo Portal:              http://localhost:3000
echo.
echo Applications:
echo   Medical Stock:     http://localhost:3010
echo   Shares Valuation:  http://localhost:3012
echo   Inheritance Calc:  http://localhost:3013
echo   ITCM:              http://localhost:3020

echo   Bank Analyzer:     http://localhost:8501
echo.
echo ========================================
pause
