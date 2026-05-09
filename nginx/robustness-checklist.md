# Nginx Gateway Robustness Checklist

Tax Apps Gateway を変更・再起動するときの最小確認リストです。

## 1. 構文確認

```bash
docker compose -f docker/gateway/docker-compose.yml config --quiet
docker compose -f docker/gateway/docker-compose.yml -f docker/gateway/docker-compose.prod.yml config --quiet
docker compose -f docker/gateway/docker-compose.yml build gateway
docker compose -f docker/gateway/docker-compose.yml run --rm --no-deps gateway nginx -t
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
| Static cache storage | `nginx/nginx.conf` | `/tmp/nginx-cache`, max `512m` |
