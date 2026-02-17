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
echo   Tax Apps - Restore
echo ============================================================
echo.
echo Usage: restore.bat [backup_dir] [--help]
echo.
echo Description:
echo   Restore data from a backup created by backup.bat.
echo   Without arguments, select from available backups.
echo.
echo Restore targets:
echo   [1/4] ITCM PostgreSQL      - psql or file copy
echo   [2/4] Bank Analyzer PG     - psql or file copy
echo   [3/4] SQLite databases     - tax-docs, medical-stock, bank-analyzer/db
echo   [4/4] Upload data          - bank-analyzer/data
echo.
echo Options:
echo   backup_dir    backups\ folder name (e.g. 2026-02-16_120000)
echo   --help, -h    Show this help
echo.
echo Example:
echo   restore.bat                        Select from list
echo   restore.bat 2026-02-16_120000      Restore from specified folder
echo.
pause
exit /b 0

:main
echo.
echo ============================================================
echo   Tax Apps - Restore
echo ============================================================
echo.

if not exist "backups" (
    echo [ERROR] backups/ not found. Run backup.bat first.
    pause
    exit /b 1
)

set "BACKUP_DIR="

if not "%~1"=="" (
    if exist "backups\%~1" (
        set "BACKUP_DIR=backups\%~1"
        goto :confirm_restore
    )
    echo [ERROR] backups\%~1 not found.
    echo.
)

set "COUNT=0"
for /f "delims=" %%D in ('dir /b /ad /o-n "backups\" 2^>nul') do (
    set /a COUNT+=1
    set "BACKUP_!COUNT!=%%D"
)

if !COUNT! equ 0 (
    echo [ERROR] No backups found. Run backup.bat first.
    pause
    exit /b 1
)

echo Available backups:
echo.
for /L %%I in (1,1,!COUNT!) do (
    for /f "usebackq delims=" %%S in (`powershell -NoProfile -Command "$s = (Get-ChildItem -Path 'backups\!BACKUP_%%I!' -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum; if ($s -gt 1MB) { '{0:N1} MB' -f ($s/1MB) } elseif ($s -gt 1KB) { '{0:N1} KB' -f ($s/1KB) } else { '{0} bytes' -f $s }"`) do (
        echo   [%%I] !BACKUP_%%I!  ^(%%S^)
    )
)
echo.
echo   [0] Cancel
echo.

set /p "CHOICE=Select number: "

if "%CHOICE%"=="0" (
    echo Cancelled.
    exit /b 0
)

set /a CHOICE_NUM=%CHOICE% 2>nul
if !CHOICE_NUM! lss 1 (
    echo [ERROR] Invalid selection.
    pause
    exit /b 1
)
if !CHOICE_NUM! gtr !COUNT! (
    echo [ERROR] Invalid selection.
    pause
    exit /b 1
)

set "BACKUP_DIR=backups\!BACKUP_%CHOICE_NUM%!"

:confirm_restore
echo.
echo ============================================================
echo   Restore from: %BACKUP_DIR%\
echo ============================================================
echo.

echo Contents:
if exist "%BACKUP_DIR%\itcm-postgres.sql" echo   - ITCM PostgreSQL (SQL dump)
if exist "%BACKUP_DIR%\itcm-postgres" echo   - ITCM PostgreSQL (file copy)
if exist "%BACKUP_DIR%\bank-analyzer-postgres.sql" echo   - Bank Analyzer PostgreSQL (SQL dump)
if exist "%BACKUP_DIR%\bank-analyzer\postgres" echo   - Bank Analyzer PostgreSQL (file copy)
if exist "%BACKUP_DIR%\tax-docs" echo   - SQLite: tax-docs
if exist "%BACKUP_DIR%\medical-stock" echo   - SQLite: medical-stock
if exist "%BACKUP_DIR%\bank-analyzer\db" echo   - SQLite: bank-analyzer/db
if exist "%BACKUP_DIR%\bank-analyzer\data" echo   - Upload: bank-analyzer/data
echo.

echo [WARNING] This will overwrite current data.
set /p "CONFIRM=Continue? (y/N): "
if /i not "%CONFIRM%"=="y" (
    echo Cancelled.
    exit /b 0
)
echo.

set "RESTORE_OK=0"
set "RESTORE_FAIL=0"
set "RESTORE_SKIP=0"

rem --- 1/4 ITCM PostgreSQL ---
echo [1/4] ITCM PostgreSQL ...

if not exist "%BACKUP_DIR%\itcm-postgres.sql" goto :itcm_try_filecopy
docker compose ps --status running 2>nul | findstr "itcm-postgres" >nul 2>&1
if !ERRORLEVEL! neq 0 (
    echo [ERROR] itcm-postgres container is not running.
    echo         Run: docker compose up -d itcm-postgres
    set /a RESTORE_FAIL+=1
    goto :itcm_pg_done
)
docker exec itcm-postgres psql -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='inheritance_tax_db' AND pid <> pg_backend_pid();" >nul 2>&1
docker exec itcm-postgres psql -U postgres -c "DROP DATABASE IF EXISTS inheritance_tax_db;" >nul 2>&1
docker exec itcm-postgres psql -U postgres -c "CREATE DATABASE inheritance_tax_db;" >nul 2>&1
docker exec -i itcm-postgres psql -U postgres -d inheritance_tax_db < "%BACKUP_DIR%\itcm-postgres.sql" >nul 2>&1
if !ERRORLEVEL! equ 0 (
    echo [OK]    itcm-postgres.sql
    set /a RESTORE_OK+=1
) else (
    echo [ERROR] itcm-postgres restore failed
    set /a RESTORE_FAIL+=1
)
goto :itcm_pg_done

:itcm_try_filecopy
if not exist "%BACKUP_DIR%\itcm-postgres" goto :itcm_skip
echo [WARN]  Restoring from file copy (recommended only when container is stopped)
robocopy "%BACKUP_DIR%\itcm-postgres" "data\postgres" /E /NFL /NDL /NJH /NJS >nul 2>&1
if !ERRORLEVEL! lss 8 (
    echo [OK]    itcm-postgres/ (file copy)
    set /a RESTORE_OK+=1
) else (
    echo [ERROR] itcm-postgres/ copy failed
    set /a RESTORE_FAIL+=1
)
goto :itcm_pg_done

:itcm_skip
echo [SKIP]  Not in backup
set /a RESTORE_SKIP+=1

:itcm_pg_done

rem --- 2/4 Bank Analyzer PostgreSQL ---
echo [2/4] Bank Analyzer PostgreSQL ...

if not exist "%BACKUP_DIR%\bank-analyzer-postgres.sql" goto :bank_try_filecopy
docker compose ps --status running 2>nul | findstr "bank-analyzer-postgres" >nul 2>&1
if !ERRORLEVEL! neq 0 (
    echo [ERROR] bank-analyzer-postgres container is not running.
    echo         Run: docker compose up -d bank-analyzer-db
    set /a RESTORE_FAIL+=1
    goto :bank_pg_done
)
docker exec bank-analyzer-postgres psql -U bankuser -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='bank_analyzer' AND pid <> pg_backend_pid();" >nul 2>&1
docker exec bank-analyzer-postgres psql -U bankuser -d postgres -c "DROP DATABASE IF EXISTS bank_analyzer;" >nul 2>&1
docker exec bank-analyzer-postgres psql -U bankuser -d postgres -c "CREATE DATABASE bank_analyzer;" >nul 2>&1
docker exec -i bank-analyzer-postgres psql -U bankuser -d bank_analyzer < "%BACKUP_DIR%\bank-analyzer-postgres.sql" >nul 2>&1
if !ERRORLEVEL! equ 0 (
    echo [OK]    bank-analyzer-postgres.sql
    set /a RESTORE_OK+=1
) else (
    echo [ERROR] bank-analyzer-postgres restore failed
    set /a RESTORE_FAIL+=1
)
goto :bank_pg_done

:bank_try_filecopy
if not exist "%BACKUP_DIR%\bank-analyzer\postgres" goto :bank_skip
echo [WARN]  Restoring from file copy (recommended only when container is stopped)
robocopy "%BACKUP_DIR%\bank-analyzer\postgres" "data\bank-analyzer\postgres" /E /NFL /NDL /NJH /NJS >nul 2>&1
if !ERRORLEVEL! lss 8 (
    echo [OK]    bank-analyzer/postgres/ (file copy)
    set /a RESTORE_OK+=1
) else (
    echo [ERROR] bank-analyzer/postgres/ copy failed
    set /a RESTORE_FAIL+=1
)
goto :bank_pg_done

:bank_skip
echo [SKIP]  Not in backup
set /a RESTORE_SKIP+=1

:bank_pg_done

rem --- 3/4 SQLite ---
echo [3/4] SQLite ...

set SQLITE_OK=0
set SQLITE_SKIP=0
for %%D in (
    "tax-docs"
    "medical-stock"
    "bank-analyzer\db"
) do (
    if exist "%BACKUP_DIR%\%%~D" (
        robocopy "%BACKUP_DIR%\%%~D" "data\%%~D" /E /NFL /NDL /NJH /NJS >nul 2>&1
        if !ERRORLEVEL! lss 8 (
            set /a SQLITE_OK+=1
        ) else (
            echo [ERROR] %%~D copy failed
            set /a RESTORE_FAIL+=1
        )
    ) else (
        set /a SQLITE_SKIP+=1
    )
)

if !SQLITE_OK! gtr 0 (
    echo [OK]    SQLite !SQLITE_OK! directories
    set /a RESTORE_OK+=!SQLITE_OK!
)
if !SQLITE_SKIP! equ 3 (
    echo [SKIP]  Not in backup
    set /a RESTORE_SKIP+=1
)

rem --- 4/4 Upload data ---
echo [4/4] Upload data ...

if exist "%BACKUP_DIR%\bank-analyzer\data" (
    robocopy "%BACKUP_DIR%\bank-analyzer\data" "data\bank-analyzer\data" /E /NFL /NDL /NJH /NJS >nul 2>&1
    if !ERRORLEVEL! lss 8 (
        echo [OK]    bank-analyzer/data/
        set /a RESTORE_OK+=1
    ) else (
        echo [ERROR] bank-analyzer/data/ copy failed
        set /a RESTORE_FAIL+=1
    )
) else (
    echo [SKIP]  Not in backup
    set /a RESTORE_SKIP+=1
)

rem --- Summary ---
echo.
echo ============================================================
if !RESTORE_FAIL! equ 0 (
    echo   Restore Complete
) else (
    echo   Restore Complete (with errors)
)
echo ============================================================
echo.
echo   Source: %BACKUP_DIR%\
echo   OK: !RESTORE_OK!  Skipped: !RESTORE_SKIP!  Failed: !RESTORE_FAIL!
echo.
if !RESTORE_OK! gtr 0 (
    echo   [NOTE] After PostgreSQL restore, restart apps:
    echo     docker compose restart bank-analyzer itcm-backend
    echo.
    echo   [NOTE] After SQLite restore, restart services:
    echo     docker compose restart tax-docs-backend medical-stock-valuation bank-analyzer
    echo.
)
pause
