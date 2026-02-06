@echo off
chcp 65001 >nul

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║          Tax Apps - Starting Services                      ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

:: Check if .env exists
if not exist ".env" (
    echo [WARNING] .env file not found!
    echo Creating from .env.example...
    if exist ".env.example" (
        copy .env.example .env >nul
        echo Please edit .env file and set POSTGRES_PASSWORD
        echo.
        pause
        exit /b 1
    ) else (
        echo [ERROR] .env.example not found!
        pause
        exit /b 1
    )
)

:: Parse command line arguments
set "BUILD_FLAG="
set "PROD_FLAG="

:parse_args
if "%~1"=="" goto :start_services
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
shift
goto :parse_args

:start_services
echo Starting services...
if defined PROD_FLAG (
    echo [MODE] Production
    docker compose %PROD_FLAG% up -d %BUILD_FLAG%
) else (
    echo [MODE] Development
    docker compose up -d %BUILD_FLAG%
)

if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Failed to start services
    pause
    exit /b 1
)

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║          Services Started Successfully!                    ║
echo ╚════════════════════════════════════════════════════════════╝
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
echo     ITCM:               http://localhost/itcm/
echo     Bank Analyzer:      http://localhost/bank-analyzer/
echo.
echo ════════════════════════════════════════════════════════════
echo.
echo Usage: start.bat [options]
echo   --build, -b    Rebuild containers
echo   --prod, -p     Use production configuration
echo.
pause
