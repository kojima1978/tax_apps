@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

cd /d "%~dp0"

:: Parse command line arguments first for help check
call "%~dp0_parse_args.bat" %*

:: Show help if requested
if defined SHOW_HELP (
    echo.
    echo ============================================================
    echo   Tax Apps - Starting Services
    echo ============================================================
    echo.
    echo Usage: start.bat [options]
    echo.
    echo Options:
    echo   --build, -b    Rebuild containers ^(required after Dockerfile changes^)
    echo   --prod, -p     Use production configuration
    echo   --help, -h     Show this help
    echo.
    echo Example:
    echo   start.bat              Start in development mode
    echo   start.bat --build      Rebuild and start
    echo   start.bat --prod       Start in production mode
    echo.
    pause
    exit /b 0
)

echo.
echo ============================================================
echo   Tax Apps - Starting Services
echo ============================================================
echo.

:: Run preflight checks
call "%~dp0preflight.bat"
if %ERRORLEVEL% neq 0 (
    pause
    exit /b 1
)
echo.

:: Start services
if defined PROD_FLAG (
    echo [MODE] Production
) else (
    echo [MODE] Development
)
echo [INFO] Starting 16 services...
if defined BUILD_FLAG (
    echo [INFO] Build requested - this may take 5-15 minutes on first run
)
echo.

:: Production mode: build in groups to avoid BuildKit resource exhaustion when
:: 14 services try to pnpm install simultaneously. Then start all containers.
:: Development mode: build and start together as before (dev targets are lightweight).
if defined PROD_FLAG (
    echo [INFO] Building images in groups...
    echo.

    echo [1/4] Infrastructure ^(gateway, portal, bank-analyzer^)...
    docker compose %PROD_FLAG% build gateway portal-app bank-analyzer
    if !ERRORLEVEL! neq 0 goto :build_failed

    echo [2/4] Backend services ^(itcm-backend, tax-docs-backend, inheritance-tax-app^)...
    docker compose %PROD_FLAG% build itcm-backend tax-docs-backend inheritance-tax-app
    if !ERRORLEVEL! neq 0 goto :build_failed

    echo [3/4] Frontend group A ^(itcm-frontend, tax-docs-frontend, gift-tax-simulator, gift-tax-docs^)...
    docker compose %PROD_FLAG% build itcm-frontend tax-docs-frontend gift-tax-simulator gift-tax-docs
    if !ERRORLEVEL! neq 0 goto :build_failed

    echo [4/4] Frontend group B ^(inheritance-tax-docs, shares-valuation, medical-stock-valuation, retirement-tax-calc^)...
    docker compose %PROD_FLAG% build inheritance-tax-docs shares-valuation medical-stock-valuation retirement-tax-calc
    if !ERRORLEVEL! neq 0 goto :build_failed

    echo.
    echo [INFO] All images built. Starting containers...
    docker compose %PROD_FLAG% up -d
) else (
    docker compose up -d %BUILD_FLAG%
)

if !ERRORLEVEL! neq 0 (
    echo.
    echo [ERROR] Failed to start services
    pause
    exit /b 1
)

goto :start_success

:build_failed
echo.
echo [ERROR] Build failed
pause
exit /b 1

:start_success
echo.
echo ============================================================
echo   Services Started Successfully!
echo ============================================================
echo.
echo   Main Portal:  http://localhost
echo.
echo   Applications:
echo     Tax Docs:           http://localhost/tax-docs/
echo     Gift Tax Simulator: http://localhost/gift-tax-simulator/
echo       - Real Estate:    http://localhost/gift-tax-simulator/real-estate
echo     Gift Tax Docs:      http://localhost/gift-tax-docs/
echo     Inheritance Docs:   http://localhost/inheritance-tax-docs/
echo     Inheritance Calc:   http://localhost/inheritance-tax-app/
echo     Medical Stock:      http://localhost/medical/
echo     Shares Valuation:   http://localhost/shares/
echo     Retirement Tax:     http://localhost/retirement-tax-calc/
echo     ITCM:               http://localhost/itcm/
echo     Bank Analyzer:      http://localhost/bank-analyzer/
echo.
echo   Commands:
echo     status.bat           Check service status
echo     logs.bat [service]   View logs
echo     stop.bat             Stop all services
echo.
pause
