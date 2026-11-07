# CLAUDE.md（stock-valuation-form）

ルートの `CLAUDE.md` から移した。


## スクリプト（Docker内で実行）

- 株式評価明細書 (stock-valuation-form): `npm run dev:all`（Vite 3014 + API 3114 を並走）/ `npm run build` + `npm run build:server`。本番は Node が 3014 で両方を配信
  - 業種目データの原本は `prisma/industry-data/*.json`（Git 管理）。起動時のシードが**未登録の年分だけ**取り込むので、`git pull` した環境は起動するだけで復元される。画面から年分を足したり訂正したら `docker compose exec stock-valuation-form npm run industry:save` で同ディレクトリへ書き戻してコミットすること（書き戻さないと Docker ボリュームの中だけの存在になる）。**個々の会社の情報はDBにしか無く、ここには入らない**（リポジトリは公開）
  - **登録済みの年分をアーカイブの内容で入れ直す**: `docker compose exec stock-valuation-form npm run industry:reseed`（引数なしは**何をするかの一覧だけ**でDBは変わらない。実行は `-- --yes`、年を絞るなら `-- 2026 --yes`）。`git pull` で `prisma/industry-data` の中身が直っても起動時のシードは登録済みの年分を読み飛ばすので、その反映口がこれ。**触るのはアーカイブのある年分だけ**で、ファイルの無い年分（画面から登録して `industry:save` していないもの）には手を出さず一覧に「触れない」として出す。起動時に環境変数で全年分を消して入れ直す仕組み（`SEED_FORCE`）は廃止した ── 環境変数はコンテナに残り続け（`docker compose restart` は environment を評価し直さない）、再起動のたびに全消し→再取込が走るため
  - **公表PDF（国税庁の別紙）からの取込**: PDFを `./output` に置いて `docker compose exec stock-valuation-form npm run industry:pdf -- output/<file>.pdf`。奇数ページ＝業種目マスタ＋B・C・D＋前年11月分・12月分、偶数ページ＝当年の各月株価（上段）と2年平均（下段）という構造を座標で読み、アーカイブと同じ形のJSONにする。**登録済みアーカイブとの差分まで出す**のが本体で、「増えた月」と「名称・内容・B・C・Dが改訂されていないこと」を確かめてから次に叩くコマンドを指示する。別紙は毎月更新されるが増えるのは月の列だけなので、通常は `-- <pdf> --only-new-months` で増えた月だけのファイルを作り → `industry:import -- <file> --months-only` → `industry:save`。マスタが改訂されていた場合だけアーカイブを差し替えて `industry:reseed`。変換は `pdfjs-dist`（devDependencies）に依存するので**開発イメージでしか動かない**（本番は `npm install --omit=dev`）
  - 業種目データの持ち運び: `npm run industry:export`（全年分を `output/industry-export/` へ。手元への控え用）/ `npm run industry:import -- <file>`。管理画面の「JSONで入出力」タブと同じ経路。「年分だけを消す」APIは無いので、登録済みの年分へは `--months-only` で月別株価だけ上書きする（まるごと入れ直すなら上の `industry:reseed`）
