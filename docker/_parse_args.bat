@echo off
:: Common argument parser for Tax Apps batch scripts
:: Usage: call _parse_args.bat %*
::
:: Sets the following variables:
::   PROD_FLAG    - Production compose files (-f docker-compose.yml -f docker-compose.prod.yml)
::   BUILD_FLAG   - Build option (--build)
::   VOLUME_FLAG  - Volume removal option (-v)
::   FOLLOW       - Log follow option (-f), default: -f
::   LINES        - Log tail lines, default: 100
::   SERVICE      - Target service name

set "PROD_FLAG="
set "BUILD_FLAG="
set "VOLUME_FLAG="
set "FOLLOW=-f"
set "LINES=100"
set "SERVICE="

:_parse_loop
if "%~1"=="" goto :eof
if /i "%~1"=="--build" (
    set "BUILD_FLAG=--build"
    shift
    goto :_parse_loop
)
if /i "%~1"=="-b" (
    set "BUILD_FLAG=--build"
    shift
    goto :_parse_loop
)
if /i "%~1"=="--prod" (
    set "PROD_FLAG=-f docker-compose.yml -f docker-compose.prod.yml"
    shift
    goto :_parse_loop
)
if /i "%~1"=="-p" (
    set "PROD_FLAG=-f docker-compose.yml -f docker-compose.prod.yml"
    shift
    goto :_parse_loop
)
if /i "%~1"=="--volumes" (
    set "VOLUME_FLAG=-v"
    shift
    goto :_parse_loop
)
if /i "%~1"=="-v" (
    set "VOLUME_FLAG=-v"
    shift
    goto :_parse_loop
)
if /i "%~1"=="--no-follow" (
    set "FOLLOW="
    shift
    goto :_parse_loop
)
if /i "%~1"=="--tail" (
    set "LINES=%~2"
    shift
    shift
    goto :_parse_loop
)
if /i "%~1"=="-t" (
    set "LINES=%~2"
    shift
    shift
    goto :_parse_loop
)
:: Any other argument is treated as service name
set "SERVICE=%~1"
shift
goto :_parse_loop
