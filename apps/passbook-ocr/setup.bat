@echo off
REM Passbook OCR Pro - Setup Script for Windows

echo ==================================
echo 通帳OCR Pro v3.1 - セットアップ
echo ==================================
echo.

REM Check Docker
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker が見つかりません
    echo    Docker Desktop をインストールしてください: https://docs.docker.com/desktop/windows/install/
    exit /b 1
)
echo ✅ Docker がインストールされています

REM Check Docker Compose
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker Compose が見つかりません
    exit /b 1
)
echo ✅ Docker Compose がインストールされています

echo.
echo --- WSL2とNVIDIA Dockerの確認 ---
echo ⚠️  Windows環境では以下を確認してください:
echo    1. WSL2が有効になっている
echo    2. Docker DesktopでWSL2統合が有効
echo    3. NVIDIA GPUドライバーが最新版
echo    4. Docker DesktopでGPUサポートが有効
echo.
pause

echo.
echo --- ディレクトリ作成 ---
if not exist "data\uploads" mkdir "data\uploads"
if not exist "backend\data" mkdir "backend\data"
type nul > "data\uploads\.gitkeep"
echo ✅ ディレクトリ作成完了

echo.
echo --- 環境設定ファイル ---
if not exist "backend\.env" (
    copy "backend\.env.example" "backend\.env"
    echo ✅ backend\.env を作成しました
) else (
    echo ⚠️  backend\.env は既に存在します
)

echo.
echo --- Dockerイメージのビルド ---
docker-compose build
echo ✅ ビルド完了

echo.
echo ==================================
echo セットアップが完了しました！
echo ==================================
echo.
echo 起動方法:
echo   docker-compose up -d
echo.
echo アクセス:
echo   フロントエンド: http://localhost:3000
echo   バックエンド API: http://localhost:8000
echo   API ドキュメント: http://localhost:8000/docs
echo.
echo 停止方法:
echo   docker-compose down
echo.
pause
