@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

cd /d "%~dp0"

:: ──────────────────────────────────────────────────────────────
:: ヘルプ表示
:: ──────────────────────────────────────────────────────────────
if /i "%~1"=="--help" goto :show_help
if /i "%~1"=="-h" goto :show_help
goto :main

:show_help
echo.
echo ============================================================
echo   Tax Apps - Service Status
echo ============================================================
echo.
echo Usage: status.bat [--help]
echo.
echo Description:
echo   全サービスのコンテナ状態とリソース使用量を表示します。
echo.
echo Output:
echo   Container Status  - 名前、状態、ヘルス、ポート
echo   Resource Usage    - CPU、メモリ、ネットワーク I/O
echo.
echo Options:
echo   --help, -h    Show this help
echo.
pause
exit /b 0

:main
echo.
echo ============================================================
echo   Tax Apps - Service Status
echo ============================================================
echo.

:: サービス数をカウント
for /f %%C in ('docker compose ps -q 2^>nul ^| find /c /v ""') do set "SERVICE_COUNT=%%C"

echo ------------------------------------------------------------
echo   Container Status (%SERVICE_COUNT% services)
echo ------------------------------------------------------------
echo.
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Health}}\t{{.Ports}}"

echo.
echo ------------------------------------------------------------
echo   Resource Usage
echo ------------------------------------------------------------
echo.
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"

echo.
echo ------------------------------------------------------------
echo   Quick Commands
echo ------------------------------------------------------------
echo.
echo   logs.bat [service]     View logs
echo   restart.bat [service]  Restart service
echo   stop.bat               Stop all services
echo.
pause
