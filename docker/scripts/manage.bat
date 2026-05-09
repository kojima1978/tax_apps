@echo off
:: ============================================
:: Tax Apps - Container Management (Windows)
:: ============================================
:: Delegates to manage.sh via Git Bash.
:: All messages (including Japanese) live in manage.sh (UTF-8).
:: This wrapper is ASCII-only to avoid Shift-JIS encoding issues.
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

if "%~1"=="" (
    "%GIT_BASH%" --login "%~dp0manage.sh" start
) else (
    "%GIT_BASH%" --login "%~dp0manage.sh" %*
)
set "EXIT_CODE=%ERRORLEVEL%"
if not defined TAX_APPS_NO_PAUSE pause
exit /b %EXIT_CODE%
