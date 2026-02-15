@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo.
echo ============================================================
echo   Tax Apps - View Logs
echo ============================================================
echo.

:: Parse command line arguments
call "%~dp0_parse_args.bat" %*

:: Show help if requested
if defined SHOW_HELP (
    echo Usage: logs.bat [options] [service]
    echo.
    echo Options:
    echo   --no-follow      Don't follow log output ^(default: follow^)
    echo   --tail N, -t N   Show last N lines ^(default: 100^)
    echo   --help, -h       Show this help
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
    echo   logs.bat                        Follow all logs
    echo   logs.bat bank-analyzer          Follow bank-analyzer logs
    echo   logs.bat --tail 50 gateway      Show last 50 lines of gateway
    echo   logs.bat --no-follow            Show logs without following
    echo.
    pause
    exit /b 0
)

:: Show logs
if defined SERVICE (
    echo [INFO] Showing logs for: %SERVICE%
) else (
    echo [INFO] Showing logs for all services
)
echo [INFO] Tail: %LINES% lines
if defined FOLLOW (
    echo [INFO] Press Ctrl+C to stop following
)
echo.
docker compose logs %FOLLOW% --tail=%LINES% %SERVICE%

echo.
pause
