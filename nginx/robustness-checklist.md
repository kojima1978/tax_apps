# Nginx Gateway Robustness Checklist

Tax Apps Gateway を変更・再起動するときの最小確認リストです。

## 1. 構文確認

> **重要**: 設定ファイルは Dockerfile で `COPY` される一方、compose では
> `:ro` バインドマウントもされている。**実行時はマウント側が勝つ**ため、
> ビルド済みイメージに対する `run --rm ... nginx -t` は
> 「実際に動く設定」ではなくイメージに焼かれた古い設定をテストしてしまう。
> 稼働中コンテナがある場合は必ず `docker exec` 側で確認すること。

```bash
docker compose -f docker/gateway/docker-compose.yml config --quiet
docker compose -f docker/gateway/docker-compose.yml -f docker/gateway/docker-compose.prod.yml config --quiet

# 稼働中コンテナに対して（= マウントされた実設定をテスト。推奨）
docker exec tax-apps-gateway nginx -t

# 未起動時のみ: イメージをビルドしてテスト
docker compose -f docker/gateway/docker-compose.yml build gateway
docker compose -f docker/gateway/docker-compose.yml run --rm --no-deps gateway nginx -t
```

## 1.5. 設定の反映（リビルド不要）

設定はバインドマウントのため、変更後はリロードだけで反映される:

```bash
docker exec tax-apps-gateway nginx -t && docker exec tax-apps-gateway nginx -s reload
```

## 2. 起動後の確認

```bash
curl -I http://localhost/health
curl -I http://localhost/ready
curl http://localhost/nginx-status
docker compose -f docker/gateway/docker-compose.yml ps
docker compose -f docker/gateway/docker-compose.yml logs --tail=100 gateway
```

`/health` は Nginx 自体の liveness、`/ready` は portal upstream の readiness です。

## 3. 障害時の期待値

| Scenario | Expected behavior |
| --- | --- |
| Upstream app stopped | Gateway stays up and returns a custom 50x page for HTML routes |
| API upstream error | API JSON/body is passed through without HTML interception |
| Too many requests | HTTP 429 with `Retry-After: 30` |
| Large bank CSV upload | `/bank-analyzer/` allows up to `100M` |
| Gateway filesystem writes | Runtime writes stay under `/tmp`; root filesystem can be read-only |

## 4. Tuning knobs

| Setting | File | Current value |
| --- | --- | --- |
| API rate limit | `nginx/nginx.conf` | `60r/s`, burst `30` |
| General rate limit | `nginx/nginx.conf` | `300r/s`, burst `100` |
| Default proxy timeout | `nginx/includes/proxy_params.conf` | connect `10s`, read/send `60s` |
| Bank analysis timeout | `nginx/default.conf` | read/send `300s` |
| Static cache storage | `nginx/nginx.conf` | `/tmp/nginx-cache`, max `64m`, inactive `30d`（tmpfs 128m の範囲内） |
