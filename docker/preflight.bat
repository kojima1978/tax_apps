@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

cd /d "%~dp0"

set ERRORS=0
set WARNINGS=0
set OK=0

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║          Tax Apps - Preflight Check                        ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

:: ──────────────────────────────────────────────────────────────
:: 1. Docker Desktop
:: ──────────────────────────────────────────────────────────────
docker info >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Docker Desktop is not running
    echo         Please start Docker Desktop and try again.
    set /a ERRORS+=1
    goto :summary
) else (
    echo [OK]    Docker Desktop is running
    set /a OK+=1
)

:: ──────────────────────────────────────────────────────────────
:: 2. docker compose
:: ──────────────────────────────────────────────────────────────
docker compose version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] docker compose command not available
    echo         Please install Docker Compose V2.
    set /a ERRORS+=1
    goto :summary
) else (
    echo [OK]    docker compose is available
    set /a OK+=1
)

:: ──────────────────────────────────────────────────────────────
:: 3. .env
:: ──────────────────────────────────────────────────────────────
if not exist ".env" (
    if exist ".env.example" (
        copy .env.example .env >nul
        echo [OK]    .env created from .env.example
        set /a OK+=1
        :: Auto-generate secrets for placeholder values
        call :generate_secrets
    ) else (
        echo [ERROR] .env and .env.example not found
        set /a ERRORS+=1
    )
) else (
    echo [OK]    .env file exists
    set /a OK+=1
)

:: Check for remaining placeholder secrets
if exist ".env" (
    findstr /C:"your_secure_password_here" ".env" >nul 2>&1
    if !ERRORLEVEL! equ 0 (
        echo [WARN]  POSTGRES_PASSWORD is still set to placeholder value
        echo         Generating secure password...
        call :replace_secret "your_secure_password_here"
    )
    findstr /C:"dev-secret-key-change-in-production" ".env" >nul 2>&1
    if !ERRORLEVEL! equ 0 (
        echo [WARN]  DJANGO_SECRET_KEY is still set to placeholder value
        echo         Generating secure key...
        call :replace_secret "dev-secret-key-change-in-production"
    )
)

:: ──────────────────────────────────────────────────────────────
:: 4. Dockerfiles and directories
:: ──────────────────────────────────────────────────────────────
set DOCKER_OK=1

for %%F in (
    "..\nginx\Dockerfile"
    "..\apps\portal\app\Dockerfile"
    "..\apps\medical-stock-valuation\Dockerfile"
    "..\apps\shares-valuation\Dockerfile"
    "..\apps\inheritance-case-management\api\Dockerfile"
    "..\apps\inheritance-case-management\web\Dockerfile"
    "..\apps\bank-analyzer-django\Dockerfile"
    "..\apps\inheritance-tax-app\Dockerfile"
    "..\apps\gift-tax-simulator\Dockerfile"
    "..\apps\gift-tax-docs\Dockerfile"
    "..\apps\inheritance-tax-docs\Dockerfile"
    "..\apps\retirement-tax-calc\Dockerfile"
    "..\apps\Required-documents-for-tax-return\backend\Dockerfile"
    "..\apps\Required-documents-for-tax-return\frontend\Dockerfile"
) do (
    if not exist %%F (
        echo [ERROR] Missing: %%~F
        set DOCKER_OK=0
        set /a ERRORS+=1
    )
)

if !DOCKER_OK! equ 1 (
    echo [OK]    All Dockerfiles present ^(14/14^)
    set /a OK+=1
)

:: Nginx config files
set NGINX_OK=1
for %%F in (
    "..\nginx\nginx.conf"
    "..\nginx\default.conf"
    "..\nginx\includes\upstreams.conf"
    "..\nginx\includes\proxy_params.conf"
    "..\nginx\includes\maps.conf"
) do (
    if not exist %%F (
        echo [ERROR] Missing: %%~F
        set NGINX_OK=0
        set /a ERRORS+=1
    )
)

if !NGINX_OK! equ 1 (
    echo [OK]    Nginx config files present
    set /a OK+=1
)

:: ──────────────────────────────────────────────────────────────
:: 4b. Data directories (auto-create if missing)
:: ──────────────────────────────────────────────────────────────
set DATA_CREATED=0

for %%D in (
    "data\postgres"
    "data\tax-docs"
    "data\medical-stock"
    "data\bank-analyzer\data"
    "data\bank-analyzer\db"
) do (
    if not exist "%%~D" (
        mkdir "%%~D" 2>nul
        if exist "%%~D" (
            set /a DATA_CREATED+=1
        ) else (
            echo [ERROR] Failed to create %%~D
            set /a ERRORS+=1
        )
    )
)

if !DATA_CREATED! gtr 0 (
    echo [OK]    Created !DATA_CREATED! missing data directories
    set /a OK+=1
) else (
    echo [OK]    Data directories present
    set /a OK+=1
)

:: ──────────────────────────────────────────────────────────────
:: 5. Port conflicts
:: ──────────────────────────────────────────────────────────────
set PORT_CONFLICT=0
set CHECKED_PORTS=80 3000 3001 3002 3003 3005 3006 3010 3012 3013 3020 3021 3022 5173 8000

for %%P in (%CHECKED_PORTS%) do (
    for /f "tokens=*" %%L in ('powershell -NoProfile -Command "netstat -ano 2>$null | Select-String 'LISTENING' | Where-Object { $_ -match ':%%P\s' }"') do (
        echo [WARN]  Port %%P is already in use
        set PORT_CONFLICT=1
        set /a WARNINGS+=1
    )
)

if !PORT_CONFLICT! equ 0 (
    echo [OK]    No port conflicts detected
    set /a OK+=1
)

:: ──────────────────────────────────────────────────────────────
:: 6. Disk space
:: ──────────────────────────────────────────────────────────────
set "DRIVE=%~d0"
for /f "usebackq delims=" %%R in (`powershell -NoProfile -Command "$d = Get-PSDrive -Name '%DRIVE:~0,1%' -ErrorAction SilentlyContinue; if ($d) { if ($d.Free -lt 5GB) { 'LOW' } else { 'OK' } } else { 'UNKNOWN' }"`) do set "DISK_RESULT=%%R"

if "!DISK_RESULT!"=="LOW" (
    echo [WARN]  Low disk space on %DRIVE% ^(less than 5GB free^)
    set /a WARNINGS+=1
) else if "!DISK_RESULT!"=="OK" (
    echo [OK]    Disk space OK on %DRIVE%
    set /a OK+=1
) else (
    echo [WARN]  Could not determine disk space
    set /a WARNINGS+=1
)

:: ──────────────────────────────────────────────────────────────
:: 7. Summary
:: ──────────────────────────────────────────────────────────────
:summary
echo.
echo ════════════════════════════════════════════════════════════
echo   Results:  OK=%OK%  WARN=%WARNINGS%  ERROR=%ERRORS%
echo ════════════════════════════════════════════════════════════

if %ERRORS% gtr 0 (
    echo.
    echo Errors detected. Please fix them before starting.
    set /p CONTINUE="Continue anyway? (Y/N): "
    if /i not "!CONTINUE!"=="Y" (
        exit /b 1
    )
) else if %WARNINGS% gtr 0 (
    echo.
    echo Warnings detected but no blocking errors.
) else (
    echo.
    echo All checks passed!
)

exit /b 0

:: ──────────────────────────────────────────────────────────────
:: Subroutines
:: ──────────────────────────────────────────────────────────────

:generate_secrets
:: Replace both placeholders in newly created .env
call :replace_secret "your_secure_password_here"
call :replace_secret "dev-secret-key-change-in-production"
echo [OK]    Secure secrets auto-generated in .env
set /a OK+=1
goto :eof

:replace_secret
:: Generate a 44-char random alphanumeric string via PowerShell and replace placeholder in .env
set "PLACEHOLDER=%~1"
powershell -NoProfile -Command "$s = -join ((48..57)+(65..90)+(97..122) | Get-Random -Count 44 | ForEach-Object {[char]$_}); (Get-Content '.env' -Raw).Replace('%PLACEHOLDER%', $s) | Set-Content '.env' -NoNewline"
goto :eof
