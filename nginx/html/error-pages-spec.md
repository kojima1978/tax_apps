# Error Pages Spec

Tax Apps Gateway で配信する Nginx カスタムエラーページの仕様です。

## Files

| File | Purpose |
| --- | --- |
| `error-common.css` | 共通スタイル |
| `404.html` | 404 Not Found |
| `429.html` | 429 Too Many Requests |
| `50x.html` | 500 / 502 / 504 gateway or server error（上流のコンテナが止まっているときもこれ） |
| `503.html` | 503 Service Unavailable / maintenance |

## Design Direction

- Professional SaaS/admin tone for tax and finance workflows.
- Light neutral canvas with a subtle grid texture.
- Compact, readable single-card layout with 8px radius.
- Status-specific accent colors: orange `#c2410c`, gold `#ca8a04`, rose `#be123c`, and navy `#1e3a8a`
  (`.accent-*` on `<body>`; tints the card's top bar, the icon, and the notice box).
- Inline SVG icons only; no emoji or remote image/font dependency.
- Keyboard-visible focus rings and `prefers-reduced-motion` support.
- Light only (`color-scheme: light`); there is no dark-mode variant.

## Shared Structure

Each page uses:

- `<main class="card" role="alert" aria-labelledby="page-title">`
- A small `Tax Apps` brand mark.
- A status chip such as `Not Found` or `Server Error`.
- A page-specific SVG icon.
- A clear Japanese headline and short recovery message.
- Primary and secondary actions where useful.

## Page Content

| Page | Chip | Accent | Title | Main action | Secondary action |
| --- | --- | --- | --- | --- | --- |
| `404.html` | Not Found | orange | ページが見つかりません | トップへ戻る | 前のページへ（`history.back()`） |
| `429.html` | Rate Limited | gold | アクセスが集中しています | 再読み込み | トップへ戻る |
| `50x.html` | Server Error | rose | サーバーで問題が発生しました | 再読み込み | トップへ戻る |
| `503.html` | Maintenance | navy | メンテナンス中です | 再読み込み | — |

429 / 50x / 503 には補足の `.notice` ボックスがあり、503 はステータスチップに
パルスする点（`.pulse-dot`）が付く。

## Nginx Integration

`error-common.css` is served as a public static asset:

```nginx
location = /error-common.css {
    root /usr/share/nginx/html;
    access_log off;
    add_header Cache-Control "public, max-age=604800";
    include /etc/nginx/includes/security_headers.conf;
}
```

Every page loads it as the absolute path `/error-common.css`, so this location must stay
public (the pages themselves are `internal`).

HTML error pages are served through internal error handling (`default.conf`, server level):

| `error_page` | Page | Note |
| --- | --- | --- |
| `500 502 504` | `/50x.html` | |
| `503` | `/503.html` | |
| `404` | `/404.html` | |
| `429` | `/429.html` | `Retry-After: 30` を付ける |

```nginx
error_page 500 502 504 /50x.html;
location = /50x.html {
    root /usr/share/nginx/html;
    internal;
}
```

Exceptions:

- API locations have `proxy_intercept_errors off`, so an error response **from the upstream**
  (its JSON body) passes through unchanged. Errors nginx itself generates are still replaced:
  a rate-limited API call gets `429.html`, and an API whose container is down gets `50x.html`.
- `_next/static` for itcm / insurance / private-banking routes errors to the named locations
  `@next_static_missing` / `@next_static_unavailable`, which return a one-line JS comment
  instead of HTML (see `../readme.md`, 「JS/CSS を求めてきた相手に HTML を返さない」).
- Statuses not listed above (400, 405, 413, ...) get nginx's default body.

## Verification

Preview the design with a throwaway static server, run from the repository root
(`tax_apps/`). The pages are `internal` in the gateway, so they can't be opened by URL there.

```bash
MSYS_NO_PATHCONV=1 docker run --rm -p 127.0.0.1:8088:80 -v "$(pwd -W 2>/dev/null || pwd)/nginx/html:/usr/share/nginx/html:ro" nginx:1.27-alpine
```

Then check:

- `http://127.0.0.1:8088/404.html`
- `http://127.0.0.1:8088/429.html`
- `http://127.0.0.1:8088/50x.html`
- `http://127.0.0.1:8088/503.html`

To check that the gateway actually serves them (status codes and sizes), use
`../robustness-checklist.md` section 3 (e.g. stopping an upstream → 502 with `50x.html`).
`nginx/html/` is bind-mounted read-only into the gateway (`docker/gateway/docker-compose.yml`),
so edits here are served as soon as they are saved — no rebuild or reload is needed.
