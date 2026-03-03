# manage.bat functional update script
# Reads Shift-JIS, applies functional changes, writes back as Shift-JIS

$sjis = [System.Text.Encoding]::GetEncoding(932)
$bytes = [System.IO.File]::ReadAllBytes("$PSScriptRoot\manage.bat")
$text = $sjis.GetString($bytes)
$text = $text -replace "`r`n", "`n"

$n = [char]10
$miss = 0

# =====================================================
# 1. App list: gateway を最後（APP_11）に移動
# =====================================================
$old = @(
    'set "APP_COUNT=11"',
    'set "APP_1=docker\gateway"',
    'set "APP_2=apps\inheritance-case-management"',
    'set "APP_3=apps\bank-analyzer-django"',
    'set "APP_4=apps\Required-documents-for-tax-return"',
    'set "APP_5=apps\medical-stock-valuation"',
    'set "APP_6=apps\shares-valuation"',
    'set "APP_7=apps\inheritance-tax-app"',
    'set "APP_8=apps\gift-tax-simulator"',
    'set "APP_9=apps\gift-tax-docs"',
    'set "APP_10=apps\inheritance-tax-docs"',
    'set "APP_11=apps\retirement-tax-calc"'
) -join $n
$new = @(
    'set "APP_COUNT=11"',
    'set "APP_1=apps\inheritance-case-management"',
    'set "APP_2=apps\bank-analyzer-django"',
    'set "APP_3=apps\Required-documents-for-tax-return"',
    'set "APP_4=apps\medical-stock-valuation"',
    'set "APP_5=apps\shares-valuation"',
    'set "APP_6=apps\inheritance-tax-app"',
    'set "APP_7=apps\gift-tax-simulator"',
    'set "APP_8=apps\gift-tax-docs"',
    'set "APP_9=apps\inheritance-tax-docs"',
    'set "APP_10=apps\retirement-tax-calc"',
    'set "APP_11=docker\gateway"'
) -join $n
if ($text.Contains($old)) { $text = $text.Replace($old, $new); Write-Host "[OK]   app list" }
else { Write-Host "[MISS] app list"; $miss++ }

# =====================================================
# 2. App list comment
# =====================================================
$old = ':: gateway は最初、DB依存アプリは DB→App の順'
$new = ':: gateway は最後（upstreamから始める必要がある）、DBなしアプリ→ DB+App の順'
if ($text.Contains($old)) { $text = $text.Replace($old, $new); Write-Host "[OK]   app list comment" }
else { Write-Host "[MISS] app list comment"; $miss++ }

# =====================================================
# 3. cmd_restart: inline validation → require_app_arg
# =====================================================
$old = @(
    ':cmd_restart',
    'if "%~2"=="" (',
    '    echo [ERROR] アプリ名を指定してください',
    '    echo Usage: manage.bat restart ^<app-name^>',
    '    call :show_apps',
    '    goto :end',
    ')',
    'call :resolve_app "%~2"',
    'if "!RESOLVED_DIR!"=="" goto :end',
    'call :ensure_network',
    'for %%N in ("!RESOLVED_DIR!") do set "APP_NAME=%%~nxN"',
    'echo.',
    'echo [manage] !APP_NAME! を再起動します...',
    'docker compose -f "!RESOLVED_DIR!\docker-compose.yml" restart',
    'echo [manage] !APP_NAME! を再起動しました',
    'goto :end'
) -join $n
$new = @(
    ':cmd_restart',
    'set "APP_CMD_ARG=%~2"',
    'call :require_app_arg "restart"',
    'if !ERRORLEVEL! neq 0 goto :end',
    'call :ensure_network',
    'echo.',
    'echo [manage] !APP_NAME! を再起動します...',
    'docker compose -f "!RESOLVED_DIR!\docker-compose.yml" restart',
    'echo [manage] !APP_NAME! を再起動しました',
    'goto :end'
) -join $n
if ($text.Contains($old)) { $text = $text.Replace($old, $new); Write-Host "[OK]   cmd_restart" }
else { Write-Host "[MISS] cmd_restart"; $miss++ }

# =====================================================
# 4. cmd_build: inline validation → require_app_arg
# =====================================================
$old = @(
    ':cmd_build',
    'if "%~2"=="" (',
    '    echo [ERROR] アプリ名を指定してください',
    '    echo Usage: manage.bat build ^<app-name^>',
    '    call :show_apps',
    '    goto :end',
    ')',
    'call :resolve_app "%~2"',
    'if "!RESOLVED_DIR!"=="" goto :end',
    'call :ensure_network',
    'for %%N in ("!RESOLVED_DIR!") do set "APP_NAME=%%~nxN"',
    'echo.',
    'echo [manage] !APP_NAME! を再ビルドして起動します...',
    'docker compose -f "!RESOLVED_DIR!\docker-compose.yml" up -d --build',
    'echo [manage] !APP_NAME! のビルドが完了しました',
    'goto :end'
) -join $n
$new = @(
    ':cmd_build',
    'set "APP_CMD_ARG=%~2"',
    'call :require_app_arg "build"',
    'if !ERRORLEVEL! neq 0 goto :end',
    'call :ensure_network',
    'echo.',
    'echo [manage] !APP_NAME! を再ビルドして起動します...',
    'docker compose -f "!RESOLVED_DIR!\docker-compose.yml" up -d --build',
    'echo [manage] !APP_NAME! のビルドが完了しました',
    'goto :end'
) -join $n
if ($text.Contains($old)) { $text = $text.Replace($old, $new); Write-Host "[OK]   cmd_build" }
else { Write-Host "[MISS] cmd_build"; $miss++ }

# =====================================================
# 5. cmd_logs: inline validation → require_app_arg
# =====================================================
$old = @(
    ':cmd_logs',
    'if "%~2"=="" (',
    '    echo [ERROR] アプリ名を指定してください',
    '    echo Usage: manage.bat logs ^<app-name^>',
    '    call :show_apps',
    '    goto :end',
    ')',
    'call :resolve_app "%~2"',
    'if "!RESOLVED_DIR!"=="" goto :end',
    'docker compose -f "!RESOLVED_DIR!\docker-compose.yml" logs -f',
    'goto :end'
) -join $n
$new = @(
    ':cmd_logs',
    'set "APP_CMD_ARG=%~2"',
    'call :require_app_arg "logs"',
    'if !ERRORLEVEL! neq 0 goto :end',
    'docker compose -f "!RESOLVED_DIR!\docker-compose.yml" logs -f',
    'goto :end'
) -join $n
if ($text.Contains($old)) { $text = $text.Replace($old, $new); Write-Host "[OK]   cmd_logs" }
else { Write-Host "[MISS] cmd_logs"; $miss++ }

# =====================================================
# 6. cmd_backup size: inline PS → format_dir_size
# =====================================================
$old = 'for /f "usebackq delims=" %%S in (`powershell -NoProfile -Command "$s = (Get-ChildItem -Path ''%BACKUP_DIR%'' -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum; if ($s -gt 1MB) { ''{0:N1} MB'' -f ($s/1MB) } elseif ($s -gt 1KB) { ''{0:N1} KB'' -f ($s/1KB) } else { ''{0} bytes'' -f $s }"`) do set "TOTAL_SIZE=%%S"'
$new = @(
    'call :format_dir_size "!BACKUP_DIR!"',
    'set "TOTAL_SIZE=!DIR_SIZE_RESULT!"'
) -join $n
if ($text.Contains($old)) { $text = $text.Replace($old, $new); Write-Host "[OK]   cmd_backup size" }
else { Write-Host "[MISS] cmd_backup size"; $miss++ }

# =====================================================
# 7. do_start_app: header + inline block → init_app_vars
# =====================================================
$old = @(
    ':: ============================================================',
    ':: for ループ用サブルーチン',
    ':: ============================================================',
    '',
    ':: --- アプリ起動 ---',
    ':do_start_app',
    'set "APP_PATH=!APP_%1!"',
    'set "COMPOSE_FILE=%PROJECT_ROOT%\!APP_PATH!\docker-compose.yml"',
    'if not exist "!COMPOSE_FILE!" (',
    '    for %%N in ("!APP_PATH!") do echo [WARN]    スキップ: %%~nxN',
    '    goto :eof',
    ')',
    'for %%N in ("!APP_PATH!") do set "APP_NAME=%%~nxN"'
) -join $n
$new = @(
    ':: ============================================================',
    ':: for ループ用サブルーチン',
    ':: ============================================================',
    '',
    ':: --- アプリ起動 ---',
    ':do_start_app',
    'call :init_app_vars %1',
    'if !ERRORLEVEL! neq 0 (',
    '    for %%N in ("!APP_PATH!") do echo [WARN]    スキップ: %%~nxN',
    '    goto :eof',
    ')'
) -join $n
if ($text.Contains($old)) { $text = $text.Replace($old, $new); Write-Host "[OK]   do_start_app" }
else { Write-Host "[MISS] do_start_app"; $miss++ }

# =====================================================
# 8. do_stop_app: inline block → init_app_vars
# =====================================================
$old = @(
    ':: --- アプリ停止 ---',
    ':do_stop_app',
    'set "APP_PATH=!APP_%1!"',
    'set "COMPOSE_FILE=%PROJECT_ROOT%\!APP_PATH!\docker-compose.yml"',
    'if not exist "!COMPOSE_FILE!" goto :eof',
    'for %%N in ("!APP_PATH!") do set "APP_NAME=%%~nxN"',
    'echo [manage]   停止: !APP_NAME!'
) -join $n
$new = @(
    ':: --- アプリ停止 ---',
    ':do_stop_app',
    'call :init_app_vars %1',
    'if !ERRORLEVEL! neq 0 goto :eof',
    'echo [manage]   停止: !APP_NAME!'
) -join $n
if ($text.Contains($old)) { $text = $text.Replace($old, $new); Write-Host "[OK]   do_stop_app" }
else { Write-Host "[MISS] do_stop_app"; $miss++ }

# =====================================================
# 9. do_down_app: inline block → init_app_vars
# =====================================================
$old = @(
    ':: --- アプリ停止・削除 ---',
    ':do_down_app',
    'set "APP_PATH=!APP_%1!"',
    'set "COMPOSE_FILE=%PROJECT_ROOT%\!APP_PATH!\docker-compose.yml"',
    'if not exist "!COMPOSE_FILE!" goto :eof',
    'for %%N in ("!APP_PATH!") do set "APP_NAME=%%~nxN"',
    'echo [manage]   削除: !APP_NAME!'
) -join $n
$new = @(
    ':: --- アプリ停止・削除 ---',
    ':do_down_app',
    'call :init_app_vars %1',
    'if !ERRORLEVEL! neq 0 goto :eof',
    'echo [manage]   削除: !APP_NAME!'
) -join $n
if ($text.Contains($old)) { $text = $text.Replace($old, $new); Write-Host "[OK]   do_down_app" }
else { Write-Host "[MISS] do_down_app"; $miss++ }

# =====================================================
# 10. do_status_app: inline block → init_app_vars
# =====================================================
$old = @(
    ':: --- アプリ状態表示 ---',
    ':do_status_app',
    'set "APP_PATH=!APP_%1!"',
    'set "COMPOSE_FILE=%PROJECT_ROOT%\!APP_PATH!\docker-compose.yml"',
    'if not exist "!COMPOSE_FILE!" goto :eof',
    'for /f "tokens=*" %%L in'
) -join $n
$new = @(
    ':: --- アプリ状態表示 ---',
    ':do_status_app',
    'call :init_app_vars %1',
    'if !ERRORLEVEL! neq 0 goto :eof',
    'for /f "tokens=*" %%L in'
) -join $n
if ($text.Contains($old)) { $text = $text.Replace($old, $new); Write-Host "[OK]   do_status_app" }
else { Write-Host "[MISS] do_status_app"; $miss++ }

# =====================================================
# 11. do_clean_app: inline block → init_app_vars
# =====================================================
$old = @(
    ':: --- アプリクリーン ---',
    ':do_clean_app',
    'set "APP_PATH=!APP_%1!"',
    'set "COMPOSE_FILE=%PROJECT_ROOT%\!APP_PATH!\docker-compose.yml"',
    'if not exist "!COMPOSE_FILE!" goto :eof',
    'for %%N in ("!APP_PATH!") do set "APP_NAME=%%~nxN"',
    'echo   削除: !APP_NAME!'
) -join $n
$new = @(
    ':: --- アプリクリーン ---',
    ':do_clean_app',
    'call :init_app_vars %1',
    'if !ERRORLEVEL! neq 0 goto :eof',
    'echo   削除: !APP_NAME!'
) -join $n
if ($text.Contains($old)) { $text = $text.Replace($old, $new); Write-Host "[OK]   do_clean_app" }
else { Write-Host "[MISS] do_clean_app"; $miss++ }

# =====================================================
# 12. do_show_backup: inline PS → format_dir_size
# =====================================================
$old = @(
    ':do_show_backup',
    'set "BK_NAME=!BACKUP_%1!"',
    'for /f "usebackq delims=" %%S in (`powershell -NoProfile -Command "$s = (Get-ChildItem -Path ''%BACKUP_BASE%\!BK_NAME!'' -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum; if ($s -gt 1MB) { ''{0:N1} MB'' -f ($s/1MB) } elseif ($s -gt 1KB) { ''{0:N1} KB'' -f ($s/1KB) } else { ''{0} bytes'' -f $s }"`) do echo   [%1] !BK_NAME!  (%%S)',
    'goto :eof'
) -join $n
$new = @(
    ':do_show_backup',
    'set "BK_NAME=!BACKUP_%1!"',
    'call :format_dir_size "%BACKUP_BASE%\!BK_NAME!"',
    'echo   [%1] !BK_NAME!  (!DIR_SIZE_RESULT!)',
    'goto :eof'
) -join $n
if ($text.Contains($old)) { $text = $text.Replace($old, $new); Write-Host "[OK]   do_show_backup" }
else { Write-Host "[MISS] do_show_backup"; $miss++ }

# =====================================================
# 13. Utility section: add new subroutines before :ensure_network
# =====================================================
$old = @(
    ':: ============================================================',
    ':: ユーティリティ関数',
    ':: ============================================================',
    '',
    ':: --- ネットワーク作成 ---',
    ':ensure_network'
) -join $n
$new = @(
    ':: ============================================================',
    ':: ユーティリティ関数',
    ':: ============================================================',
    '',
    ':: --- 単一アプリコマンド前処理 ---',
    ':require_app_arg',
    ':: %1=command_name  Validates APP_CMD_ARG, resolves app, sets RESOLVED_DIR and APP_NAME',
    'if "!APP_CMD_ARG!"=="" (',
    '    echo [ERROR] アプリを指定してください',
    '    echo Usage: manage.bat %~1 ^<app-name^>',
    '    call :show_apps',
    '    exit /b 1',
    ')',
    'call :resolve_app "!APP_CMD_ARG!"',
    'if "!RESOLVED_DIR!"=="" exit /b 1',
    'for %%N in ("!RESOLVED_DIR!") do set "APP_NAME=%%~nxN"',
    'exit /b 0',
    '',
    ':: --- アプリ変数初期化 ---',
    ':init_app_vars',
    ':: %1=app_index  Sets: APP_PATH, COMPOSE_FILE, APP_NAME. Returns ERRORLEVEL 1 if compose not found.',
    'set "APP_PATH=!APP_%1!"',
    'set "COMPOSE_FILE=%PROJECT_ROOT%\!APP_PATH!\docker-compose.yml"',
    'if not exist "!COMPOSE_FILE!" exit /b 1',
    'for %%N in ("!APP_PATH!") do set "APP_NAME=%%~nxN"',
    'exit /b 0',
    '',
    ':: --- ディレクトリサイズフォーマット ---',
    ':format_dir_size',
    ':: %1=directory_path  Sets: DIR_SIZE_RESULT',
    'for /f "usebackq delims=" %%S in (`powershell -NoProfile -Command "$s = (Get-ChildItem -Path ''%~1'' -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum; if ($s -gt 1MB) { ''{0:N1} MB'' -f ($s/1MB) } elseif ($s -gt 1KB) { ''{0:N1} KB'' -f ($s/1KB) } else { ''{0} bytes'' -f $s }"`) do set "DIR_SIZE_RESULT=%%S"',
    'goto :eof',
    '',
    ':: --- ネットワーク作成 ---',
    ':ensure_network'
) -join $n
if ($text.Contains($old)) { $text = $text.Replace($old, $new); Write-Host "[OK]   utility subroutines" }
else { Write-Host "[MISS] utility subroutines"; $miss++ }

# =====================================================
# 書き込み: Shift-JIS + CRLF
# =====================================================
$text = $text -replace "`n", "`r`n"
$outBytes = $sjis.GetBytes($text)
[System.IO.File]::WriteAllBytes("$PSScriptRoot\manage.bat", $outBytes)

Write-Host ""
if ($miss -eq 0) {
    Write-Host "Done. All replacements applied. Lines: $($text.Split("`n").Count)"
} else {
    Write-Host "Done with $miss misses. Lines: $($text.Split("`n").Count)"
}
