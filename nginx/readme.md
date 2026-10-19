# Nginx Gateway Configuration

堅牢化後の確認手順は [`robustness-checklist.md`](./robustness-checklist.md) を参照してください。

Tax Apps プロジェクトのゲートウェイ（リバースプロキシ）として機能する Nginx の設定ファイルです。

## 概要

この Nginx サービスは、外部からの HTTP リクエスト (`port 80`) を受け取り、URL パスに基づいて適切なバックエンドサービス（コンテナ）にリクエストを振り分けます。

各アプリケーションは独立した Docker Compose プロジェクトとして起動しますが、共有ネットワーク (`tax-apps-network`) 上でコンテナ名による名前解決が行われるため、Nginx は各コンテナに直接通信できます。

## ファイル構成

```
nginx/
├── Dockerfile      # カスタムNginxイメージ（tzdata付き、non-root実行。ヘルスチェックは BusyBox wget）
├── nginx.conf      # グローバル設定（ワーカー、Gzip、セキュリティ、レート制限、ログ形式）
├── default.conf    # サーバーブロック設定（ルーティングルール）
├── html/              # カスタムエラーページ
│   ├── error-common.css # 共通スタイル（グリッド背景＋カード）
│   ├── 404.html       # Not Foundページ（オレンジ）
│   ├── 429.html       # レート制限超過ページ（ゴールド）
│   ├── 50x.html       # サーバーエラーページ（ローズ）
│   ├── 503.html       # メンテナンスページ（ネイビー + パルスする点）
│   └── error-pages-spec.md # エラーページのデザイン仕様
├── includes/       # 共通設定ディレクトリ
│   ├── proxy_params.conf       # 共通プロキシヘッダー設定・upstream ヘッダーの除去
│   ├── upstreams.conf          # $app_backend レジストリ（ホスト名:ポートの唯一の情報源）
│   ├── maps.conf               # map定義（WebSocket Upgrade, Host許可判定, Font Routing）
│   ├── security_headers.conf   # 共通セキュリティヘッダー（CSP含む）
│   ├── rate_limit_general.conf # 一般レート制限（burst=100 nodelay）
│   └── rate_limit_api.conf     # APIレート制限（burst=30 nodelay）
├── .dockerignore   # Dockerビルド除外設定
├── robustness-checklist.md # 変更・再起動時の確認手順
└── readme.md       # このファイル
```

## 主な機能

### パフォーマンス最適化

- **Gzip圧縮**: テキスト、CSS、JS、JSON、WASMなどを自動圧縮
- **動的DNS解決**: Docker DNS resolver (`127.0.0.11`) + 変数ベースの `proxy_pass` で起動時のホスト名依存を排除。コンテナ未起動でも Gateway は起動し、該当サービスのみ 502 を返す
- **静的ファイルキャッシュ**: Next.js/Vite のハッシュ付き静的ファイルは1年キャッシュ
- **アップストリーム障害リトライ**: `proxy_next_upstream error timeout` による自動リカバリ（非冪等メソッドの二重送信防止のためHTTPステータスでのリトライは無効）

### セキュリティ

- **レート制限**: API 60req/s（burst 30）、一般 300req/s（burst 100）（超過時は 429 を返却）
- **接続数制限**: 1IPあたり50接続（全ロケーション共通）
- **セキュリティヘッダー**: X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy。アップストリームが独自に返す同名ヘッダーは `proxy_params.conf` の `proxy_hide_header` で除去し、ゲートウェイの値に一本化する（矛盾する値が重複するとブラウザがヘッダーごと無視することがあるため。例: フレームワークが既定で付ける `X-Frame-Options: DENY`）
- **サーバー情報非表示**: server_tokens off, proxy_hide_header (X-Powered-By, Server)
- **クライアントIP**: ゲートウェイがエッジのため real_ip は使わず、実接続元IP（`$remote_addr`）でレート制限・ログを取得（X-Forwarded-For 詐称によるレート制限回避を防止）
- **APIエラー応答保護**: APIエンドポイントは `proxy_intercept_errors off` でバックエンドのJSON応答をそのまま返却

### 監視・トレーシング

- **ヘルスチェック**: `/health` エンドポイント（Alpine BusyBox内蔵wget使用）
- **Nginx Status**: `/nginx-status`（コンテナループバック限定。`docker exec` で確認）
- **詳細ログ**: レスポンスタイム、アップストリーム時間（main形式）
- **リクエストトレーシング**: X-Request-ID, X-Request-Start ヘッダー

### エラーページ

デザインと文言の仕様は [`html/error-pages-spec.md`](./html/error-pages-spec.md):

- **共通スタイル** (`error-common.css`): 薄いグリッド模様の明るい背景に1枚のカード、インライン SVG アイコン（外部の画像・フォントに依存しない）
- **404**: ページが見つかりません — オレンジ、「トップへ戻る」「前のページへ」
- **429**: アクセスが集中しています — ゴールド、補足ボックス、「再読み込み」「トップへ戻る」
- **50x**: サーバーで問題が発生しました — ローズ、補足ボックス、「再読み込み」「トップへ戻る」
- **503**: メンテナンス中です — ネイビー、パルスする点付きのステータスチップ、「再読み込み」

#### JS/CSS を求めてきた相手に HTML を返さない

basePath 付き Next.js の3アプリ（inheritance-case-management / insurance / private-banking）の `_next/static` では、
`error_page 404 = @next_static_missing;` と `error_page 500 502 503 504 = @next_static_unavailable;`
で**エラーページの HTML を返さない**ようにしている（名前付きロケーションで落とす）。

2026-10-13、コンテナの作り直し中に `_next/static` が 502 を返し、その本文（`50x.html`）を受けた
ブラウザが `Refused to execute script (MIME type text/html)` でレンダリングごと失敗 → Next の dev
クライアントは `hadRuntimeError` のとき変更通知をソフト更新ではなく `location.reload()` で処理する
ため、**毎秒4回のリロードが数十分続いた**。

**ただしこれはループを止めない。** ブラウザは 2xx でない応答の本文を `<script>` として実行しないので、
HTML をやめてもチャンクは読めず画面は壊れる（＝ `hadRuntimeError` は同じように立つ）。ここで塞いだのは
「本文を読む側が HTML を解析して別のエラーに化ける」経路と、落ち方を5経路で揃えることだけ。
検知と証拠の採取は `manage.sh loop-check`（無人側はウォッチドッグの `due`）が受け持つ。

### 構成のモジュール化

- **共通プロキシ設定**: `includes/proxy_params.conf` に共通のヘッダー設定（Host, X-Real-IP, WebSocket Upgrade等）を集約
- **アップストリーム参照**: `includes/upstreams.conf` の `map` に全サービスのホスト名:ポートを集約し、`default.conf` は `$app_backend` 経由で参照
- **Map定義**: `includes/maps.conf` に WebSocket Upgrade と Next.js Font Routing の map を分離
- **レート制限**: `includes/rate_limit_general.conf` / `rate_limit_api.conf` で burst 値を一元管理

## ルーティング一覧

| URL Path | 宛先サービス | 説明 |
|:---------|:-------------|:-----|
| `/` | `portal-app:3000` | ポータルサイト（Next.js の静的出力を nginx で配信） |
| `/tax-docs/` | `tax-docs:3002` | 所得税・贈与税書類リスト (Vite) |
| `/itcm/` | `itcm-frontend:3020` | 相続税案件管理 (Next.js + API Routes) |
| `/itcm/api/` | `itcm-frontend:3020` | 相続税案件管理 API（同一サービス内） |
| `/itcm/api-v1/` | `itcm-frontend:3020` | 旧 API パス。`/itcm/api/` へ書き換えて転送 |
| `/insurance/` | `insurance-app:3030` | 保険管理 (Next.js) |
| `/insurance/api/` | `insurance-app:3030` | 保険管理 API（120s） |
| `/private-banking/` | `private-banking-app:3025` | ファミリーB/S管理 (Next.js) |
| `/private-banking/api/` | `private-banking-app:3025` | ファミリーB/S管理 API（120s） |
| `/inheritance-tax-app/` | `inheritance-tax-app:3004` | 相続税計算 (Vite) |
| `/inheritance-tax-app/api/` | `inheritance-tax-app:3004` | 相続税計算 API |
| `/inheritance-tax-docs/` | `inheritance-tax-docs:3003` | 相続税 資料準備ガイド (Vite) |
| `/inheritance-tax-docs/api/` | `inheritance-tax-docs:3003` | 資料準備ガイド API (Express。50M・120s) |
| `/inheritance-tax-form/` | `inheritance-tax-form:3021` | 相続税の申告書 (Vite) |
| `/gift-tax-simulator/` | `gift-tax-simulator:3001` | 贈与税・間接税シミュレーター (Vite) |
| `/retirement-tax-calc/` | `retirement-tax-calc:3013` | 退職金税額計算 (Vite) |
| `/capital-gains-calc/` | `capital-gains-calc:3019` | 譲渡所得税計算 (Vite) |
| `/depreciation-calc/` | `depreciation-calc:3015` | 減価償却計算 (Vite) |
| `/asset-valuation/` | `asset-valuation:3017` | 減価償却資産評価 (Vite) |
| `/stock-valuation-form/` | `stock-valuation-form:3014` | 株式評価明細書 (Vite + Hono) |
| `/stock-valuation-form/api/` | `stock-valuation-form:3014` | 株式評価明細書 API（業種目データ・案件） |
| `/bank-analyzer/` | `bank-analyzer:3007` | 銀行分析 (Vite + Hono) |
| `/bank-analyzer/api/` | `bank-analyzer:3007` | 銀行分析 API（100M・300s。CSV の取込がここを通る） |
| `/gift-tax-docs/` | → `/tax-docs/` | 301リダイレクト（旧URL互換） |
| `/real-estate-tax/` | → `/gift-tax-simulator/real-estate` | 301リダイレクト |

## Docker Compose

Gateway は独立した Compose プロジェクトとして `docker/gateway/docker-compose.yml` で管理されます。
Portal（ポータルサイト）と同一プロジェクト内に含まれます。

```bash
# 起動（引数なしの manage.sh start でも起動される）
docker/scripts/manage.sh start gateway

# 再ビルド（nginx/ や apps/portal/ を変えたとき。portal-app も一緒に作り直す）
docker/scripts/manage.sh build gateway

# compose の変更（ports など）を反映（再ビルドなし。docker restart では反映されない）
docker/scripts/manage.sh apply gateway
```

`nginx.conf` / `default.conf` / `includes/` は読み取り専用で bind mount しているので、
これらの変更だけなら再ビルドせず下の「設定のリロード」で反映できる。

### ネットワーク

全アプリケーションは外部ネットワーク `tax-apps-network` を共有します。
Gateway は Docker DNS resolver (`127.0.0.11`) を使用し、各コンテナ名でリクエスト時に動的に名前解決します。

```bash
# ネットワーク作成（manage.sh の start / build / apply などが無ければ自動で作る）
docker network create tax-apps-network
```

> **重要**: 各アプリの `docker-compose.yml` で定義される `container_name` は
> `includes/upstreams.conf` の `$app_backend` レジストリのホスト名と一致している必要があります。

## 設定のカスタマイズ

### レート制限の調整

`nginx.conf` の以下の部分を変更:

```nginx
# APIエンドポイント: 60リクエスト/秒
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=60r/s;

# 一般ページ: 300リクエスト/秒
limit_req_zone $binary_remote_addr zone=general_limit:10m rate=300r/s;
```

### タイムアウトの調整

`includes/proxy_params.conf` の以下の部分を変更:

```nginx
proxy_connect_timeout 10s;
proxy_send_timeout 60s;
proxy_read_timeout 60s;
```

**注意**: `bank-analyzer` は CSV の解析と分類に時間がかかるため `/api/` だけ `proxy_read_timeout 300s`・`client_max_body_size 100M` に設定済み。insurance / private-banking / inheritance-tax-docs の API は 120s

### アドレスとルーティングの分離

設定は「**アドレス（どこにあるか）**」と「**振る舞い（どう扱うか）**」を分けている。

| | ファイル | 内容 |
|:--|:--|:--|
| アドレス | `includes/upstreams.conf` | `$app_backend` レジストリ。**ホスト名:ポートを書いてよい唯一の場所** |
| 振る舞い | `default.conf` | アプリ名だけを扱い、アドレスは `$app_backend` 経由で引く |

`$app_name`（= URL の第1セグメント、または location 内の `set $app_name xxx;`）から
`$app_backend` を解決する。ポート変更時の修正はレジストリの1行だけで済む。

> **注意**: nginx の `map` は1リクエスト内で最初に参照された時点の値がキャッシュされる。
> `set $app_name ...;` は必ず `$app_backend` を参照する**前**に置くこと。

### 新しいアプリの追加

#### 1. レジストリに登録（全アプリ共通・必須）

`includes/upstreams.conf` の `$app_backend` に1行追加する。キーは URL の第1セグメント:

```nginx
new-app  new-app:3000;
```

**これだけで `/new-app` → `/new-app/` の末尾スラッシュ正規化が自動的に効く**
（アプリ名を列挙せず、レジストリ登録の有無で判定しているため）。

#### 2. 振る舞いクラスに追加

| アプリの種類 | 追加先 |
|:--|:--|
| Vite SPA（設定が他と同一） | `default.conf` の Vite 一括 location の正規表現に `new-app` を追加。**location ブロックの作成は不要** |
| basePath 付き Next.js | 上記に加え、`default.conf` の `_next/static` 正規表現にも追加（静的アセットがキャッシュ対象になる） |
| 個別設定が必要 | `default.conf` に location を作る（下記） |

個別 location を作る場合は、アドレスではなく**アプリ名**を指定する:

```nginx
location /new-app/ {
    include /etc/nginx/includes/rate_limit_general.conf;

    set $app_name new-app;
    proxy_pass http://$app_backend;
}
```

> **注意**: 正規表現 location は前方一致 location より優先される。Vite 一括処理の
> 対象アプリに個別ルート（例: `/xxx/api/`）を足す場合は `location ^~ /xxx/api/`
> のように `^~` を付けないと、正規表現側に横取りされる。同様に、単一セグメントの
> パスを個別処理したい場合は `location =` の完全一致にすること。

API を持つアプリでは、バックエンドの JSON をそのまま返すため必ず
`proxy_intercept_errors off;` と `rate_limit_api.conf` を指定すること。

#### 3. （Next.js の dev フォント対応が必要な場合のみ）

`includes/maps.conf` の `$nextjs_font_backend` に `~*/new-app/ new-app:3000;` を追加。
このマップは Referer からアプリを判別する特殊な引き方のためレジストリを使えず、
ここだけアドレスを直接書く（本番では使われない dev 専用ルート）。

## トラブルシューティング

### 設定の検証

```bash
docker exec tax-apps-gateway nginx -t
```

### 設定のリロード

```bash
docker exec tax-apps-gateway nginx -s reload
```

### ログの確認

`/var/log/nginx/access.log` は `/dev/stdout`、`error.log` は `/dev/stderr` への symlink なので、
コンテナの中のファイルとしては読めない（`tail -f` しても何も出ない）。`docker logs` から読む。

```bash
# 管理スクリプト経由（portal-app のログも混ざる）
docker/scripts/manage.sh logs gateway

# ゲートウェイだけ
docker logs -f tax-apps-gateway

# レート制限超過ログ（429エラー）
docker logs tax-apps-gateway 2>&1 | grep "limiting requests"
```

### 接続状況の確認

`/nginx-status` はコンテナ内のループバックからしか許可していない（ホストからの curl は 403）。

```bash
docker exec tax-apps-gateway wget -qO- http://127.0.0.1/nginx-status
```

### アップストリーム応答確認

```bash
# ヘルスチェック
curl -I http://localhost/health
curl -I http://localhost/ready

# 各サービスへの疎通確認
curl -I http://localhost/bank-analyzer/
curl -I http://localhost/itcm/
```

### LAN経由アクセス

> **現在の設定は LAN に公開されています。** `docker/gateway/docker-compose.yml` の
> `ports` は `"80:80"`（= `0.0.0.0:80`）です。ループバックのみに閉じる場合は
> `"127.0.0.1:80:80"` に変更して `docker/scripts/manage.sh apply gateway` してください（`docker restart` では反映されません）。

社内LAN内の他PCから Gateway にアクセスする場合、必要なのは次の2点です
（ポート公開は上記のとおり既に `0.0.0.0` になっています）:

1. **Windowsファイアウォールでポート80を許可**:

   ```powershell
   # 管理者権限のPowerShellで実行
   New-NetFirewallRule -DisplayName "Tax Apps Gateway (HTTP)" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow -Profile Private,Domain -RemoteAddress LocalSubnet
   ```

   `-Profile` / `-RemoteAddress` は外さないこと。Docker Desktop の中継で nginx の
   `$remote_addr` は全接続が `172.18.0.1` になり（実測）、nginx 側では送信元を絞れない。
   ログインの無いアプリを守っているのはこのルールだけ。

2. **Docker が作る「Docker Desktop Backend」ルールも LocalSubnet に絞る**: 80番で待ち受けているのは
   `com.docker.backend.exe` で、このルールは全ポート・全送信元を許可している。残っていると
   上のルールを絞っても素通りになる。

   ```powershell
   # 管理者権限のPowerShellで実行
   Get-NetFirewallRule -DisplayName 'Docker Desktop Backend' | Set-NetFirewallRule -EdgeTraversalPolicy Block -RemoteAddress LocalSubnet
   ```

   Docker Desktop の更新で作り直されることがあるので、`docker/scripts/manage.sh preflight` の
   チェック19が全送信元に戻っていないかを毎回見ている（直し方もそこに出る）。

設定後、`http://<ホストPCのIPアドレス>/` でアクセスできます。nginx側の設定変更は不要です（`proxy_set_header Host $host` によりどのIPでも正しく動作）。

> **Host ヘッダーの許可リスト**: `includes/maps.conf` の `$host_allowed` で、
> localhost・プライベートIP（10/172.16-31/192.168）・ドットを含まない
> マシン名・`.local` / `.lan` / `.internal` のみを許可し、それ以外の FQDN は
> 444（応答せず切断）で拒否します。外部ドメインを社内IPに向ける DNS
> リバインディング対策です。社内で独自ドメインを使う場合はここに1行追加してください。

### よくある問題

| 症状 | 原因 | 対処 |
|------|------|------|
| 502 Bad Gateway | アップストリームが起動していない | `docker/scripts/manage.sh status` で対象サービスの状態確認。動的DNS解決のため Gateway 自体はクラッシュせず、該当サービスのみ 502 を返す |
| 504 Gateway Timeout | 処理時間超過 | `proxy_read_timeout` を延長 |
| 429 Too Many Requests | レート制限超過 | rate 値または burst 値を調整 |
| 413 Request Entity Too Large | アップロードサイズ超過 | `client_max_body_size` を調整 |
| 画面が毎秒リロードし続ける | Next の `_next/static` のチャンクが読めず、dev クライアントが完全リロードを繰り返している | `manage.sh loop-check` が検知して証拠を `docker/logs/reload-loop/` に残す。上記「エラーページ > JS/CSS を求めてきた相手に HTML を返さない」 |
