@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║          Tax Apps - Clean Up                               ║
echo ╚════════════════════════════════════════════════════════════╝
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
echo ════════════════════════════════════════════════════════════
echo.
echo [Step 2] データディレクトリの削除
echo.

if not exist "data" (
    echo   data/ ディレクトリは存在しません。スキップします。
    goto :done
)

echo   以下のデータが完全に削除されます（復元できません）:
echo.
echo     data/postgres/           PostgreSQL データベース
echo     data/tax-docs/           確定申告書類 SQLite
echo     data/medical-stock/      医療法人株式 SQLite
echo     data/bank-analyzer/data/ アップロードデータ
echo     data/bank-analyzer/db/   銀行分析 SQLite
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
) do (
    if exist "%%~D" (
        rd /s /q "%%~D" 2>nul
        mkdir "%%~D" 2>nul
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
echo ╔════════════════════════════════════════════════════════════╗
echo ║          Clean Up Complete                                 ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo   再セットアップ: start.bat を実行してください
echo.
pause
