@echo off
chcp 65001 >nul

echo.
echo ============================================================
echo   Tax Apps - Restarting Services
echo ============================================================
echo.

cd /d "%~dp0"

:: Parse command line arguments
call "%~dp0_parse_args.bat" %*

:: Restart services
if defined PROD_FLAG (
    echo [MODE] Production
) else (
    echo [MODE] Development
)

if defined SERVICE (
    echo Restarting service: %SERVICE%
    echo.
    if defined BUILD_FLAG (
        :: docker compose restart does not support --build, use up instead
        docker compose %PROD_FLAG% up -d --build %SERVICE%
    ) else (
        docker compose %PROD_FLAG% restart %SERVICE%
    )
) else (
    echo Stopping all services...
    docker compose %PROD_FLAG% down

    echo.
    echo Starting all services...
    docker compose %PROD_FLAG% up -d %BUILD_FLAG%
)

if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Failed to restart services
    pause
    exit /b 1
)

echo.
echo ============================================================
echo   Services Restarted Successfully!
echo ============================================================
echo.
echo   Main Portal:  http://localhost
echo.
echo ============================================================
echo.
echo Usage: restart.bat [options] [service]
echo   --build, -b    Rebuild containers
echo   --prod, -p     Use production configuration
echo   [service]      Restart specific service only
echo.
echo Example:
echo   restart.bat                            Restart all services
echo   restart.bat --build                    Restart all with rebuild
echo   restart.bat tax-docs-backend           Restart single service
echo   restart.bat --build tax-docs-backend   Rebuild and restart single service
echo.
pause
