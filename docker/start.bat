@echo off
chcp 65001 >nul

echo.
echo ============================================================
echo   Tax Apps - Starting Services
echo ============================================================
echo.

cd /d "%~dp0"

:: Run preflight checks
call preflight.bat
if %ERRORLEVEL% neq 0 (
    pause
    exit /b 1
)
echo.

:: Parse command line arguments
call _parse_args.bat %*

:: Start services
if defined PROD_FLAG (
    echo [MODE] Production
) else (
    echo [MODE] Development
)
echo Starting services...
docker compose %PROD_FLAG% up -d %BUILD_FLAG%

if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Failed to start services
    pause
    exit /b 1
)

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
echo ============================================================
echo.
echo Usage: start.bat [options]
echo   --build, -b    Rebuild containers
echo   --prod, -p     Use production configuration
echo.
pause
