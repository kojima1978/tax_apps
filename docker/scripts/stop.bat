@echo off
cd /d "%~dp0"
set "TAX_APPS_NO_PAUSE=1"
call manage.bat stop
set "EXIT_CODE=%ERRORLEVEL%"
set "TAX_APPS_NO_PAUSE="
pause
exit /b %EXIT_CODE%
