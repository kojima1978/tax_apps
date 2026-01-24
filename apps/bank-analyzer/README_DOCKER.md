# Dockerでの実行方法

Docker Composeを使用して、相続税通帳分析システムをコンテナ環境で起動できます。

## 前提条件
- Docker Desktop がインストールされていること

## 起動手順

1. **ディレクトリの移動**
   
   プロジェクトのルートから `docker` ディレクトリに移動します。

   ```bash
   cd ../../docker
   ```

2. **コンテナのビルドと起動**
   ```bash
   docker compose up -d bank-analyzer
   ```
   初回はDockerイメージのダウンロードとビルドに数分かかります。

3. **アプリにアクセス**
   ブラウザで http://localhost:8501 にアクセスしてください。

## 停止方法

```bash
docker compose down
```

## 設定の変更

`docker-compose.yml` の `environment` セクションを変更することで、設定をカスタマイズできます。

```yaml
    environment:
      - LARGE_AMOUNT_THRESHOLD=1000000
```
