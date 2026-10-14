@echo off
:: ============================================
:: Tax Apps - Restore (Windows helper)
:: ============================================
:: Delegates to backup.sh restore via Git Bash.
:: Double-click: pick the app and the backup from a menu.
:: Per-app restore, counts check and the new-PC steps: docker/RESTORE.md
:: The main restore logic lives in backup.sh.
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
    exit /b 1
)

"%GIT_BASH%" --login "%~dp0backup.sh" restore %*
set "RC=%ERRORLEVEL%"
pause
exit /b %RC%
