@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║          Tax Apps - Backup                                 ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

:: ──────────────────────────────────────────────────────────────
:: タイムスタンプ付きバックアップフォルダを作成
:: ──────────────────────────────────────────────────────────────
for /f "usebackq delims=" %%A in (`powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd_HHmmss'"`) do set "TIMESTAMP=%%A"
set "BACKUP_DIR=backups\%TIMESTAMP%"

if not exist "data" (
    echo [ERROR] data/ ディレクトリが存在しません。バックアップ対象がありません。
    pause
    exit /b 1
)

echo バックアップ先: %BACKUP_DIR%\
echo.

mkdir "%BACKUP_DIR%" 2>nul

:: ──────────────────────────────────────────────────────────────
:: 1. PostgreSQL (pg_dump)
:: ──────────────────────────────────────────────────────────────
echo [1/3] PostgreSQL ...

docker compose ps --status running 2>nul | findstr "itcm-postgres" >nul 2>&1
if !ERRORLEVEL! equ 0 (
    docker exec itcm-postgres pg_dump -U postgres -d inheritance_tax_db > "%BACKUP_DIR%\postgres.sql" 2>nul
    if !ERRORLEVEL! equ 0 (
        echo [OK]    postgres.sql
    ) else (
        echo [WARN]  pg_dump に失敗しました
    )
) else (
    if exist "data\postgres" (
        echo [WARN]  PostgreSQL コンテナが停止中のためファイルコピーにフォールバック
        robocopy "data\postgres" "%BACKUP_DIR%\postgres" /E /NFL /NDL /NJH /NJS >nul 2>&1
        if !ERRORLEVEL! lss 8 (
            echo [OK]    postgres/ (ファイルコピー)
        ) else (
            echo [ERROR] postgres/ のコピーに失敗しました
        )
    ) else (
        echo [SKIP]  data/postgres/ が存在しません
    )
)

:: ──────────────────────────────────────────────────────────────
:: 2. SQLite データベース (ファイルコピー)
:: ──────────────────────────────────────────────────────────────
echo [2/3] SQLite ...

set SQLITE_COUNT=0
set SQLITE_FAIL=0
for %%D in (
    "tax-docs"
    "medical-stock"
    "bank-analyzer\db"
) do (
    if exist "data\%%~D" (
        mkdir "%BACKUP_DIR%\%%~D" 2>nul
        robocopy "data\%%~D" "%BACKUP_DIR%\%%~D" /E /NFL /NDL /NJH /NJS >nul 2>&1
        if !ERRORLEVEL! lss 8 (
            set /a SQLITE_COUNT+=1
        ) else (
            echo [ERROR] %%~D のコピーに失敗しました
            set /a SQLITE_FAIL+=1
        )
    )
)

if !SQLITE_COUNT! gtr 0 (
    echo [OK]    SQLite !SQLITE_COUNT! directories
)
if !SQLITE_FAIL! gtr 0 (
    echo [WARN]  SQLite !SQLITE_FAIL! directories failed
)
if !SQLITE_COUNT! equ 0 if !SQLITE_FAIL! equ 0 (
    echo [SKIP]  SQLite データなし
)

:: ──────────────────────────────────────────────────────────────
:: 3. アップロードデータ (ファイルコピー)
:: ──────────────────────────────────────────────────────────────
echo [3/3] Upload data ...

if exist "data\bank-analyzer\data" (
    mkdir "%BACKUP_DIR%\bank-analyzer\data" 2>nul
    robocopy "data\bank-analyzer\data" "%BACKUP_DIR%\bank-analyzer\data" /E /NFL /NDL /NJH /NJS >nul 2>&1
    if !ERRORLEVEL! lss 8 (
        echo [OK]    bank-analyzer/data/
    ) else (
        echo [ERROR] bank-analyzer/data/ のコピーに失敗しました
    )
) else (
    echo [SKIP]  data/bank-analyzer/data/ が存在しません
)

:: ──────────────────────────────────────────────────────────────
:: サマリー
:: ──────────────────────────────────────────────────────────────
echo.

:: バックアップサイズを取得（ロケール非依存）
for /f "usebackq delims=" %%S in (`powershell -NoProfile -Command "$s = (Get-ChildItem -Path '%BACKUP_DIR%' -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum; if ($s -gt 1MB) { '{0:N1} MB' -f ($s/1MB) } elseif ($s -gt 1KB) { '{0:N1} KB' -f ($s/1KB) } else { '{0} bytes' -f $s }"`) do set "TOTAL_SIZE=%%S"

echo ╔════════════════════════════════════════════════════════════╗
echo ║          Backup Complete                                   ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo   保存先: %BACKUP_DIR%\
echo   サイズ: %TOTAL_SIZE%
echo.
echo   リストア方法:
echo     PostgreSQL: docker exec -i itcm-postgres psql -U postgres -d inheritance_tax_db ^< backups\[日時]\postgres.sql
echo     SQLite等:   backups\[日時]\* を data\ にコピー
echo.
pause
