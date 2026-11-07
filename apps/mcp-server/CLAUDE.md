# CLAUDE.md（mcp-server）

ルートの `CLAUDE.md` から移した。詳細は `README.md`、AI 向けの取込手順は `INTAKE.md`。


## MCP サーバー（外部の AI ツールから書き込む）

`apps/mcp-server` は **株式評価明細書へ数字を入れるための stdio MCP サーバー**。
法人税の申告書・決算書・内訳書の PDF を Claude Desktop 側に読ませ、読み取った数字を
評価案件の欄へ入れる経路。詳細は `apps/mcp-server/README.md`。

```bash
# イメージ作成と Claude デスクトップへの登録を1回で（既存の設定はマージ・控えつき）
docker/scripts/setup-mcp.sh

# イメージだけ作り直す（リポジトリ直下から -f。常駐しないので起動はしない）
docker compose -f apps/mcp-server/docker-compose.yml --profile mcp build mcp-server
```

- **様式の知識をこちらに持たせない**。どの欄が何かは株式評価明細書が配る辞書
  （`GET /stock-valuation-form/api/field-catalog`）だけが決め、桁区切りや `△` の付け方まで
  そこから来る。写しを持つと**様式を直したとき片方だけ古いまま黙って動く**。
  欄のコードは「様式の略号:識別記号」（`4-1:G01`）── 記号は様式ごとに振り直されているので
  略号まで含める。明細行の表（第5表の資産・負債、第1表の1 の株主）も辞書が列と選択肢を持つ
- **書き込みは既定で試算**（`commit: true` で確定）。辞書に無いコード・自動計算欄・
  単位違い・小数混入は弾く。円→千円の換算はしない（丸めたことが誰にも見えなくなる）
- **どこを自動で入れたかの控え**（`source` → `src/intake.ts`）。付けた欄は画面で印が付き
  「取込の確認」に出る（印刷には出さない）。置き場所も鍵の形も辞書の `intake` が決める。
  **人の指示で直すだけのときは付けない**（出典なしで書いた欄は前の控えを落とす ──
  古い出典が残ると画面が嘘をつく）。`confirmed` は画面だけが立てるので外から渡せない。
  明細行は行ごとに先頭列の1つだけに付く
- **登録と作り直しの口は `docker/scripts/setup-mcp.sh`**（`setup-mcp.bat` はダブルクリック用）。
  `%APPDATA%\Claude\claude_desktop_config.json` を書き換えるので、**ほかの MCP サーバーも
  `mcpServers` 以外の項目も消さずにマージし、変更前の控えを取り、読めない JSON なら1バイトも
  書かずに終了コード 3 で止まる**。JSON のマージは docker の中の node（ホストに node も python も
  要らない）。`manage.sh build mcp-server` は使えない（`APPS` に載っていない）ので、
  **`src/` を直したらこのスクリプトを叩き直す**。テストは `docker/scripts/tests/setup-mcp.test.sh`
  （CI の shell scripts ジョブ）
- **常駐しない**ので `APPS` ではなく `UNMANAGED_APPS`、compose のサービスは
  `profiles: ["mcp"]`。MCP クライアントが `docker run -i --rm` で起動して終われば消える。
  テストだけは `TEST_TARGETS` の `run@mcp-server-test` から使い捨てコンテナで回る
- **取込中はその案件の画面を閉じておくこと**。画面の自動保存も同じ `PUT /cases/:id` を叩き、
  `data` をまるごと置き換えるので、開いたままだとブラウザ側が後から上書きする。
  同じプロセス内の書き込み同士は `src/lock.ts` が案件ごとに直列化している
  （`set_fields` と `import_rows` を同時に呼んで第5表が丸ごと消えるのを確認済み）
- dev の株式評価明細書へ繋ぐには Vite 側に `allowedHosts: ['stock-valuation-form']` が要る
  （Vite 7 は localhost 以外の `Host` を 403 で弾く）。`vite.config.ts` はイメージ同梱なので
  変更には `manage.sh build stock-valuation-form` が必要
