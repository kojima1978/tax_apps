@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo.
echo ============================================================
echo   Tax Apps - Stopping Services
echo ============================================================
echo.

:: Parse command line arguments
call "%~dp0_parse_args.bat" %*

:: Show help if requested
if defined SHOW_HELP (
    echo Usage: stop.bat [options]
    echo.
    echo Options:
    echo   --volumes, -v    Also remove Docker volumes
    echo   --prod, -p       Stop production configuration
    echo   --help, -h       Show this help
    echo.
    echo Note: Data in data/ directory is preserved unless --volumes is used.
    echo       Use clean.bat for complete cleanup.
    echo.
    pause
    exit /b 0
)

:: Stop services
if defined VOLUME_FLAG (
    echo [WARNING] Docker volumes will be removed!
    echo          ^(data/ directory is NOT affected^)
)
if defined PROD_FLAG (
    echo [MODE] Production
) else (
    echo [MODE] Development
)
echo [INFO] Stopping all services...
docker compose %PROD_FLAG% down %VOLUME_FLAG%

if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Failed to stop services
    pause
    exit /b 1
)

echo.
echo ============================================================
echo   All Services Stopped
echo ============================================================
echo.
echo   Restart: start.bat
echo   Status:  status.bat
echo.
pause
