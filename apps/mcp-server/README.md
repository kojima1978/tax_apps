# tax-apps MCP サーバー

外部の AI ツール（Claude Desktop など）から**株式評価明細書**（`stock-valuation-form`）へ
数字を書き込むための MCP サーバー。通信は stdio。

想定している使い方はこれ:

1. 法人税の申告書・決算書・勘定科目内訳明細書の PDF を AI に読ませる
2. AI が読み取った数字を、この MCP サーバー経由で評価案件の該当欄へ入れる

**PDF を読むのは AI 側の仕事**で、このサーバーは読まない。ここがやるのは
「どの欄に何を入れられるか」を教えることと、入れる前に検査することだけ。

## 様式の知識はここに持たせない

どの欄が何かは、株式評価明細書が配る**欄の辞書**（`GET /stock-valuation-form/api/field-catalog`）
だけが決める。このサーバーには様式の表も、欄の対応表も、単位の換算も入っていない
（金額の桁区切りや負数の `△` すら辞書の `formats` から来る）。

様式が変われば辞書が変わり、このサーバーは何も直さなくてよい。逆にここに写しを
持つと、様式を直したときに**片方だけ古いまま黙って動く**状態ができる。

辞書に無いコード・自動計算欄・単位違い・小数混入はすべて弾く。

## 道具

| 道具 | 何をするか |
| --- | --- |
| `describe_fields` | 書き込める欄の辞書。**書く前に必ず読む** |
| `list_cases` | 評価案件（会社1社ぶん）の一覧 |
| `get_case` | 1件の現在値。辞書に載っている欄と第5表の明細だけ |
| `set_fields` | コードで指定した欄へ書き込む（第4表の1） |
| `import_balance_sheet` | 第5表の明細を入れ替える |

**書き込みは既定で試算**。差分を返すだけで案件は変わらない。確定するのは
`commit: true` を付けて呼び直したときだけ。

## 使い方（Claude Desktop）

`%APPDATA%\Claude\claude_desktop_config.json` に追記する:

```json
{
  "mcpServers": {
    "tax-apps": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "--network", "tax-apps-network", "tax-apps-mcp"]
    }
  }
}
```

事前に1回だけイメージを作る（`docker-compose.yml` のサービスには
`profiles: ["mcp"]` が付いているので、`manage.sh start` では起動しない）:

```bash
cd apps/mcp-server && docker compose --profile mcp build mcp-server
```

**株式評価明細書が起動している必要がある**（`tax-apps-network` 上のサービス名で叩く）。
接続先を変えるときは `SVF_API_BASE` 環境変数。既定は
`http://stock-valuation-form:3014/stock-valuation-form/api` で、dev（Vite のプロキシ）でも
本番（Node 直）でも同じ URL で通る。

> dev サーバへ繋ぐには、Vite 側に `allowedHosts: ['stock-valuation-form']` が要る。
> Vite 7 は DNS リバインディング対策で localhost 以外の `Host` を 403 で弾くため
> （`apps/stock-valuation-form/vite.config.ts` に入れてある）。

## 取込中は画面を閉じておくこと

**画面でその案件を開いたまま MCP から書くと、ブラウザ側の自動保存に上書きされる。**

案件の自動保存も同じ `PUT /cases/:id` を叩き、しかも `data` をまるごと置き換える。
ブラウザは開いた時点の内容を持っているので、後から保存したほうが勝つ。

- 取込の前に、その案件を開いているタブを**閉じる**
- 取込が終わってから開き直す

同じサーバープロセスの中での書き込み同士は `src/lock.ts` が案件ごとに順番待ちにしている
（`set_fields` と `import_balance_sheet` を同時に呼ぶと、実際に第5表が丸ごと消えた）。
ただし防げるのはこのプロセスの中だけで、ブラウザとの競合は防ぎようがない。

## 案件データの扱い

**顧客の実名と財産内容が MCP クライアントへ渡る。** PDF を読ませる時点で同じ情報が
渡っているので新しく増える露出ではないが、渡っていること自体は変わらない。

## テスト

```bash
docker/scripts/manage.sh test mcp-server
```

常駐しないアプリなので、`TEST_TARGETS` では `run@mcp-server-test` 形式で登録してある
（稼働中のコンテナを探す代わりに `docker compose run --rm` で使い捨てのコンテナを立てる）。
同じ一覧が `.github/workflows/ci.yml` の matrix にもある。
