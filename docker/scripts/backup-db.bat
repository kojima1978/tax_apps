@echo off
REM ============================================================
REM  ITCM PostgreSQL Auto Backup
REM  - docker exec + pg_dump
REM  - 7 days retention (auto cleanup)
REM  - Task Scheduler or double-click
REM ============================================================

setlocal enabledelayedexpansion

REM --- Settings ---
set CONTAINER=itcm-postgres
set DB_USER=postgres
set DB_NAME=inheritance_tax_db
set BACKUP_DIR=%~dp0..\backups\itcm-db
set RETENTION_DAYS=7

REM --- Create backup directory ---
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

REM --- Generate filename ---
for /f "tokens=1-3 delims=/ " %%a in ('date /t') do set YMD=%%a%%b%%c
for /f "tokens=1-2 delims=: " %%a in ('time /t') do set HM=%%a%%b
set FILENAME=itcm-db_%YMD%_%HM%.sql

echo [%date% %time%] ITCM DB Backup Start
echo   Container: %CONTAINER%
echo   Database:  %DB_NAME%
echo   Output:    %BACKUP_DIR%\%FILENAME%

REM --- Check container is running ---
docker inspect -f "{{.State.Running}}" %CONTAINER% >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Container %CONTAINER% is not running.
    echo         Run: docker compose up -d
    pause
    exit /b 1
)

REM --- Execute pg_dump ---
docker exec %CONTAINER% pg_dump -U %DB_USER% -d %DB_NAME% --clean --if-exists > "%BACKUP_DIR%\%FILENAME%"
if errorlevel 1 (
    echo [ERROR] pg_dump failed.
    pause
    exit /b 1
)

REM --- Show file size ---
for %%f in ("%BACKUP_DIR%\%FILENAME%") do echo   Size: %%~zf bytes

REM --- Cleanup old backups ---
echo   Cleaning up backups older than %RETENTION_DAYS% days...
forfiles /p "%BACKUP_DIR%" /m "itcm-db_*.sql" /d -%RETENTION_DAYS% /c "cmd /c echo   Deleting: @file && del @path" 2>nul

echo [%date% %time%] Backup Complete
