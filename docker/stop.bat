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
set "PROD_FLAG="

:parse_args
if "%~1"=="" goto :stop_services
if /i "%~1"=="--volumes" (
    set "VOLUME_FLAG=-v"
    shift
    goto :parse_args
)
if /i "%~1"=="-v" (
    set "VOLUME_FLAG=-v"
    shift
    goto :parse_args
)
if /i "%~1"=="--prod" (
    set "PROD_FLAG=-f docker-compose.yml -f docker-compose.prod.yml"
    shift
    goto :parse_args
)
if /i "%~1"=="-p" (
    set "PROD_FLAG=-f docker-compose.yml -f docker-compose.prod.yml"
    shift
    goto :parse_args
)
shift
goto :parse_args

:stop_services
echo Stopping all services...

if defined VOLUME_FLAG (
    echo [WARNING] Removing volumes as well!
)

if defined PROD_FLAG (
    echo [MODE] Production
    docker compose %PROD_FLAG% down %VOLUME_FLAG%
) else (
    docker compose down %VOLUME_FLAG%
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
echo   --prod, -p       Stop production configuration
echo.
pause
