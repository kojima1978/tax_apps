# Nginx Gateway Robustness Checklist

Tax Apps Gateway を変更・再起動するときの最小確認リスト。

**ここに載っているコマンドは全て実際に叩いて、併記した値を確認してある**（2026-09-21）。
期待値だけを書くと「書いた時点では正しかったが今は違う」に気づけないので、
設定を触ったら一度は上から流すこと。

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

## 1.5. 設定の反映と切り戻し

設定はバインドマウントのため、変更後はリロードだけで反映される（リビルド不要）:

```bash
docker exec tax-apps-gateway nginx -t && docker exec tax-apps-gateway nginx -s reload
```

**壊れた設定が配信に載ることはない。** 使い捨てコンテナで実測した挙動:

- `nginx -t` → `[emerg] ... test failed`、終了コード 1
- 構わず `nginx -s reload` → 同じ `[emerg]`、終了コード 1。**設定は差し替わらない**
- その間も**旧設定のまま応答し続ける**

したがって切り戻しは「ファイルを元に戻して `reload` し直す」だけでよく、
コンテナの作り直しは要らない。

**ただし `docker restart` / `manage.sh apply` は話が別。** 起動時点で設定が壊れていれば
nginx はそもそも起動できず、`restart: unless-stopped` で再起動を繰り返すだけになる
（= 全アプリが落ちる）。**作り直す前に必ず `nginx -t` を通すこと**。上の `&&` はそのための形。

## 2. 起動後の確認

```bash
# liveness / readiness（どちらも GET。本文は "OK"）
curl -s -w ' <- /health (%{http_code})\n' http://localhost/health   # OK <- /health (200)
curl -s -w ' <- /ready (%{http_code})\n'  http://localhost/ready    # OK <- /ready (200)

# status はコンテナループバック限定（allow 127.0.0.1 / deny all）。ホストへは公開しない。
docker exec tax-apps-gateway wget -qO- http://127.0.0.1/nginx-status

docker compose -f docker/gateway/docker-compose.yml ps
docker compose -f docker/gateway/docker-compose.yml logs --tail=100 gateway
```

`/health` は Nginx 自体の liveness（`return 200 'OK'`。上流に一切触らない）、
`/ready` は portal upstream の `/health` を叩く readiness（タイムアウトは 2s）。

### 非 root / read_only の確認

ゲートウェイは `read_only: true` + `cap_drop: ALL`（`NET_BIND_SERVICE` だけ付与）で
動かしている。**緩んでも通常の応答は何も変わらない**ので、ここだけは毎回見る:

```bash
# Git Bash からは MSYS_NO_PATHCONV=1 を付けないとコンテナ内パスが C:\... に化ける
export MSYS_NO_PATHCONV=1

docker exec tax-apps-gateway id
# uid=101(nginx) gid=101(nginx) groups=101(nginx),101(nginx)

docker exec tax-apps-gateway sh -c 'touch /etc/nginx/__probe'
# touch: /etc/nginx/__probe: Read-only file system   ← これが出れば正しい

docker exec tax-apps-gateway df -h /tmp /var/cache/nginx/static-cache \
  /var/cache/nginx/client-body /var/cache/nginx/proxy-temp
# tmpfs が 8.0M / 32.0M / 64.0M / 32.0M の4本
```

### Host ヘッダー許可リスト

`includes/maps.conf` の `$host_allowed` に無い Host は、応答せず接続を切る（`return 444`）。

```bash
curl -s -o /dev/null -w 'code=%{http_code}\n' -H 'Host: evil.example' http://localhost/; echo "exit=$?"
# code=000 / exit=52 （= 応答が無い。これが期待値）
```

## 3. 障害時の期待値

| Scenario | 期待する挙動 |
| --- | --- |
| Upstream app stopped | ゲートウェイは落ちず、502 で独自の 50x ページ（`html/50x.html` = 3519B） |
| API upstream error | 上流の JSON がそのまま通り、HTML に差し替えられない（**例外あり・後述**） |
| Too many requests | 429 + `Retry-After: 30` + `html/429.html`（3428B） |
| Too many connections | 同じく 429（`limit_conn_status 429`。既定の 503 ではない） |
| Body size exceeded | 413。**独自ページは無い**（nginx 既定の 176B の本文） |
| Large bank CSV upload | `/bank-analyzer/` だけ `100M`。`proxy_request_buffering off` で tmpfs を経由せず上流へ直送 |
| Gateway filesystem writes | ルートは read_only。書けるのは `/tmp`(8m) と `/var/cache/nginx/` 配下の tmpfs 3本のみ |

**HTML に差し替わるのは `error_page` に書いたステータスだけ**（`default.conf` の
`500 502 504` / `503` / `404` / `429`）。`400` や `405`、上の `413` は
`proxy_intercept_errors` の設定によらず素通りする。

tmpfs を4本に分けてあるのは、**1本が埋まっても他を道連れにしないため**。
`client-body`(64m) は大きい POST のバッファ、`proxy-temp`(32m) は上流応答の一時置き場、
`static-cache`(32m) はキャッシュ本体で、用途も埋まり方も違う。

### 確認コマンド

**上流停止 → 50x**（DB を持たないアプリを選ぶこと。下は `depreciation-calc`）

```bash
docker stop depreciation-calc
curl -s -o /dev/null -w 'status=%{http_code} size=%{size_download}\n' http://localhost/depreciation-calc/
# status=502 size=3519   ← html/50x.html と同じサイズ
docker start depreciation-calc
```

**レート超過 → 429**（同時に「API のエラーが素通りすること」も見える）

```bash
# 1プロセスの curl に URL を並べる。xargs で並列に回してもプロセス起動が遅すぎて
# 60r/s に届かず、いつまで経っても 429 が出ない（実測）。
ARGS=$(for i in $(seq 1 400); do printf -- '-o /dev/null http://localhost/inheritance-tax-app/api/__probe '; done)
curl -s -w '%{http_code} retry-after=%header{retry-after} type=%{content_type}\n' $ARGS | sort | uniq -c
#   47 404 retry-after=     type=application/json; charset=utf-8   ← 上流の JSON がそのまま
#  353 429 retry-after=30   type=text/html; charset=utf-8          ← 独自の 429 ページ
```

- **`/<app>/api/` 以外に投げると 429 は出にくい。** 一般ルートは `300r/s` / burst `100` なので
  この程度の回数では超えない
- `-o /dev/null` は**URL ごとに**必要（先頭の1つだけ書くと2件目以降が端末に流れる）
- `%header{}` は curl 7.83 以降

**ボディ上限 → 413**

```bash
# 50MiB ちょうど(52428800B)は通るので少し超える。53MB にしてある。
head -c 55574528 /dev/zero > /tmp/53m.bin
curl -s -o /dev/null -w 'status=%{http_code} size=%{size_download}\n' \
  -X POST -H 'Content-Type: application/octet-stream' \
  --data-binary @/tmp/53m.bin http://localhost/inheritance-tax-app/api/__probe
# status=413 size=176
rm -f /tmp/53m.bin
```

nginx は `Content-Length` を見て**本文を読む前に**断るので、上流には届かない。

### 既知のずれ: stock-valuation-form の API

`default.conf` の Vite 一括 location（正規表現）に `stock-valuation-form` が入っており、
この location には `proxy_intercept_errors off` が無い。API を持つ他のアプリは
`^~ /<app>/api/` の専用 location を立てて `off` にしているが、svf にはそれが無い。

```bash
curl -s -o /dev/null -w 'status=%{http_code} size=%{size_download}\n' \
  http://localhost/stock-valuation-form/api/industry/9999
# status=404 size=2809   ← html/404.html と同じサイズ = 本文が差し替わっている
```

影響を受けるのは `error_page` にあるステータス（実際には 404 と、シード失敗時の
`/api/health` の 503）だけ。フロントは `サーバがHTTP 404を返しました` に落ちるので
壊れはしないが、`指定された年分は登録されていません` のような個別メッセージは失われる。

## 4. Tuning knobs

| Setting | File | Current value |
| --- | --- | --- |
| API rate limit | rate: `nginx/nginx.conf`(`limit_req_zone api_limit`) / burst: `nginx/includes/rate_limit_api.conf` | `60r/s`, burst `30`, `nodelay` |
| General rate limit | rate: `nginx/nginx.conf`(`limit_req_zone general_limit`) / burst: `nginx/includes/rate_limit_general.conf` | `300r/s`, burst `100`, `nodelay` |
| Connections per IP | zone: `nginx/nginx.conf`(`limit_conn_zone`) / 適用: `nginx/default.conf`(server ブロック) | `50`（超過は 429） |
| Request body limit | `nginx/nginx.conf` | `50M`（全体の既定） |
| 〃 bank-analyzer | `nginx/default.conf` | `100M` + `proxy_request_buffering off` |
| 〃 inheritance-tax-docs API | `nginx/default.conf` | `50M`（既定と同値だが明示） |
| Default proxy timeout | `nginx/includes/proxy_params.conf` | connect `10s`, read/send `60s` |
| Bank analysis timeout | `nginx/default.conf` | read/send `300s` |
| Static cache storage | `nginx/nginx.conf` | `/var/cache/nginx/static-cache`, max `32m`, inactive `30d`（専用 tmpfs 32m） |
| Client body temp | `nginx/nginx.conf` | `/var/cache/nginx/client-body`（専用 tmpfs 64m） |
| Proxy response temp | `nginx/nginx.conf` | `/var/cache/nginx/proxy-temp`, max `32m`（専用 tmpfs 32m） |

tmpfs の容量は `docker/gateway/docker-compose.yml` の `tmpfs:` 側で決まる。
`nginx.conf` の `max_size` と**両方**直さないと片方だけが効く。
