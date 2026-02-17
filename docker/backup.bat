@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

cd /d "%~dp0"

rem Help
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
echo   All databases and upload files will be backed up.
echo   Backups are saved to backups\[timestamp]\.
echo.
echo Backup targets:
echo   [1/4] ITCM PostgreSQL      - pg_dump or file copy
echo   [2/4] Bank Analyzer PG     - pg_dump or file copy
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

for /f "usebackq delims=" %%A in (`powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd_HHmmss'"`) do set "TIMESTAMP=%%A"
set "BACKUP_DIR=backups\%TIMESTAMP%"

if not exist "data" (
    echo [ERROR] data/ not found. Nothing to back up.
    pause
    exit /b 1
)

echo Destination: %BACKUP_DIR%\
echo.

mkdir "%BACKUP_DIR%" 2>nul

set "BACKUP_OK=0"
set "BACKUP_FAIL=0"
set "BACKUP_SKIP=0"

rem --- 1/4 ITCM PostgreSQL (pg_dump) ---
echo [1/4] ITCM PostgreSQL ...

docker compose ps --status running 2>nul | findstr "itcm-postgres" >nul 2>&1
if !ERRORLEVEL! neq 0 goto :itcm_pg_fallback

docker exec itcm-postgres pg_dump -U postgres -d inheritance_tax_db > "%BACKUP_DIR%\itcm-postgres.sql" 2>nul
if !ERRORLEVEL! equ 0 (
    echo [OK]    itcm-postgres.sql
    set /a BACKUP_OK+=1
) else (
    del "%BACKUP_DIR%\itcm-postgres.sql" 2>nul
    echo [WARN]  pg_dump failed
    set /a BACKUP_FAIL+=1
)
goto :itcm_pg_done

:itcm_pg_fallback
if not exist "data\postgres" goto :itcm_pg_skip
echo [WARN]  Container stopped - falling back to file copy
robocopy "data\postgres" "%BACKUP_DIR%\itcm-postgres" /E /NFL /NDL /NJH /NJS >nul 2>&1
if !ERRORLEVEL! lss 8 (
    echo [OK]    itcm-postgres/ (file copy)
    set /a BACKUP_OK+=1
) else (
    echo [ERROR] itcm-postgres/ copy failed
    set /a BACKUP_FAIL+=1
)
goto :itcm_pg_done

:itcm_pg_skip
echo [SKIP]  data/postgres/ not found
set /a BACKUP_SKIP+=1

:itcm_pg_done

rem --- 2/4 Bank Analyzer PostgreSQL + pgvector (pg_dump) ---
echo [2/4] Bank Analyzer PostgreSQL ...

docker compose ps --status running 2>nul | findstr "bank-analyzer-postgres" >nul 2>&1
if !ERRORLEVEL! neq 0 goto :bank_pg_fallback

docker exec bank-analyzer-postgres pg_dump -U bankuser -d bank_analyzer > "%BACKUP_DIR%\bank-analyzer-postgres.sql" 2>nul
if !ERRORLEVEL! equ 0 (
    echo [OK]    bank-analyzer-postgres.sql
    set /a BACKUP_OK+=1
) else (
    del "%BACKUP_DIR%\bank-analyzer-postgres.sql" 2>nul
    echo [WARN]  pg_dump failed
    set /a BACKUP_FAIL+=1
)
goto :bank_pg_done

:bank_pg_fallback
if not exist "data\bank-analyzer\postgres" goto :bank_pg_skip
echo [WARN]  Container stopped - falling back to file copy
robocopy "data\bank-analyzer\postgres" "%BACKUP_DIR%\bank-analyzer\postgres" /E /NFL /NDL /NJH /NJS >nul 2>&1
if !ERRORLEVEL! lss 8 (
    echo [OK]    bank-analyzer/postgres/ (file copy)
    set /a BACKUP_OK+=1
) else (
    echo [ERROR] bank-analyzer/postgres/ copy failed
    set /a BACKUP_FAIL+=1
)
goto :bank_pg_done

:bank_pg_skip
echo [SKIP]  data/bank-analyzer/postgres/ not found
set /a BACKUP_SKIP+=1

:bank_pg_done

rem --- 3/4 SQLite (file copy) ---
echo [3/4] SQLite ...

set SQLITE_OK=0
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
            set /a SQLITE_OK+=1
        ) else (
            echo [ERROR] %%~D copy failed
            set /a SQLITE_FAIL+=1
        )
    )
)

if !SQLITE_OK! gtr 0 (
    echo [OK]    SQLite !SQLITE_OK! directories
    set /a BACKUP_OK+=!SQLITE_OK!
)
if !SQLITE_FAIL! gtr 0 (
    echo [WARN]  SQLite !SQLITE_FAIL! directories failed
    set /a BACKUP_FAIL+=!SQLITE_FAIL!
)
if !SQLITE_OK! equ 0 if !SQLITE_FAIL! equ 0 (
    echo [SKIP]  No SQLite data
    set /a BACKUP_SKIP+=1
)

rem --- 4/4 Upload data (file copy) ---
echo [4/4] Upload data ...

if exist "data\bank-analyzer\data" (
    mkdir "%BACKUP_DIR%\bank-analyzer\data" 2>nul
    robocopy "data\bank-analyzer\data" "%BACKUP_DIR%\bank-analyzer\data" /E /NFL /NDL /NJH /NJS >nul 2>&1
    if !ERRORLEVEL! lss 8 (
        echo [OK]    bank-analyzer/data/
        set /a BACKUP_OK+=1
    ) else (
        echo [ERROR] bank-analyzer/data/ copy failed
        set /a BACKUP_FAIL+=1
    )
) else (
    echo [SKIP]  data/bank-analyzer/data/ not found
    set /a BACKUP_SKIP+=1
)

rem --- Summary ---
echo.

for /f "usebackq delims=" %%S in (`powershell -NoProfile -Command "$s = (Get-ChildItem -Path '%BACKUP_DIR%' -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum; if ($s -gt 1MB) { '{0:N1} MB' -f ($s/1MB) } elseif ($s -gt 1KB) { '{0:N1} KB' -f ($s/1KB) } else { '{0} bytes' -f $s }"`) do set "TOTAL_SIZE=%%S"

echo ============================================================
if !BACKUP_FAIL! equ 0 (
    echo   Backup Complete
) else (
    echo   Backup Complete (with errors)
)
echo ============================================================
echo.
echo   Destination: %BACKUP_DIR%\
echo   Size: %TOTAL_SIZE%
echo   OK: !BACKUP_OK!  Skipped: !BACKUP_SKIP!  Failed: !BACKUP_FAIL!
echo.
if !BACKUP_OK! equ 0 (
    echo   [WARN]  No data was backed up. Removing empty directory.
    rmdir /s /q "%BACKUP_DIR%" 2>nul
) else (
    echo   To restore: restore.bat %TIMESTAMP%
)
echo.
pause
