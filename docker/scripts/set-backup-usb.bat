@echo off
:: ============================================
:: Tax Apps - Choose where backups are copied (USB drive / NAS)
:: ============================================
:: Delegates to backup.sh usb via Git Bash.
:: Double-click: lists the drives, you pick one (or type a folder),
:: it creates <drive>:\tax-apps-backup, checks it is writable, saves the
:: setting to %USERPROFILE%\.tax-apps\backup-external-dest and can copy
:: the newest backup there right away.
:: Every backup after that is also copied there. If the drive letter
:: changes later, the folder is found again by its marker file.
:: Details: docker/RESTORE.md (external copy)
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

"%GIT_BASH%" --login "%~dp0backup.sh" usb %*
set "RC=%ERRORLEVEL%"
pause
exit /b %RC%
