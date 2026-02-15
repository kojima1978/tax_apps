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
echo   Tax Apps - Preflight Check
echo ============================================================
echo.
echo Usage: preflight.bat [--help]
echo.
echo Description:
echo   Tax Apps の起動前環境チェックを行います。
echo   start.bat から自動的に呼び出されますが、単独でも実行可能です。
echo.
echo Checks:
echo   1. Docker Desktop         - 起動確認
echo   2. docker compose         - コマンド確認
echo   3. .env                   - 存在確認、シークレット自動生成
echo   4. Monorepo workspace     - pnpm-workspace.yaml, pnpm-lock.yaml, packages/utils
echo   5. Dockerfiles            - 14 ファイルの存在確認
echo   5b. Nginx config          - 設定ファイルの存在確認
echo   5c. PostgreSQL init       - init-pgvector.sql の存在確認
echo   5d. Data directories      - 自動作成（6 ディレクトリ）
echo   6. Port conflicts         - 15 ポートの競合検出
echo   7. Disk space             - 5GB 以上の空き容量確認
echo.
echo Options:
echo   --help, -h    Show this help
echo.
pause
exit /b 0

:main
set ERRORS=0
set WARNINGS=0
set OK=0

echo.
echo ============================================================
echo   Tax Apps - Preflight Check
echo ============================================================
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
        echo [WARN]  Placeholder passwords detected
        echo         Generating secure passwords...
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
:: 4. Monorepo workspace files (pnpm)
:: ──────────────────────────────────────────────────────────────
set WORKSPACE_OK=1

for %%F in (
    "..\pnpm-workspace.yaml"
    "..\pnpm-lock.yaml"
    "..\package.json"
    "..\.dockerignore"
    "..\packages\utils\package.json"
    "..\packages\utils\tsconfig.json"
) do (
    if not exist %%F (
        echo [ERROR] Missing: %%~F
        set WORKSPACE_OK=0
        set /a ERRORS+=1
    )
)

if !WORKSPACE_OK! equ 1 (
    echo [OK]    Monorepo workspace files present ^(pnpm-workspace.yaml, pnpm-lock.yaml, packages/utils^)
    set /a OK+=1
)

:: ──────────────────────────────────────────────────────────────
:: 5. Dockerfiles and directories
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
    "..\nginx\includes\rate_limit_general.conf"
    "..\nginx\includes\rate_limit_api.conf"
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

:: PostgreSQL init scripts
if not exist "postgres\init-pgvector.sql" (
    echo [WARN]  Missing: postgres\init-pgvector.sql
    set /a WARNINGS+=1
) else (
    echo [OK]    PostgreSQL init scripts present
    set /a OK+=1
)

:: ──────────────────────────────────────────────────────────────
:: 5d. Data directories (auto-create if missing)
:: ──────────────────────────────────────────────────────────────
set DATA_CREATED=0

for %%D in (
    "data\postgres"
    "data\tax-docs"
    "data\medical-stock"
    "data\bank-analyzer\data"
    "data\bank-analyzer\db"
    "data\bank-analyzer\postgres"
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
:: 6. Port conflicts
:: ──────────────────────────────────────────────────────────────
set PORT_CONFLICT=0

:: 全ポートを1回の PowerShell 呼び出しでチェック（15回→1回に最適化）
for /f "tokens=*" %%L in ('powershell -NoProfile -Command "$ports = @(80,3000,3001,3002,3003,3005,3006,3010,3012,3013,3020,3021,3022,5173,8000); $lines = netstat -ano 2>$null; foreach ($p in $ports) { foreach ($l in $lines) { if ($l -match 'LISTENING' -and $l -match \":$p\s\") { Write-Output $p; break } } }"') do (
    echo [WARN]  Port %%L is already in use
    set PORT_CONFLICT=1
    set /a WARNINGS+=1
)

if !PORT_CONFLICT! equ 0 (
    echo [OK]    No port conflicts detected
    set /a OK+=1
)

:: ──────────────────────────────────────────────────────────────
:: 7. Disk space
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
:: 8. Summary
:: ──────────────────────────────────────────────────────────────
:summary
echo.
echo ============================================================
echo   Results:  OK=%OK%  WARN=%WARNINGS%  ERROR=%ERRORS%
echo ============================================================

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
