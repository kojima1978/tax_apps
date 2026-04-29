@echo off
:: ============================================
:: Tax Apps - Backup (Windows helper)
:: ============================================
:: Delegates to backup.sh itcm via Git Bash.
:: The main backup logic lives in backup.sh.
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

"%GIT_BASH%" "%~dp0backup.sh" itcm %*
exit /b %ERRORLEVEL%
