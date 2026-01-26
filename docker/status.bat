@echo off
chcp 65001 >nul

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║          Tax Apps - Service Status                         ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

echo ┌────────────────────────────────────────────────────────────┐
echo │ Container Status                                           │
echo └────────────────────────────────────────────────────────────┘
echo.
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

echo.
echo ┌────────────────────────────────────────────────────────────┐
echo │ Resource Usage                                             │
echo └────────────────────────────────────────────────────────────┘
echo.
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"

echo.
echo ┌────────────────────────────────────────────────────────────┐
echo │ Health Status                                              │
echo └────────────────────────────────────────────────────────────┘
echo.
for /f "tokens=*" %%i in ('docker compose ps -q') do (
    for /f "tokens=1,2" %%a in ('docker inspect --format "{{.Name}} {{.State.Health.Status}}" %%i 2^>nul') do (
        echo %%a: %%b
    )
)

echo.
pause
