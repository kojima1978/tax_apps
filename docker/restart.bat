@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo.
echo ============================================================
echo   Tax Apps - Restarting Services
echo ============================================================
echo.

:: Parse command line arguments
call "%~dp0_parse_args.bat" %*

:: Show help if requested
if defined SHOW_HELP (
    echo Usage: restart.bat [options] [service]
    echo.
    echo Options:
    echo   --build, -b    Rebuild containers
    echo   --prod, -p     Use production configuration
    echo   --help, -h     Show this help
    echo.
    echo Services:
    echo   gateway, portal-app, medical-stock-valuation, shares-valuation
    echo   itcm-postgres, itcm-backend, itcm-frontend
    echo   bank-analyzer-db, bank-analyzer
    echo   inheritance-tax-app, gift-tax-simulator, gift-tax-docs
    echo   inheritance-tax-docs, retirement-tax-calc
    echo   tax-docs-backend, tax-docs-frontend
    echo.
    echo Example:
    echo   restart.bat                            Restart all services
    echo   restart.bat --build                    Restart all with rebuild
    echo   restart.bat bank-analyzer              Restart single service
    echo   restart.bat --build bank-analyzer      Rebuild and restart
    echo.
    pause
    exit /b 0
)

:: Restart services
if defined PROD_FLAG (
    echo [MODE] Production
) else (
    echo [MODE] Development
)

if defined SERVICE (
    echo [INFO] Restarting service: %SERVICE%
    echo.
    if defined BUILD_FLAG (
        :: docker compose restart does not support --build, use up instead
        docker compose %PROD_FLAG% up -d --build %SERVICE%
    ) else (
        docker compose %PROD_FLAG% restart %SERVICE%
    )
) else (
    echo [INFO] Restarting all 16 services...
    echo.
    docker compose %PROD_FLAG% down
    echo.
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
echo   Status:       status.bat
echo.
pause
