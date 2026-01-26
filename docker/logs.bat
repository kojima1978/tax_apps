@echo off
chcp 65001 >nul

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║          Tax Apps - View Logs                              ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

:: Default to following logs
set "FOLLOW=-f"
set "LINES=100"
set "SERVICE="

:parse_args
if "%~1"=="" goto :show_logs
if /i "%~1"=="--no-follow" (
    set "FOLLOW="
    shift
    goto :parse_args
)
if /i "%~1"=="-n" (
    set "FOLLOW="
    shift
    goto :parse_args
)
if /i "%~1"=="--tail" (
    set "LINES=%~2"
    shift
    shift
    goto :parse_args
)
if /i "%~1"=="-t" (
    set "LINES=%~2"
    shift
    shift
    goto :parse_args
)
:: Treat any other argument as service name
set "SERVICE=%~1"
shift
goto :parse_args

:show_logs
if defined SERVICE (
    echo Showing logs for: %SERVICE%
    echo Press Ctrl+C to stop
    echo.
    docker compose logs %FOLLOW% --tail=%LINES% %SERVICE%
) else (
    echo Showing logs for all services
    echo Press Ctrl+C to stop
    echo.
    docker compose logs %FOLLOW% --tail=%LINES%
)

echo.
pause
