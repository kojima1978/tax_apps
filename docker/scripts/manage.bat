@echo off
setlocal enabledelayedexpansion
:: ============================================
:: Tax Apps 個別コンテナ管理スクリプト
:: ============================================
::
:: Usage:
::   manage.bat start              全アプリを起動（ネットワーク自動作成）
::   manage.bat start --prod       全アプリを本番モードで起動
::   manage.bat stop               全アプリを停止
::   manage.bat down               全アプリを停止してコンテナ削除
::   manage.bat restart <app>      指定アプリのみ再起動
::   manage.bat build <app>        指定アプリを再ビルドして起動
::   manage.bat logs <app>         指定アプリのログ表示
::   manage.bat status             全アプリの状態表示
::   manage.bat backup             全データベース・データをバックアップ
::   manage.bat restore [dir]      バックアップからリストア
::   manage.bat clean              コンテナ・イメージのクリーンアップ
::   manage.bat preflight          起動前環境チェック
::
:: ============================================

:: プロジェクトルート（docker/scripts/ の2つ上）
set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%\..\..\") do set "PROJECT_ROOT=%%~fI"
:: 末尾の \ を除去
if "%PROJECT_ROOT:~-1%"=="\" set "PROJECT_ROOT=%PROJECT_ROOT:~0,-1%"

:: 外部ネットワーク名
set "NETWORK_NAME=tax-apps-network"

:: バックアップディレクトリ
set "BACKUP_BASE=%SCRIPT_DIR%..\backups"

:: ------------------------------------
:: アプリ一覧（起動順序を考慮）
:: gateway は最初、DB依存アプリは DB→App の順
:: ------------------------------------
set "APP_COUNT=11"
set "APP_1=docker\gateway"
set "APP_2=apps\inheritance-case-management"
set "APP_3=apps\bank-analyzer-django"
set "APP_4=apps\Required-documents-for-tax-return"
set "APP_5=apps\medical-stock-valuation"
set "APP_6=apps\shares-valuation"
set "APP_7=apps\inheritance-tax-app"
set "APP_8=apps\gift-tax-simulator"
set "APP_9=apps\gift-tax-docs"
set "APP_10=apps\inheritance-tax-docs"
set "APP_11=apps\retirement-tax-calc"

:: ------------------------------------
:: メイン
:: ------------------------------------
if /i "%~1"=="" goto :show_help
if /i "%~1"=="--help" goto :show_help
if /i "%~1"=="-h" goto :show_help
if /i "%~1"=="start" goto :cmd_start
if /i "%~1"=="stop" goto :cmd_stop
if /i "%~1"=="down" goto :cmd_down
if /i "%~1"=="restart" goto :cmd_restart
if /i "%~1"=="build" goto :cmd_build
if /i "%~1"=="logs" goto :cmd_logs
if /i "%~1"=="status" goto :cmd_status
if /i "%~1"=="backup" goto :cmd_backup
if /i "%~1"=="restore" goto :cmd_restore
if /i "%~1"=="clean" goto :cmd_clean
if /i "%~1"=="preflight" goto :cmd_preflight
goto :show_help

:: ============================================================
:: start - 全アプリを起動
:: ============================================================
:cmd_start
set "PROD_MODE=0"
if /i "%~2"=="--prod" set "PROD_MODE=1"
call :preflight_quick
if !ERRORLEVEL! neq 0 (
    echo.
    echo [ERROR] Preflight check failed. Run: manage.bat preflight
    pause
    exit /b 1
)
call :ensure_network
echo.
if "!PROD_MODE!"=="1" (
    echo [manage] 全アプリを本番モードで起動します...
) else (
    echo [manage] 全アプリを起動します...
)
echo.
for /L %%I in (1,1,%APP_COUNT%) do call :do_start_app %%I
echo.
echo [manage] 全アプリの起動が完了しました
call :cmd_status_inner
goto :end

:: ============================================================
:: stop - 全アプリを停止（逆順）
:: ============================================================
:cmd_stop
echo.
echo [manage] 全アプリを停止します...
echo.
for /L %%I in (%APP_COUNT%,-1,1) do call :do_stop_app %%I
echo.
echo [manage] 全アプリを停止しました
goto :end

:: ============================================================
:: down - 全アプリを停止・削除（逆順）
:: ============================================================
:cmd_down
echo.
echo [manage] 全アプリを停止・削除します...
echo.
for /L %%I in (%APP_COUNT%,-1,1) do call :do_down_app %%I
echo.
echo [manage] 全アプリを削除しました
goto :end

:: ============================================================
:: restart <app> - 指定アプリを再起動
:: ============================================================
:cmd_restart
if "%~2"=="" (
    echo [ERROR] アプリ名を指定してください
    echo Usage: manage.bat restart ^<app-name^>
    call :show_apps
    goto :end
)
call :resolve_app "%~2"
if "!RESOLVED_DIR!"=="" goto :end
call :ensure_network
for %%N in ("!RESOLVED_DIR!") do set "APP_NAME=%%~nxN"
echo.
echo [manage] !APP_NAME! を再起動します...
docker compose -f "!RESOLVED_DIR!\docker-compose.yml" restart
echo [manage] !APP_NAME! を再起動しました
goto :end

:: ============================================================
:: build <app> - 指定アプリを再ビルドして起動
:: ============================================================
:cmd_build
if "%~2"=="" (
    echo [ERROR] アプリ名を指定してください
    echo Usage: manage.bat build ^<app-name^>
    call :show_apps
    goto :end
)
call :resolve_app "%~2"
if "!RESOLVED_DIR!"=="" goto :end
call :ensure_network
for %%N in ("!RESOLVED_DIR!") do set "APP_NAME=%%~nxN"
echo.
echo [manage] !APP_NAME! を再ビルドして起動します...
docker compose -f "!RESOLVED_DIR!\docker-compose.yml" up -d --build
echo [manage] !APP_NAME! のビルドが完了しました
goto :end

:: ============================================================
:: logs <app> - 指定アプリのログ表示
:: ============================================================
:cmd_logs
if "%~2"=="" (
    echo [ERROR] アプリ名を指定してください
    echo Usage: manage.bat logs ^<app-name^>
    call :show_apps
    goto :end
)
call :resolve_app "%~2"
if "!RESOLVED_DIR!"=="" goto :end
docker compose -f "!RESOLVED_DIR!\docker-compose.yml" logs -f
goto :end

:: ============================================================
:: status - 全アプリの状態表示
:: ============================================================
:cmd_status
call :cmd_status_inner
goto :end

:cmd_status_inner
echo.
echo ============================================================
echo   Tax Apps コンテナ状態
echo ============================================================
echo.
for /L %%I in (1,1,%APP_COUNT%) do call :do_status_app %%I
echo.
echo ============================================================
goto :eof

:: ============================================================
:: backup - 全データベース・データをバックアップ
:: ============================================================
:cmd_backup
echo.
echo ============================================================
echo   Tax Apps - Backup
echo ============================================================
echo.

for /f "usebackq delims=" %%A in (`powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd_HHmmss'"`) do set "TIMESTAMP=%%A"
set "BACKUP_DIR=%BACKUP_BASE%\%TIMESTAMP%"

echo Destination: %BACKUP_DIR%\
echo.

mkdir "%BACKUP_DIR%" 2>nul

set "BACKUP_OK=0"
set "BACKUP_FAIL=0"
set "BACKUP_SKIP=0"

:: --- 1/5 ITCM PostgreSQL (pg_dump) ---
echo [1/5] ITCM PostgreSQL ...

docker ps --filter "name=itcm-postgres" --filter "status=running" --format "{{.Names}}" 2>nul | findstr "itcm-postgres" >nul 2>&1
if !ERRORLEVEL! neq 0 goto :backup_itcm_volume

docker exec itcm-postgres pg_dump -U postgres -d inheritance_tax_db > "%BACKUP_DIR%\itcm-postgres.sql" 2>nul
if !ERRORLEVEL! equ 0 (
    echo [OK]    itcm-postgres.sql
    set /a BACKUP_OK+=1
) else (
    del "%BACKUP_DIR%\itcm-postgres.sql" 2>nul
    echo [WARN]  pg_dump failed, trying volume backup...
    goto :backup_itcm_volume
)
goto :backup_itcm_done

:backup_itcm_volume
docker volume inspect inheritance-case-management_postgres_data >nul 2>&1
if !ERRORLEVEL! neq 0 (
    echo [SKIP]  ITCM PostgreSQL volume not found
    set /a BACKUP_SKIP+=1
    goto :backup_itcm_done
)
echo [WARN]  Container stopped - backing up volume directly
docker run --rm -v inheritance-case-management_postgres_data:/data -v "%BACKUP_DIR%":/backup alpine tar czf /backup/itcm-postgres-volume.tar.gz -C /data . >nul 2>&1
if !ERRORLEVEL! equ 0 (
    echo [OK]    itcm-postgres-volume.tar.gz
    set /a BACKUP_OK+=1
) else (
    echo [ERROR] Volume backup failed
    set /a BACKUP_FAIL+=1
)

:backup_itcm_done

:: --- 2/5 Bank Analyzer PostgreSQL + pgvector (pg_dump) ---
echo [2/5] Bank Analyzer PostgreSQL ...

docker ps --filter "name=bank-analyzer-postgres" --filter "status=running" --format "{{.Names}}" 2>nul | findstr "bank-analyzer-postgres" >nul 2>&1
if !ERRORLEVEL! neq 0 goto :backup_bank_pg_volume

docker exec bank-analyzer-postgres pg_dump -U bankuser -d bank_analyzer > "%BACKUP_DIR%\bank-analyzer-postgres.sql" 2>nul
if !ERRORLEVEL! equ 0 (
    echo [OK]    bank-analyzer-postgres.sql
    set /a BACKUP_OK+=1
) else (
    del "%BACKUP_DIR%\bank-analyzer-postgres.sql" 2>nul
    echo [WARN]  pg_dump failed, trying volume backup...
    goto :backup_bank_pg_volume
)
goto :backup_bank_pg_done

:backup_bank_pg_volume
docker volume inspect bank-analyzer-postgres >nul 2>&1
if !ERRORLEVEL! neq 0 (
    echo [SKIP]  Bank Analyzer PostgreSQL volume not found
    set /a BACKUP_SKIP+=1
    goto :backup_bank_pg_done
)
echo [WARN]  Container stopped - backing up volume directly
docker run --rm -v bank-analyzer-postgres:/data -v "%BACKUP_DIR%":/backup alpine tar czf /backup/bank-analyzer-postgres-volume.tar.gz -C /data . >nul 2>&1
if !ERRORLEVEL! equ 0 (
    echo [OK]    bank-analyzer-postgres-volume.tar.gz
    set /a BACKUP_OK+=1
) else (
    echo [ERROR] Volume backup failed
    set /a BACKUP_FAIL+=1
)

:backup_bank_pg_done

:: --- 3/5 SQLite volumes ---
echo [3/5] SQLite volumes ...

set "SQLITE_OK=0"
set "SQLITE_SKIP=0"

call :do_backup_sqlite "bank-analyzer-sqlite" "bank-analyzer-sqlite"
call :do_backup_sqlite "tax-docs-data" "tax-docs-data"
call :do_backup_sqlite "medical-stock-valuation-data" "medical-stock-data"

if !SQLITE_OK! gtr 0 (
    echo [OK]    SQLite !SQLITE_OK! volumes
    set /a BACKUP_OK+=!SQLITE_OK!
)
if !SQLITE_OK! equ 0 if !SQLITE_SKIP! equ 3 (
    echo [SKIP]  No SQLite volumes found
    set /a BACKUP_SKIP+=1
)

:: --- 4/5 Upload data (bind mount) ---
echo [4/5] Upload data ...

set "BANK_DATA=%PROJECT_ROOT%\apps\bank-analyzer-django\data"
if exist "!BANK_DATA!" (
    mkdir "%BACKUP_DIR%\bank-analyzer-upload" 2>nul
    robocopy "!BANK_DATA!" "%BACKUP_DIR%\bank-analyzer-upload" /E /NFL /NDL /NJH /NJS >nul 2>&1
    if !ERRORLEVEL! lss 8 (
        echo [OK]    bank-analyzer-upload/
        set /a BACKUP_OK+=1
    ) else (
        echo [ERROR] bank-analyzer upload data copy failed
        set /a BACKUP_FAIL+=1
    )
) else (
    echo [SKIP]  bank-analyzer/data/ not found
    set /a BACKUP_SKIP+=1
)

:: --- 5/5 ITCM .env (credentials backup) ---
echo [5/5] Settings ...

set "ITCM_ENV=%PROJECT_ROOT%\apps\inheritance-case-management\.env"
if exist "!ITCM_ENV!" (
    copy "!ITCM_ENV!" "%BACKUP_DIR%\itcm-.env" >nul 2>&1
    echo [OK]    itcm-.env
    set /a BACKUP_OK+=1
) else (
    echo [SKIP]  ITCM .env not found
    set /a BACKUP_SKIP+=1
)

:: --- Summary ---
echo.

for /f "usebackq delims=" %%S in (`powershell -NoProfile -Command "$s = (Get-ChildItem -Path '%BACKUP_DIR%' -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum; if ($s -gt 1MB) { '{0:N1} MB' -f ($s/1MB) } elseif ($s -gt 1KB) { '{0:N1} KB' -f ($s/1KB) } else { '{0} bytes' -f $s }"`) do set "TOTAL_SIZE=%%S"

echo ============================================================
if !BACKUP_FAIL! equ 0 (
    echo   Backup Complete
) else (
    echo   Backup Complete (with errors^)
)
echo ============================================================
echo.
echo   Destination: %BACKUP_DIR%\
echo   Size: %TOTAL_SIZE%
echo   OK: !BACKUP_OK!  Skipped: !BACKUP_SKIP!  Failed: !BACKUP_FAIL!
echo.
if !BACKUP_OK! equ 0 (
    echo   [WARN]  No data was backed up. Removing empty directory.
    rmdir /s /q "%BACKUP_DIR%" 2>nul
) else (
    echo   To restore: manage.bat restore %TIMESTAMP%
)
echo.
goto :end

:: ============================================================
:: restore [dir] - バックアップからリストア
:: ============================================================
:cmd_restore
echo.
echo ============================================================
echo   Tax Apps - Restore
echo ============================================================
echo.

if not exist "%BACKUP_BASE%" (
    echo [ERROR] backups/ not found. Run: manage.bat backup
    goto :end
)

set "BACKUP_DIR="

if not "%~2"=="" (
    if exist "%BACKUP_BASE%\%~2" (
        set "BACKUP_DIR=%BACKUP_BASE%\%~2"
        goto :confirm_restore
    )
    echo [ERROR] %BACKUP_BASE%\%~2 not found.
    echo.
)

:: バックアップ一覧を表示
set "COUNT=0"
for /f "delims=" %%D in ('dir /b /ad /o-n "%BACKUP_BASE%\" 2^>nul') do (
    set /a COUNT+=1
    set "BACKUP_!COUNT!=%%D"
)

if !COUNT! equ 0 (
    echo [ERROR] No backups found. Run: manage.bat backup
    goto :end
)

echo Available backups:
echo.
for /L %%I in (1,1,!COUNT!) do call :do_show_backup %%I
echo.
echo   [0] Cancel
echo.

set /p "CHOICE=Select number: "

if "%CHOICE%"=="0" (
    echo Cancelled.
    goto :end
)

set /a CHOICE_NUM=%CHOICE% 2>nul
if !CHOICE_NUM! lss 1 (
    echo [ERROR] Invalid selection.
    goto :end
)
if !CHOICE_NUM! gtr !COUNT! (
    echo [ERROR] Invalid selection.
    goto :end
)

set "BACKUP_DIR=%BACKUP_BASE%\!BACKUP_%CHOICE_NUM%!"

:confirm_restore
echo Restore from: !BACKUP_DIR!\
echo.

:: バックアップ内容を表示
echo Contents:
dir /b "!BACKUP_DIR!" 2>nul
echo.

echo   [WARN] This will overwrite current data!
echo.
set /p "CONFIRM=Proceed? (Y/N): "
if /i not "!CONFIRM!"=="Y" (
    echo Cancelled.
    goto :end
)
echo.

set "RESTORE_OK=0"
set "RESTORE_FAIL=0"
set "RESTORE_SKIP=0"

:: --- 1/5 ITCM PostgreSQL ---
echo [1/5] ITCM PostgreSQL ...

if exist "!BACKUP_DIR!\itcm-postgres.sql" (
    docker ps --filter "name=itcm-postgres" --filter "status=running" --format "{{.Names}}" 2>nul | findstr "itcm-postgres" >nul 2>&1
    if !ERRORLEVEL! neq 0 (
        echo [ERROR] itcm-postgres container is not running.
        echo         Run: manage.bat restart inheritance-case-management
        set /a RESTORE_FAIL+=1
        goto :restore_itcm_done
    )
    docker exec itcm-postgres psql -U postgres -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='inheritance_tax_db' AND pid <> pg_backend_pid();" >nul 2>&1
    docker exec itcm-postgres psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS inheritance_tax_db;" >nul 2>&1
    docker exec itcm-postgres psql -U postgres -d postgres -c "CREATE DATABASE inheritance_tax_db;" >nul 2>&1
    docker exec -i itcm-postgres psql -U postgres -d inheritance_tax_db < "!BACKUP_DIR!\itcm-postgres.sql" >nul 2>&1
    if !ERRORLEVEL! equ 0 (
        echo [OK]    itcm-postgres.sql
        set /a RESTORE_OK+=1
    ) else (
        echo [ERROR] ITCM PostgreSQL restore failed
        set /a RESTORE_FAIL+=1
    )
) else if exist "!BACKUP_DIR!\itcm-postgres-volume.tar.gz" (
    echo [WARN]  Volume restore - container must be stopped
    docker volume inspect inheritance-case-management_postgres_data >nul 2>&1
    if !ERRORLEVEL! neq 0 (
        docker volume create inheritance-case-management_postgres_data >nul 2>&1
    )
    docker run --rm -v inheritance-case-management_postgres_data:/data -v "!BACKUP_DIR!":/backup alpine sh -c "cd /data && rm -rf * && tar xzf /backup/itcm-postgres-volume.tar.gz" >nul 2>&1
    if !ERRORLEVEL! equ 0 (
        echo [OK]    itcm-postgres-volume.tar.gz
        set /a RESTORE_OK+=1
    ) else (
        echo [ERROR] Volume restore failed
        set /a RESTORE_FAIL+=1
    )
) else (
    echo [SKIP]  Not in backup
    set /a RESTORE_SKIP+=1
)
:restore_itcm_done

:: --- 2/5 Bank Analyzer PostgreSQL ---
echo [2/5] Bank Analyzer PostgreSQL ...

if exist "!BACKUP_DIR!\bank-analyzer-postgres.sql" (
    docker ps --filter "name=bank-analyzer-postgres" --filter "status=running" --format "{{.Names}}" 2>nul | findstr "bank-analyzer-postgres" >nul 2>&1
    if !ERRORLEVEL! neq 0 (
        echo [ERROR] bank-analyzer-postgres container is not running.
        echo         Run: manage.bat restart bank-analyzer-django
        set /a RESTORE_FAIL+=1
        goto :restore_bank_pg_done
    )
    docker exec bank-analyzer-postgres psql -U bankuser -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='bank_analyzer' AND pid <> pg_backend_pid();" >nul 2>&1
    docker exec bank-analyzer-postgres psql -U bankuser -d postgres -c "DROP DATABASE IF EXISTS bank_analyzer;" >nul 2>&1
    docker exec bank-analyzer-postgres psql -U bankuser -d postgres -c "CREATE DATABASE bank_analyzer;" >nul 2>&1
    docker exec -i bank-analyzer-postgres psql -U bankuser -d bank_analyzer < "!BACKUP_DIR!\bank-analyzer-postgres.sql" >nul 2>&1
    if !ERRORLEVEL! equ 0 (
        echo [OK]    bank-analyzer-postgres.sql
        set /a RESTORE_OK+=1
    ) else (
        echo [ERROR] Bank Analyzer PostgreSQL restore failed
        set /a RESTORE_FAIL+=1
    )
) else if exist "!BACKUP_DIR!\bank-analyzer-postgres-volume.tar.gz" (
    echo [WARN]  Volume restore - container must be stopped
    docker volume inspect bank-analyzer-postgres >nul 2>&1
    if !ERRORLEVEL! neq 0 (
        docker volume create bank-analyzer-postgres >nul 2>&1
    )
    docker run --rm -v bank-analyzer-postgres:/data -v "!BACKUP_DIR!":/backup alpine sh -c "cd /data && rm -rf * && tar xzf /backup/bank-analyzer-postgres-volume.tar.gz" >nul 2>&1
    if !ERRORLEVEL! equ 0 (
        echo [OK]    bank-analyzer-postgres-volume.tar.gz
        set /a RESTORE_OK+=1
    ) else (
        echo [ERROR] Volume restore failed
        set /a RESTORE_FAIL+=1
    )
) else (
    echo [SKIP]  Not in backup
    set /a RESTORE_SKIP+=1
)
:restore_bank_pg_done

:: --- 3/5 SQLite volumes ---
echo [3/5] SQLite volumes ...

set "SQLITE_OK=0"

call :do_restore_sqlite "bank-analyzer-sqlite.tar.gz" "bank-analyzer-sqlite"
call :do_restore_sqlite "tax-docs-data.tar.gz" "tax-docs-data"
call :do_restore_sqlite "medical-stock-data.tar.gz" "medical-stock-valuation-data"

if !SQLITE_OK! gtr 0 (
    echo [OK]    SQLite !SQLITE_OK! volumes
    set /a RESTORE_OK+=!SQLITE_OK!
) else (
    echo [SKIP]  No SQLite backups found
    set /a RESTORE_SKIP+=1
)

:: --- 4/5 Upload data ---
echo [4/5] Upload data ...

if exist "!BACKUP_DIR!\bank-analyzer-upload" (
    set "BANK_DATA=%PROJECT_ROOT%\apps\bank-analyzer-django\data"
    mkdir "!BANK_DATA!" 2>nul
    robocopy "!BACKUP_DIR!\bank-analyzer-upload" "!BANK_DATA!" /E /NFL /NDL /NJH /NJS >nul 2>&1
    if !ERRORLEVEL! lss 8 (
        echo [OK]    bank-analyzer-upload/
        set /a RESTORE_OK+=1
    ) else (
        echo [ERROR] bank-analyzer upload data restore failed
        set /a RESTORE_FAIL+=1
    )
) else (
    echo [SKIP]  Not in backup
    set /a RESTORE_SKIP+=1
)

:: --- 5/5 Settings ---
echo [5/5] Settings ...

if exist "!BACKUP_DIR!\itcm-.env" (
    set "ITCM_ENV=%PROJECT_ROOT%\apps\inheritance-case-management\.env"
    copy "!BACKUP_DIR!\itcm-.env" "!ITCM_ENV!" >nul 2>&1
    echo [OK]    itcm-.env
    set /a RESTORE_OK+=1
) else (
    echo [SKIP]  Not in backup
    set /a RESTORE_SKIP+=1
)

:: --- Summary ---
echo.
echo ============================================================
if !RESTORE_FAIL! equ 0 (
    echo   Restore Complete
) else (
    echo   Restore Complete (with errors^)
)
echo ============================================================
echo.
echo   Source: !BACKUP_DIR!\
echo   OK: !RESTORE_OK!  Skipped: !RESTORE_SKIP!  Failed: !RESTORE_FAIL!
echo.
if !RESTORE_OK! gtr 0 (
    echo   [NOTE] Restart apps to apply restored data:
    echo     manage.bat restart inheritance-case-management
    echo     manage.bat restart bank-analyzer-django
    echo.
)
goto :end

:: ============================================================
:: clean - クリーンアップ
:: ============================================================
:cmd_clean
echo.
echo ============================================================
echo   Tax Apps - Clean Up
echo ============================================================
echo.
echo   * Backup recommendation: manage.bat backup
echo.

:: Step 1: コンテナ・イメージの削除
echo [Step 1] コンテナ・イメージの削除
echo.
echo   以下が削除されます:
echo     - 全コンテナ（停止中を含む）
echo     - ビルドされた Docker イメージ
echo.

set /p "CONFIRM1=  削除してよろしいですか？ (Y/N): "
if /i not "!CONFIRM1!"=="Y" (
    echo.
    echo キャンセルしました。
    goto :end
)

echo.
echo コンテナを停止・削除しています...

for /L %%I in (%APP_COUNT%,-1,1) do call :do_clean_app %%I

echo.
echo [OK]    コンテナ・イメージを削除しました

:: ネットワークの削除
docker network inspect %NETWORK_NAME% >nul 2>&1
if !ERRORLEVEL! equ 0 (
    docker network rm %NETWORK_NAME% >nul 2>&1
    echo [OK]    %NETWORK_NAME% を削除しました
)

:: Step 2: データボリュームの削除（オプション）
echo.
echo [Step 2] データボリュームの削除
echo.
echo   以下のデータが完全に削除されます（復元できません）:
echo.
echo     inheritance-case-management_postgres_data   ITCM PostgreSQL
echo     bank-analyzer-postgres                      銀行分析 PostgreSQL
echo     bank-analyzer-sqlite                        銀行分析 SQLite
echo     tax-docs-data                               確定申告書類 SQLite
echo     medical-stock-valuation-data                医療法人株式 SQLite
echo.

set /p "CONFIRM2=  本当に削除してよろしいですか？ (Y/N): "
if /i not "!CONFIRM2!"=="Y" (
    echo.
    echo データの削除をスキップしました。
    echo コンテナ・イメージのみ削除済みです。
    goto :clean_done
)

echo.
echo データボリュームを削除しています...

call :do_clean_volume "inheritance-case-management_postgres_data"
call :do_clean_volume "bank-analyzer-postgres"
call :do_clean_volume "bank-analyzer-sqlite"
call :do_clean_volume "tax-docs-data"
call :do_clean_volume "medical-stock-valuation-data"

echo.
echo [OK]    データボリュームを削除しました

:clean_done
echo.
echo ============================================================
echo   Clean Up Complete
echo ============================================================
echo.
echo   再セットアップ: manage.bat start
echo.
goto :end

:: ============================================================
:: preflight - 起動前環境チェック
:: ============================================================
:cmd_preflight
set "PF_OK=0"
set "PF_WARN=0"
set "PF_ERR=0"

echo.
echo ============================================================
echo   Tax Apps - Preflight Check
echo ============================================================
echo.

:: 1. Docker Desktop
docker info >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Docker Desktop is not running
    echo         Please start Docker Desktop and try again.
    set /a PF_ERR+=1
    goto :preflight_summary
) else (
    echo [OK]    Docker Desktop is running
    set /a PF_OK+=1
)

:: 2. docker compose
docker compose version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] docker compose command not available
    echo         Please install Docker Compose V2.
    set /a PF_ERR+=1
    goto :preflight_summary
) else (
    echo [OK]    docker compose is available
    set /a PF_OK+=1
)

:: 3. Compose files exist
set "COMPOSE_FOUND=0"
set "COMPOSE_MISSING=0"
for /L %%I in (1,1,%APP_COUNT%) do call :do_preflight_compose %%I
if !COMPOSE_MISSING! equ 0 (
    echo [OK]    All !COMPOSE_FOUND! docker-compose.yml files present
    set /a PF_OK+=1
)

:: 4. Nginx configs
set "NGINX_OK=1"
call :do_preflight_nginx "nginx\nginx.conf"
call :do_preflight_nginx "nginx\default.conf"
call :do_preflight_nginx "nginx\includes\upstreams.conf"
call :do_preflight_nginx "nginx\includes\maps.conf"
if "!NGINX_OK!"=="1" (
    echo [OK]    Nginx config files present
    set /a PF_OK+=1
)

:: 5. ITCM .env
set "ITCM_ENV=%PROJECT_ROOT%\apps\inheritance-case-management\.env"
if not exist "!ITCM_ENV!" (
    if exist "%PROJECT_ROOT%\apps\inheritance-case-management\.env.example" (
        echo [WARN]  ITCM .env not found. Copy from .env.example:
        echo         copy .env.example .env
        set /a PF_WARN+=1
    ) else (
        echo [WARN]  ITCM .env not found
        set /a PF_WARN+=1
    )
) else (
    echo [OK]    ITCM .env file exists
    set /a PF_OK+=1
)

:: 6. Port conflicts
set "PORT_CONFLICT=0"
for /f "tokens=*" %%L in ('powershell -NoProfile -Command "$ports = @(80,3000,3001,3002,3003,3004,3005,3006,3007,3010,3012,3013,3020,3022,5173); $lines = netstat -ano 2>$null; foreach ($p in $ports) { foreach ($l in $lines) { if ($l -match 'LISTENING' -and $l -match \":$p\s\") { Write-Output $p; break } } }"') do call :do_preflight_port %%L
if "!PORT_CONFLICT!"=="0" (
    echo [OK]    No port conflicts detected
    set /a PF_OK+=1
)

:: 7. Disk space
set "DRIVE=%~d0"
for /f "usebackq delims=" %%R in (`powershell -NoProfile -Command "$d = Get-PSDrive -Name '%DRIVE:~0,1%' -ErrorAction SilentlyContinue; if ($d) { if ($d.Free -lt 5GB) { 'LOW' } else { 'OK' } } else { 'UNKNOWN' }"`) do set "DISK_RESULT=%%R"

if "!DISK_RESULT!"=="LOW" (
    echo [WARN]  Low disk space on %DRIVE% ^(less than 5GB free^)
    set /a PF_WARN+=1
) else if "!DISK_RESULT!"=="OK" (
    echo [OK]    Disk space OK on %DRIVE%
    set /a PF_OK+=1
) else (
    echo [WARN]  Could not determine disk space
    set /a PF_WARN+=1
)

:: Summary
:preflight_summary
echo.
echo ============================================================
echo   Results:  OK=!PF_OK!  WARN=!PF_WARN!  ERROR=!PF_ERR!
echo ============================================================

if !PF_ERR! gtr 0 (
    echo.
    echo Errors detected. Please fix them before starting.
) else if !PF_WARN! gtr 0 (
    echo.
    echo Warnings detected but no blocking errors.
) else (
    echo.
    echo All checks passed!
)
echo.
goto :end

:: ============================================================
:: for ループ用サブルーチン
:: ============================================================

:: --- アプリ起動 ---
:do_start_app
set "APP_PATH=!APP_%1!"
set "COMPOSE_FILE=%PROJECT_ROOT%\!APP_PATH!\docker-compose.yml"
if not exist "!COMPOSE_FILE!" (
    for %%N in ("!APP_PATH!") do echo [WARN]    スキップ: %%~nxN
    goto :eof
)
for %%N in ("!APP_PATH!") do set "APP_NAME=%%~nxN"
:: .env.example があり .env がない場合は自動作成
set "APP_DIR=%PROJECT_ROOT%\!APP_PATH!"
if exist "!APP_DIR!\.env.example" (
    if not exist "!APP_DIR!\.env" (
        copy "!APP_DIR!\.env.example" "!APP_DIR!\.env" >nul
        echo [manage]   .env を作成しました: !APP_NAME!
    )
)
if "!PROD_MODE!"=="1" (
    set "PROD_COMPOSE=%PROJECT_ROOT%\!APP_PATH!\docker-compose.prod.yml"
    if exist "!PROD_COMPOSE!" (
        echo [manage]   起動[本番]: !APP_NAME!
        docker compose -f "!COMPOSE_FILE!" -f "!PROD_COMPOSE!" up -d --build
    ) else (
        echo [manage]   起動[本番]: !APP_NAME!
        docker compose -f "!COMPOSE_FILE!" up -d --build
    )
) else (
    echo [manage]   起動: !APP_NAME!
    docker compose -f "!COMPOSE_FILE!" up -d
)
if !ERRORLEVEL! neq 0 echo [ERROR]   !APP_NAME! の起動に失敗しました
goto :eof

:: --- アプリ停止 ---
:do_stop_app
set "APP_PATH=!APP_%1!"
set "COMPOSE_FILE=%PROJECT_ROOT%\!APP_PATH!\docker-compose.yml"
if not exist "!COMPOSE_FILE!" goto :eof
for %%N in ("!APP_PATH!") do set "APP_NAME=%%~nxN"
echo [manage]   停止: !APP_NAME!
docker compose -f "!COMPOSE_FILE!" stop
goto :eof

:: --- アプリ停止・削除 ---
:do_down_app
set "APP_PATH=!APP_%1!"
set "COMPOSE_FILE=%PROJECT_ROOT%\!APP_PATH!\docker-compose.yml"
if not exist "!COMPOSE_FILE!" goto :eof
for %%N in ("!APP_PATH!") do set "APP_NAME=%%~nxN"
echo [manage]   削除: !APP_NAME!
docker compose -f "!COMPOSE_FILE!" down
goto :eof

:: --- アプリ状態表示 ---
:do_status_app
set "APP_PATH=!APP_%1!"
set "COMPOSE_FILE=%PROJECT_ROOT%\!APP_PATH!\docker-compose.yml"
if not exist "!COMPOSE_FILE!" goto :eof
for /f "tokens=*" %%L in ('docker compose -f "!COMPOSE_FILE!" ps --format "{{.Name}}	{{.Status}}	{{.Ports}}" 2^>nul') do echo   %%L
goto :eof

:: --- アプリクリーン ---
:do_clean_app
set "APP_PATH=!APP_%1!"
set "COMPOSE_FILE=%PROJECT_ROOT%\!APP_PATH!\docker-compose.yml"
if not exist "!COMPOSE_FILE!" goto :eof
for %%N in ("!APP_PATH!") do set "APP_NAME=%%~nxN"
echo   削除: !APP_NAME!
docker compose -f "!COMPOSE_FILE!" down --rmi local --remove-orphans 2>nul
goto :eof

:: --- ボリューム削除 ---
:do_clean_volume
docker volume inspect %~1 >nul 2>&1
if !ERRORLEVEL! neq 0 goto :eof
docker volume rm %~1 >nul 2>&1
if !ERRORLEVEL! equ 0 (
    echo   [OK] %~1
) else (
    echo   [ERROR] %~1 の削除に失敗しました
)
goto :eof

:: --- SQLiteバックアップ ---
:do_backup_sqlite
:: %1 = volume name, %2 = backup filename (without .tar.gz)
docker volume inspect %~1 >nul 2>&1
if !ERRORLEVEL! neq 0 (
    set /a SQLITE_SKIP+=1
    goto :eof
)
docker run --rm -v %~1:/data -v "!BACKUP_DIR!":/backup alpine tar czf /backup/%~2.tar.gz -C /data . >nul 2>&1
if !ERRORLEVEL! equ 0 (
    set /a SQLITE_OK+=1
) else (
    echo [ERROR] %~1 backup failed
    set /a BACKUP_FAIL+=1
)
goto :eof

:: --- SQLiteリストア ---
:do_restore_sqlite
:: %1 = backup filename (with .tar.gz), %2 = volume name
if not exist "!BACKUP_DIR!\%~1" goto :eof
docker volume inspect %~2 >nul 2>&1
if !ERRORLEVEL! neq 0 docker volume create %~2 >nul 2>&1
docker run --rm -v %~2:/data -v "!BACKUP_DIR!":/backup alpine sh -c "cd /data && rm -rf * && tar xzf /backup/%~1" >nul 2>&1
if !ERRORLEVEL! equ 0 (
    set /a SQLITE_OK+=1
) else (
    set /a RESTORE_FAIL+=1
)
goto :eof

:: --- Preflight: compose ファイルチェック ---
:do_preflight_compose
set "APP_PATH=!APP_%1!"
if exist "%PROJECT_ROOT%\!APP_PATH!\docker-compose.yml" (
    set /a COMPOSE_FOUND+=1
) else (
    for %%N in ("!APP_PATH!") do echo [WARN]  Missing: %%~nxN/docker-compose.yml
    set /a COMPOSE_MISSING+=1
    set /a PF_WARN+=1
)
goto :eof

:: --- Preflight: nginx ファイルチェック ---
:do_preflight_nginx
if not exist "%PROJECT_ROOT%\%~1" (
    echo [WARN]  Missing: %~1
    set "NGINX_OK=0"
    set /a PF_WARN+=1
)
goto :eof

:: --- Preflight: ポートチェック ---
:do_preflight_port
echo [WARN]  Port %1 is already in use
set "PORT_CONFLICT=1"
set /a PF_WARN+=1
goto :eof

:: --- バックアップ一覧表示 ---
:do_show_backup
set "BK_NAME=!BACKUP_%1!"
for /f "usebackq delims=" %%S in (`powershell -NoProfile -Command "$s = (Get-ChildItem -Path '%BACKUP_BASE%\!BK_NAME!' -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum; if ($s -gt 1MB) { '{0:N1} MB' -f ($s/1MB) } elseif ($s -gt 1KB) { '{0:N1} KB' -f ($s/1KB) } else { '{0} bytes' -f $s }"`) do echo   [%1] !BK_NAME!  (%%S)
goto :eof

:: --- アプリ名表示 ---
:do_show_app
set "APP_PATH=!APP_%1!"
for %%N in ("!APP_PATH!") do echo   %%~nxN
goto :eof

:: ============================================================
:: ユーティリティ関数
:: ============================================================

:: --- ネットワーク作成 ---
:ensure_network
docker network inspect %NETWORK_NAME% >nul 2>&1
if !ERRORLEVEL! neq 0 (
    echo [manage] ネットワーク %NETWORK_NAME% を作成...
    docker network create %NETWORK_NAME% >nul 2>&1
)
goto :eof

:: --- アプリ名からディレクトリを解決 ---
:resolve_app
set "RESOLVED_DIR="
set "SEARCH=%~1"
for /L %%I in (1,1,%APP_COUNT%) do call :do_resolve_check %%I
if "!RESOLVED_DIR!"=="" (
    echo [ERROR] アプリが見つかりません: !SEARCH!
    call :show_apps
)
goto :eof

:do_resolve_check
if defined RESOLVED_DIR goto :eof
set "APP_PATH=!APP_%1!"
echo !APP_PATH! | findstr /i "!SEARCH!" >nul 2>&1
if !ERRORLEVEL! equ 0 set "RESOLVED_DIR=%PROJECT_ROOT%\!APP_PATH!"
goto :eof

:: --- アプリ一覧表示 ---
:show_apps
echo.
echo Available apps:
for /L %%I in (1,1,%APP_COUNT%) do call :do_show_app %%I
goto :eof

:: --- 簡易 preflight（Docker起動チェックのみ） ---
:preflight_quick
docker info >nul 2>&1
if !ERRORLEVEL! neq 0 (
    echo [ERROR] Docker Desktop is not running.
    exit /b 1
)
exit /b 0

:: ============================================================
:: ヘルプ表示
:: ============================================================
:show_help
echo.
echo ============================================================
echo   Tax Apps - Container Management
echo ============================================================
echo.
echo Usage: manage.bat ^<command^> [app-name]
echo.
echo Commands:
echo   start              全アプリを起動（ネットワーク自動作成）
echo   start --prod       全アプリを本番モードで起動
echo   stop               全アプリを停止
echo   down               全アプリを停止してコンテナ削除
echo   restart ^<app^>      指定アプリのみ再起動
echo   build ^<app^>        指定アプリを再ビルドして起動
echo   logs ^<app^>         指定アプリのログ表示
echo   status             全アプリの状態表示
echo.
echo Operations:
echo   backup             全データベース・データをバックアップ
echo   restore [dir]      バックアップからリストア
echo   clean              コンテナ・イメージのクリーンアップ
echo   preflight          起動前環境チェック
echo.
echo Apps:
for /L %%I in (1,1,%APP_COUNT%) do call :do_show_app %%I
echo.
goto :end

:: ============================================================
:: 終了
:: ============================================================
:end
endlocal
