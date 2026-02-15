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
echo   Tax Apps - Backup
echo ============================================================
echo.
echo Usage: backup.bat [--help]
echo.
echo Description:
echo   全データベースとアップロードファイルをバックアップします。
echo   バックアップは backups\[タイムスタンプ]\ に保存されます。
echo.
echo Backup targets:
echo   [1/4] ITCM PostgreSQL      - pg_dump または ファイルコピー
echo   [2/4] Bank Analyzer PG     - pg_dump または ファイルコピー
echo   [3/4] SQLite databases     - tax-docs, medical-stock, bank-analyzer/db
echo   [4/4] Upload data          - bank-analyzer/data
echo.
echo Options:
echo   --help, -h    Show this help
echo.
echo Example:
echo   backup.bat              Create backup
echo.
pause
exit /b 0

:main
echo.
echo ============================================================
echo   Tax Apps - Backup
echo ============================================================
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
:: 1. ITCM PostgreSQL (pg_dump)
:: ──────────────────────────────────────────────────────────────
echo [1/4] ITCM PostgreSQL ...

docker compose ps --status running 2>nul | findstr "itcm-postgres" >nul 2>&1
if !ERRORLEVEL! neq 0 goto :itcm_pg_fallback

docker exec itcm-postgres pg_dump -U postgres -d inheritance_tax_db > "%BACKUP_DIR%\itcm-postgres.sql" 2>nul
if !ERRORLEVEL! equ 0 (
    echo [OK]    itcm-postgres.sql
) else (
    echo [WARN]  pg_dump に失敗しました
)
goto :itcm_pg_done

:itcm_pg_fallback
if exist "data\postgres" (
    echo [WARN]  PostgreSQL コンテナが停止中のためファイルコピーにフォールバック
    robocopy "data\postgres" "%BACKUP_DIR%\itcm-postgres" /E /NFL /NDL /NJH /NJS >nul 2>&1
    if !ERRORLEVEL! lss 8 (
        echo [OK]    itcm-postgres/ (ファイルコピー)
    ) else (
        echo [ERROR] itcm-postgres/ のコピーに失敗しました
    )
) else (
    echo [SKIP]  data/postgres/ が存在しません
)

:itcm_pg_done

:: ──────────────────────────────────────────────────────────────
:: 2. Bank Analyzer PostgreSQL + pgvector (pg_dump)
:: ──────────────────────────────────────────────────────────────
echo [2/4] Bank Analyzer PostgreSQL ...

docker compose ps --status running 2>nul | findstr "bank-analyzer-postgres" >nul 2>&1
if !ERRORLEVEL! neq 0 goto :bank_pg_fallback

docker exec bank-analyzer-postgres pg_dump -U bankuser -d bank_analyzer > "%BACKUP_DIR%\bank-analyzer-postgres.sql" 2>nul
if !ERRORLEVEL! equ 0 (
    echo [OK]    bank-analyzer-postgres.sql
) else (
    echo [WARN]  pg_dump に失敗しました
)
goto :bank_pg_done

:bank_pg_fallback
if exist "data\bank-analyzer\postgres" (
    echo [WARN]  PostgreSQL コンテナが停止中のためファイルコピーにフォールバック
    robocopy "data\bank-analyzer\postgres" "%BACKUP_DIR%\bank-analyzer\postgres" /E /NFL /NDL /NJH /NJS >nul 2>&1
    if !ERRORLEVEL! lss 8 (
        echo [OK]    bank-analyzer/postgres/ (ファイルコピー)
    ) else (
        echo [ERROR] bank-analyzer/postgres/ のコピーに失敗しました
    )
) else (
    echo [SKIP]  data/bank-analyzer/postgres/ が存在しません
)

:bank_pg_done

:: ──────────────────────────────────────────────────────────────
:: 3. SQLite データベース (ファイルコピー)
:: ──────────────────────────────────────────────────────────────
echo [3/4] SQLite ...

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
:: 4. アップロードデータ (ファイルコピー)
:: ──────────────────────────────────────────────────────────────
echo [4/4] Upload data ...

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

echo ============================================================
echo   Backup Complete
echo ============================================================
echo.
echo   保存先: %BACKUP_DIR%\
echo   サイズ: %TOTAL_SIZE%
echo.
echo   リストア方法:
echo     ITCM PostgreSQL:
echo       docker exec -i itcm-postgres psql -U postgres -d inheritance_tax_db ^< backups\[日時]\itcm-postgres.sql
echo     Bank Analyzer PostgreSQL:
echo       docker exec -i bank-analyzer-postgres psql -U bankuser -d bank_analyzer ^< backups\[日時]\bank-analyzer-postgres.sql
echo     SQLite等:
echo       backups\[日時]\* を data\ にコピー
echo.
pause
