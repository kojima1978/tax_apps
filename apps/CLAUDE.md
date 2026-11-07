# CLAUDE.md（apps）

ルートの `CLAUDE.md` から移した、全アプリ共通の compose / Dockerfile の決まりごと。


## compose の書き方

compose を新しく書くときは既存ファイルの**アンカーをそのまま写すこと**
（`x-logging` / `x-autoheal-labels` / `x-healthcheck-defaults` / `x-security-opts` /
`deploy.resources`）。全アプリの全サービスに `no-new-privileges` とメモリ上限が入っている。
Node.js のアプリにメモリ上限を付けるときは `NODE_OPTIONS: --max-old-space-size=…` も一緒に置く
（V8 の既定ヒープ上限はホストの物理メモリから決まるので、コンテナ側にだけ上限を掛けると
GC の前に cgroup の上限へ当たって OOM kill になりうる）。値は上限の7割程度、1コンテナで
Node を2本動かすなら合計が上限を下回るように割る。**`preflight` のチェック17が
dev の compose を毎回突き合わせる**（上限があるのに `NODE_OPTIONS` が無い／ヒープ上限が
コンテナの上限以上、のどちらでも WARN）。本番側は上限を絞り直すファイルだけ手当てが要る
（`environment` はマージされるので、base の値が残ると本番の小さい上限を超える）。
どちらも**作り直して初めて効く**ので、compose を変えたら `manage.sh apply [app]` で反映する
（`docker restart` では反映されない）。

## Dockerfile（非 root）

**`dev` ステージも本番と同じ非 root で動かす**。dev だけ root だと、コンテナ内から作られた
ファイルが root 所有でホスト側に残り、本番（非 root）から触れなくなる。書き方は共通:

```dockerfile
COPY --chown=node:node . .
RUN chown node:node /app /app/node_modules   # ← -R は付けない
USER node
```

- `COPY --chown=` は**層を増やさない**（コピー時に所有者が決まる）。末尾に
  `RUN chown -R node:node /app` を置くと `node_modules` がもう1層まるごとコピーされて
  イメージが数百MB膨らむので、`chown` は**ディレクトリだけ**に絞る
- `--chown` が要るのは `next dev` が起動時に `tsconfig.json` と `next-env.d.ts` を**書き換える**から
  （root 所有のままだと `EACCES` で即落ちる）。Vite は `node_modules/.vite` だけ、
  Next standalone は `.next/cache` だけ書く
- **名前付きボリュームがイメージ側の所有者を引き継ぐのは空のときだけ**。root 時代に作られた
  既存ボリュームは root 所有のまま残るので、切り替え時に一度だけ
  `docker compose exec -u 0 <service> chown -R node:node <mount-point>` が要る
- Windows の bind mount はマウント先ルートと Windows 側で作ったファイルが `0:0` の **0777** で
  見えるので uid1000 でも書ける。ただし**root 時代にコンテナ内から作られた**ディレクトリは
  `0:0` の 0755 で残るため、そこだけ一度 `chown -R` が要る（svf の `output/industry-export` が該当した）
- 本番ステージで `/app` 配下へ何も書かないアプリは `chown` すら要らず `USER node` の1行で済む
  （svf がこれ。書き込み先は `./output` と `./prisma/industry-data` の bind mount だけで、
  entrypoint の prisma も `npx` ではなく `node_modules` を直接叩くので `$HOME/.npm` も不要）。
  **これで全アプリ・全ステージが非 root**

## ソース同期（private-banking / inheritance-case-management）

この2アプリは dev でもソースを bind mount せず、**イメージ同梱物 + `docker compose watch`** で動かす。

```bash
# 編集しながら開発する間、別ターミナルで開いておく（フォアグラウンド）
docker/scripts/manage.sh watch <app-name>
```

- watch を止めている間の変更は同期されない。その場合は `manage.sh build <app-name>` で取り込む。
- `--watch` は `--detach` と併用できないため、`start` とは別プロセスで動かす設計。
- **なぜ bind mount をやめたか**: Docker Desktop for Windows の bind mount(Windows→WSL2) は起動直後の `scandir` が EFAULT を返すことがあり、Next.js の dev サーバはルート表を watchpack の初期スキャン結果から組み立てる。スキャンに失敗したディレクトリ配下のルートが警告1行だけ残して丸ごと欠落し、「`✓ Ready` なのに 404」のまま稼働し続ける。コンテナ内から bind mount を無くすとこの経路自体が消える。
- 同期経路が bind mount ではなくなった代わりに、Docker はオーバーレイ上位層へ直接書き込むためコンテナ内の inotify にイベントが届かない。**ポーリングが2箇所必要**: ルート表用の `WATCHPACK_POLLING`(compose の environment) と Turbopack 再コンパイル用の `watchOptions.pollIntervalMs`(next.config.ts)。
- **スキャンガード**: 上の障害は healthcheck(`/api/health`) をすり抜けるため、両アプリの `docker-entrypoint.sh` に dev 限定のガードを入れてある。dev サーバの出力を FIFO 経由で監視し `Watchpack Error (initial scan)` を見つけたら即座に落とす → `restart: unless-stopped` で再起動。next は `exec` せず子プロセスとして起動し(PID 1 はハンドラの無いシグナルを無視するため)、`docker stop` の TERM は trap で転送している。

## 画面・帳票の共通ルール

- **申告書・評価明細書は国税庁の様式に忠実に**（inheritance-tax-form / stock-valuation-form）。UI の改善は様式を崩さない範囲で
- **計算・シミュレーション系の印刷は1枚に収める**（ページ数を SPEC で決めているものはその枚数）。
  用紙の向き・サイズは各アプリの SPEC に従う（retirement-tax-calc・depreciation-calc は A4 縦、
  inheritance-tax-app は画面ごとに A4 横／A3 横）。複数ページの帳票（private-banking など）は
  ページの切れ目で枠や表が崩れないようにする
- 印刷では濃い塗りを付けない。見出しセル・区分ラベル・案の色分けの**薄い網掛けだけ**は可
  （各アプリが `print-color-adjust: exact` で意図して残している）。罫線・数字・注記は黒。
  ボタン・早見の選択肢・ヘッダーなど操作部品は `.no-print` 等で印刷から外す
- 金額はカンマ区切り（入力中もリアルタイムで）。数値の入力欄にスピナーを付けない。
  寄せ方（右寄せ・左寄せ）は画面ごとに指示があるので、既存の画面に合わせる
- マイナスは「△」で表示する
- 日付には和暦を添える（入力時も和暦で確かめられるように）
- 見出しは日本語のみ（英字の飾り見出しを付けない）
- 入力欄の幅は桁数に合わせ、同じ行の要素は高さをそろえる
