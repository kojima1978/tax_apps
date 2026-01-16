#!/bin/bash

# Passbook OCR Pro - Setup Script
# For Linux/WSL2 environments

set -e

echo "=================================="
echo "通帳OCR Pro v3.1 - セットアップ"
echo "=================================="
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker が見つかりません"
    echo "   Docker をインストールしてください: https://docs.docker.com/get-docker/"
    exit 1
fi
echo "✅ Docker: $(docker --version)"

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose が見つかりません"
    exit 1
fi
echo "✅ Docker Compose: $(docker-compose --version)"

# Check NVIDIA Docker
if ! docker run --rm --gpus all nvidia/cuda:12.2.0-base-ubuntu22.04 nvidia-smi &> /dev/null; then
    echo "⚠️  警告: NVIDIA Docker が正しく設定されていない可能性があります"
    echo "   NVIDIA Container Toolkit をインストールしてください"
    echo "   https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html"
else
    echo "✅ NVIDIA Docker 対応"
fi

echo ""
echo "--- ディレクトリ作成 ---"
mkdir -p data/uploads
mkdir -p backend/data
touch data/uploads/.gitkeep
echo "✅ ディレクトリ作成完了"

echo ""
echo "--- 環境設定ファイル ---"
if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    echo "✅ backend/.env を作成しました"
else
    echo "⚠️  backend/.env は既に存在します"
fi

echo ""
echo "--- Dockerイメージのビルド ---"
docker-compose build
echo "✅ ビルド完了"

echo ""
echo "=================================="
echo "セットアップが完了しました！"
echo "=================================="
echo ""
echo "起動方法:"
echo "  docker-compose up -d"
echo ""
echo "アクセス:"
echo "  フロントエンド: http://localhost:3000"
echo "  バックエンド API: http://localhost:8000"
echo "  API ドキュメント: http://localhost:8000/docs"
echo ""
echo "停止方法:"
echo "  docker-compose down"
echo ""
