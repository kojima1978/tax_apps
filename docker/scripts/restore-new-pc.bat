@echo off
:: ============================================
:: Tax Apps - Restore everything on a new PC (Windows helper)
:: ============================================
:: Delegates to backup.sh newpc via Git Bash.
:: Double-click: checks Docker and the key, lets you pick where the
:: backups are (this PC / latest copy / USB drive / typed folder) and
:: which backup, verifies it, asks once (y), then places missing .env
:: files, starts every app in its original mode and restores the data.
:: Steps and troubleshooting: docker/RESTORE.md (B)
:: The main logic lives in backup.sh.
:: This wrapper is ASCII-only to avoid Shift-JIS issues.
:: ============================================

set "GIT_BASH="
if exist "C:\Program Files\Git\bin\bash.exe" (
    set "GIT_BASH=C:\Program Files\Git\bin\bash.exe"
) else if exist "C:\Program Files (x86)\Git\bin\bash.exe" (
    set "GIT_BASH=C:\Program Files (x86)\Git\bin\bash.exe"
) else (
    for /f "tokens=*" %%P in ('where git 2^>nul') do (
        if exist "%%~dpP..\bin\bash.exe" set "GIT_BASH=%%~dpP..\bin\bash.exe"
    )
)

if "%GIT_BASH%"=="" (
    echo [ERROR] Git Bash not found. Please install Git for Windows.
    echo         https://gitforwindows.org/
    pause
    exit /b 1
)

"%GIT_BASH%" --login "%~dp0backup.sh" newpc %*
set "RC=%ERRORLEVEL%"
pause
exit /b %RC%
