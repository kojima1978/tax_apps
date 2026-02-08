@echo off
chcp 65001 >nul

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║          Tax Apps - View Logs                              ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

:: Parse command line arguments
call _parse_args.bat %*

:: Show logs
if defined SERVICE (
    echo Showing logs for: %SERVICE%
) else (
    echo Showing logs for all services
)
if defined FOLLOW echo Press Ctrl+C to stop
echo.
docker compose logs %FOLLOW% --tail=%LINES% %SERVICE%

echo.
pause
