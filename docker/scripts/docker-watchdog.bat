@echo off
:: ============================================
:: Tax Apps - Docker Desktop watchdog wrapper
:: ============================================
:: Intended for Windows Task Scheduler.
:: ============================================

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0docker-watchdog.ps1" %*
exit /b %ERRORLEVEL%
