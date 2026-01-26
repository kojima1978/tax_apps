@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║          Tax Apps - Restarting Services                    ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

:: Parse command line arguments
set "BUILD_FLAG="
set "PROD_FLAG="
set "SERVICE="

:parse_args
if "%~1"=="" goto :restart_services
if /i "%~1"=="--build" (
    set "BUILD_FLAG=--build"
    shift
    goto :parse_args
)
if /i "%~1"=="-b" (
    set "BUILD_FLAG=--build"
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
:: Treat any other argument as service name
set "SERVICE=%~1"
shift
goto :parse_args

:restart_services
if defined SERVICE (
    echo Restarting service: %SERVICE%
    echo.
    if defined PROD_FLAG (
        docker compose %PROD_FLAG% restart %SERVICE%
    ) else (
        docker compose restart %SERVICE%
    )
) else (
    echo Stopping all services...
    if defined PROD_FLAG (
        docker compose %PROD_FLAG% down
    ) else (
        docker compose down
    )

    echo.
    echo Starting all services...
    if defined PROD_FLAG (
        echo [MODE] Production
        docker compose %PROD_FLAG% up -d %BUILD_FLAG%
    ) else (
        echo [MODE] Development
        docker compose up -d %BUILD_FLAG%
    )
)

if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Failed to restart services
    pause
    exit /b 1
)

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║          Services Restarted Successfully!                  ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo   Main Portal:  http://localhost
echo.
echo ════════════════════════════════════════════════════════════
echo.
echo Usage: restart.bat [options] [service]
echo   --build, -b    Rebuild containers
echo   --prod, -p     Use production configuration
echo   [service]      Restart specific service only
echo.
echo Example:
echo   restart.bat                    Restart all services
echo   restart.bat --build            Restart all with rebuild
echo   restart.bat tax-docs-backend   Restart single service
echo.
pause
