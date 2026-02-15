@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

cd /d "%~dp0"

:: ──────────────────────────────────────────────────────────────
:: ヘルプ表示
:: ──────────────────────────────────────────────────────────────
if /i "%~1"=="--help" goto :show_help
if /i "%~1"=="-h" goto :show_help
goto :main

:show_help
echo.
echo ============================================================
echo   Tax Apps - Clean Up
echo ============================================================
echo.
echo Usage: clean.bat [--help]
echo.
echo Description:
echo   Tax Apps の完全クリーンアップを行います。
echo   二段階の確認プロンプトで安全に削除できます。
echo.
echo Step 1 ^(必須^):
echo   - 全 Docker コンテナの停止・削除
echo   - ビルドされた Docker イメージの削除
echo   - tax-apps-network の削除
echo.
echo Step 2 ^(オプション^):
echo   - data/ 配下の全データ削除
echo   - PostgreSQL, SQLite, アップロードファイル
echo.
echo Options:
echo   --help, -h    Show this help
echo.
echo Note:
echo   事前に backup.bat でバックアップを取得することを推奨します。
echo.
pause
exit /b 0

:main
echo.
echo ============================================================
echo   Tax Apps - Clean Up
echo ============================================================
echo.

echo   ※ データのバックアップは backup.bat で取得できます
echo.

:: ──────────────────────────────────────────────────────────────
:: Step 1. コンテナ・イメージ・ネットワークの削除
:: ──────────────────────────────────────────────────────────────
echo [Step 1] コンテナ・イメージ・ネットワークの削除
echo.
echo   以下が削除されます:
echo     - 全コンテナ（停止中を含む）
echo     - ビルドされたDockerイメージ
echo     - tax-apps-network
echo.

set /p CONFIRM1="  削除してよろしいですか？ (Y/N): "
if /i not "!CONFIRM1!"=="Y" (
    echo.
    echo キャンセルしました。
    pause
    exit /b 0
)

echo.
echo コンテナを停止・削除しています...
docker compose down --rmi local --remove-orphans 2>nul

if %ERRORLEVEL% neq 0 (
    echo [WARN]  docker compose down に失敗しました（Docker未起動の可能性）
) else (
    echo [OK]    コンテナ・イメージ・ネットワークを削除しました
)

:: ──────────────────────────────────────────────────────────────
:: Step 2. データディレクトリの削除
:: ──────────────────────────────────────────────────────────────
echo.
echo ============================================================
echo.
echo [Step 2] データディレクトリの削除
echo.

if not exist "data" (
    echo   data/ ディレクトリは存在しません。スキップします。
    goto :done
)

echo   以下のデータが完全に削除されます（復元できません）:
echo.
echo     data/postgres/              ITCM PostgreSQL データベース
echo     data/tax-docs/              確定申告書類 SQLite
echo     data/medical-stock/         医療法人株式 SQLite
echo     data/bank-analyzer/data/    アップロードデータ
echo     data/bank-analyzer/db/      銀行分析 SQLite
echo     data/bank-analyzer/postgres/ 銀行分析 PostgreSQL + pgvector
echo.

set /p CONFIRM2="  本当に削除してよろしいですか？ (Y/N): "
if /i not "!CONFIRM2!"=="Y" (
    echo.
    echo データの削除をスキップしました。
    echo コンテナ・イメージのみ削除済みです。
    goto :done
)

echo.
echo データを削除しています...

for %%D in (
    "data\postgres"
    "data\tax-docs"
    "data\medical-stock"
    "data\bank-analyzer\data"
    "data\bank-analyzer\db"
    "data\bank-analyzer\postgres"
) do (
    if exist "%%~D" (
        rd /s /q "%%~D" 2>nul
        mkdir "%%~D" 2>nul
        type nul > "%%~D\.gitkeep"
        echo   [OK] %%~D
    )
)

echo.
echo [OK]    データを削除しました（ディレクトリ構造は維持）

:: ──────────────────────────────────────────────────────────────
:: Done
:: ──────────────────────────────────────────────────────────────
:done
echo.
echo ============================================================
echo   Clean Up Complete
echo ============================================================
echo.
echo   再セットアップ: start.bat を実行してください
echo.
pause
