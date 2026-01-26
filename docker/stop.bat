@echo off
chcp 65001 >nul

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║          Tax Apps - Stopping Services                      ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

:: Parse command line arguments
set "VOLUME_FLAG="

:parse_args
if "%~1"=="" goto :stop_services
if /i "%~1"=="--volumes" set "VOLUME_FLAG=-v"
if /i "%~1"=="-v" set "VOLUME_FLAG=-v"
shift
goto :parse_args

:stop_services
echo Stopping all services...

if defined VOLUME_FLAG (
    echo [WARNING] Removing volumes as well!
    docker compose down -v
) else (
    docker compose down
)

if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Failed to stop services
    pause
    exit /b 1
)

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║          All Services Stopped                              ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo Usage: stop.bat [options]
echo   --volumes, -v    Also remove volumes (data will be lost!)
echo.
pause
