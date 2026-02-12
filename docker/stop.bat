@echo off
chcp 65001 >nul

echo.
echo ============================================================
echo   Tax Apps - Stopping Services
echo ============================================================
echo.

cd /d "%~dp0"

:: Parse command line arguments
call _parse_args.bat %*

:: Stop services
if defined VOLUME_FLAG (
    echo [WARNING] Removing volumes as well!
)
if defined PROD_FLAG (
    echo [MODE] Production
)
echo Stopping all services...
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
echo Usage: stop.bat [options]
echo   --volumes, -v    Also remove volumes (data will be lost!)
echo   --prod, -p       Stop production configuration
echo.
pause
