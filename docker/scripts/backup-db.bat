@echo off
REM ============================================================
REM  All Database & File Backup
REM  - ITCM PostgreSQL (pg_dump)
REM  - Bank Analyzer PostgreSQL (pg_dump)
REM  - Medical Stock SQLite (docker cp)
REM  - ITCM Excel Templates (robocopy)
REM  - 7 days retention (auto cleanup)
REM  - Task Scheduler or double-click
REM ============================================================

setlocal enabledelayedexpansion

set RETENTION_DAYS=7
set ERRORS=0

REM --- Generate date/time stamp ---
for /f "tokens=1-3 delims=/ " %%a in ('date /t') do set YMD=%%a%%b%%c
for /f "tokens=1-2 delims=: " %%a in ('time /t') do set HM=%%a%%b

echo ============================================================
echo  Database Backup - %date% %time%
echo ============================================================
echo.

REM ============================================================
REM  1. ITCM PostgreSQL
REM ============================================================
set PG1_CONTAINER=itcm-postgres
set PG1_USER=postgres
set PG1_DB=inheritance_tax_db
set PG1_DIR=%~dp0..\backups\itcm-db
set PG1_FILE=itcm-db_%YMD%_%HM%.sql

echo [1/4] ITCM PostgreSQL
if not exist "%PG1_DIR%" mkdir "%PG1_DIR%"

docker inspect -f "{{.State.Running}}" %PG1_CONTAINER% >nul 2>&1
if errorlevel 1 (
    echo   [SKIP] Container %PG1_CONTAINER% is not running.
    set /a ERRORS+=1
) else (
    docker exec %PG1_CONTAINER% pg_dump -U %PG1_USER% -d %PG1_DB% --clean --if-exists > "%PG1_DIR%\%PG1_FILE%"
    if errorlevel 1 (
        echo   [ERROR] pg_dump failed.
        set /a ERRORS+=1
    ) else (
        for %%f in ("%PG1_DIR%\%PG1_FILE%") do echo   OK: %%~zf bytes -^> %PG1_FILE%
        forfiles /p "%PG1_DIR%" /m "itcm-db_*.sql" /d -%RETENTION_DAYS% /c "cmd /c echo   Deleting: @file && del @path" 2>nul
    )
)
echo.

REM ============================================================
REM  2. Bank Analyzer PostgreSQL
REM ============================================================
set PG2_CONTAINER=bank-analyzer-postgres
set PG2_USER=bankuser
set PG2_DB=bank_analyzer
set PG2_DIR=%~dp0..\backups\bank-analyzer-db
set PG2_FILE=bank-analyzer-db_%YMD%_%HM%.sql

echo [2/4] Bank Analyzer PostgreSQL
if not exist "%PG2_DIR%" mkdir "%PG2_DIR%"

docker inspect -f "{{.State.Running}}" %PG2_CONTAINER% >nul 2>&1
if errorlevel 1 (
    echo   [SKIP] Container %PG2_CONTAINER% is not running.
    set /a ERRORS+=1
) else (
    docker exec %PG2_CONTAINER% pg_dump -U %PG2_USER% -d %PG2_DB% --clean --if-exists > "%PG2_DIR%\%PG2_FILE%"
    if errorlevel 1 (
        echo   [ERROR] pg_dump failed.
        set /a ERRORS+=1
    ) else (
        for %%f in ("%PG2_DIR%\%PG2_FILE%") do echo   OK: %%~zf bytes -^> %PG2_FILE%
        forfiles /p "%PG2_DIR%" /m "bank-analyzer-db_*.sql" /d -%RETENTION_DAYS% /c "cmd /c echo   Deleting: @file && del @path" 2>nul
    )
)
echo.

REM ============================================================
REM  3. Medical Stock SQLite
REM ============================================================
set SQ1_CONTAINER=medical-stock-valuation
set SQ1_SRC=/app/data/doctor.db
set SQ1_DIR=%~dp0..\backups\medical-stock-db
set SQ1_FILE=medical-stock-db_%YMD%_%HM%.db

echo [3/4] Medical Stock SQLite
if not exist "%SQ1_DIR%" mkdir "%SQ1_DIR%"

docker inspect -f "{{.State.Running}}" %SQ1_CONTAINER% >nul 2>&1
if errorlevel 1 (
    echo   [SKIP] Container %SQ1_CONTAINER% is not running.
    set /a ERRORS+=1
) else (
    docker cp %SQ1_CONTAINER%:%SQ1_SRC% "%SQ1_DIR%\%SQ1_FILE%"
    if errorlevel 1 (
        echo   [ERROR] docker cp failed.
        set /a ERRORS+=1
    ) else (
        for %%f in ("%SQ1_DIR%\%SQ1_FILE%") do echo   OK: %%~zf bytes -^> %SQ1_FILE%
        forfiles /p "%SQ1_DIR%" /m "medical-stock-db_*.db" /d -%RETENTION_DAYS% /c "cmd /c echo   Deleting: @file && del @path" 2>nul
    )
)
echo.

REM ============================================================
REM  4. ITCM Excel Templates
REM ============================================================
set TPL_SRC=%~dp0..\..\apps\inheritance-case-management\templates
set TPL_DIR=%~dp0..\backups\itcm-templates
set TPL_FOLDER=itcm-templates_%YMD%_%HM%

echo [4/4] ITCM Excel Templates
if not exist "%TPL_SRC%\*.xlsx" (
    echo   [SKIP] No .xlsx files found in templates folder.
) else (
    if not exist "%TPL_DIR%\%TPL_FOLDER%" mkdir "%TPL_DIR%\%TPL_FOLDER%"
    robocopy "%TPL_SRC%" "%TPL_DIR%\%TPL_FOLDER%" *.xlsx /njh /njs /ndl /nc /ns >nul 2>&1
    set RC=!errorlevel!
    if !RC! LSS 8 (
        echo   OK: Copied to %TPL_FOLDER%\
        forfiles /p "%TPL_DIR%" /m "itcm-templates_*" /d -%RETENTION_DAYS% /c "cmd /c if @isdir==TRUE echo   Deleting: @file && rd /s /q @path" 2>nul
    ) else (
        echo   [ERROR] robocopy failed with code !RC!.
        set /a ERRORS+=1
    )
)
echo.

REM ============================================================
REM  Summary
REM ============================================================
if %ERRORS%==0 (
    echo [OK] All backups completed successfully.
) else (
    echo [WARN] %ERRORS% backup(s) skipped or failed.
)
echo ============================================================
