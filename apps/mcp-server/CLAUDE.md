# CLAUDE.md（mcp-server）

ルートの `CLAUDE.md` から移した。詳細は `README.md`。


## MCP サーバー（外部の AI ツールから書き込む）

`apps/mcp-server` は **株式評価明細書へ数字を入れるための stdio MCP サーバー**。
法人税の申告書・決算書・内訳書の PDF を Claude Desktop 側に読ませ、読み取った数字を
評価案件の欄へ入れる経路。詳細は `apps/mcp-server/README.md`。

```bash
# イメージを作る（これだけ。常駐しない）
cd apps/mcp-server && docker compose --profile mcp build mcp-server
```

- **様式の知識をこちらに持たせない**。どの欄が何かは株式評価明細書が配る辞書
  （`GET /stock-valuation-form/api/field-catalog`）だけが決め、桁区切りや `△` の付け方まで
  そこから来る。写しを持つと**様式を直したとき片方だけ古いまま黙って動く**
- **書き込みは既定で試算**（`commit: true` で確定）。辞書に無いコード・自動計算欄・
  単位違い・小数混入は弾く。円→千円の換算はしない（丸めたことが誰にも見えなくなる）
- **常駐しない**ので `APPS` ではなく `UNMANAGED_APPS`、compose のサービスは
  `profiles: ["mcp"]`。MCP クライアントが `docker run -i --rm` で起動して終われば消える。
  テストだけは `TEST_TARGETS` の `run@mcp-server-test` から使い捨てコンテナで回る
- **取込中はその案件の画面を閉じておくこと**。画面の自動保存も同じ `PUT /cases/:id` を叩き、
  `data` をまるごと置き換えるので、開いたままだとブラウザ側が後から上書きする。
  同じプロセス内の書き込み同士は `src/lock.ts` が案件ごとに直列化している
  （`set_fields` と `import_balance_sheet` を同時に呼んで第5表が丸ごと消えるのを確認済み）
- dev の株式評価明細書へ繋ぐには Vite 側に `allowedHosts: ['stock-valuation-form']` が要る
  （Vite 7 は localhost 以外の `Host` を 403 で弾く）。`vite.config.ts` はイメージ同梱なので
  変更には `manage.sh build stock-valuation-form` が必要
