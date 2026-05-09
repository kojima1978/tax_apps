# Error Pages Spec

Tax Apps Gateway で配信する Nginx カスタムエラーページの仕様です。

## Files

| File | Purpose |
| --- | --- |
| `error-common.css` | 共通スタイル |
| `404.html` | 404 Not Found |
| `429.html` | 429 Too Many Requests |
| `50x.html` | 500 / 502 / 504 gateway or server error |
| `503.html` | 503 Service Unavailable / maintenance |

## Design Direction

- Professional SaaS/admin tone for tax and finance workflows.
- Light neutral canvas with a subtle grid texture.
- Compact, readable single-card layout with 8px radius.
- Status-specific accent colors: orange, gold, rose, and navy.
- Inline SVG icons only; no emoji or remote image/font dependency.
- Keyboard-visible focus rings and `prefers-reduced-motion` support.

## Shared Structure

Each page uses:

- `<main class="card" role="alert" aria-labelledby="page-title">`
- A small `Tax Apps` brand mark.
- A status chip such as `Not Found` or `Server Error`.
- A page-specific SVG icon.
- A clear Japanese headline and short recovery message.
- Primary and secondary actions where useful.

## Page Content

| Page | Title | Main action |
| --- | --- | --- |
| `404.html` | ページが見つかりません | トップへ戻る |
| `429.html` | アクセスが集中しています | 再読み込み |
| `50x.html` | サーバーで問題が発生しました | 再読み込み |
| `503.html` | メンテナンス中です | 再読み込み |

## Nginx Integration

`error-common.css` is served as a public static asset:

```nginx
location = /error-common.css {
    root /usr/share/nginx/html;
    access_log off;
    add_header Cache-Control "public, max-age=604800";
}
```

HTML error pages are served through internal error handling:

```nginx
error_page 500 502 504 /50x.html;
location = /50x.html {
    root /usr/share/nginx/html;
    internal;
}
```

## Verification

Preview from this directory with a local static server:

```bash
python -m http.server 8088 --directory nginx/html
```

Then check:

- `http://127.0.0.1:8088/404.html`
- `http://127.0.0.1:8088/429.html`
- `http://127.0.0.1:8088/50x.html`
- `http://127.0.0.1:8088/503.html`
