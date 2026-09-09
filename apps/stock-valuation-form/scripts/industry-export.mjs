// 登録済みの年分をJSONファイルへ書き出す。
//
//   npm run industry:save                   … 全年分を Git 管理下の prisma/industry-data/ へ
//   npm run industry:export                 … 全年分を ./output/industry-export/ へ（手元への控え）
//   npm run industry:export -- --year 2026  … 指定年分だけ
//   npm run industry:export -- --out /tmp/x --base http://host:3014/stock-valuation-form/api
//
// 書き出したファイルはそのまま industry-import.mjs（と管理画面の「JSONで入出力」）で戻せる。
// prisma/industry-data/ に置いたものは起動時のシード（server/seed.ts）が拾う。

import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_BASE, archiveFileName, getJson, parseArgs } from './industryApi.mjs';

async function main() {
  const { options } = parseArgs(process.argv.slice(2));
  const base = options.base ?? DEFAULT_BASE;
  const outDir = path.resolve(options.out ?? 'output/industry-export');

  let targets;
  if (options.year === undefined) {
    const { years } = await getJson(base, '/industry-years');
    targets = years.map((year) => year.gregorianYear);
    if (targets.length === 0) throw new Error('年分が1件も登録されていません');
  } else {
    const year = Number(options.year);
    if (!Number.isInteger(year)) throw new Error(`--year は西暦の整数で指定してください: ${options.year}`);
    targets = [year];
  }

  fs.mkdirSync(outDir, { recursive: true });

  for (const gregorianYear of targets) {
    const archive = await getJson(base, `/industry-years/${gregorianYear}/export`);
    // 書き出し時刻はファイルには残さない。Git 管理下に置くと中身が同じでも毎回差分に
    // なってしまうため。APIの応答（管理画面のダウンロード）からは落とさない。
    delete archive.exportedAt;
    const file = path.join(outDir, archiveFileName(archive.label, archive.gregorianYear));
    fs.writeFileSync(file, `${JSON.stringify(archive, null, 2)}\n`, 'utf8');

    const monthlyPriceCount = archive.categories
      .reduce((total, category) => total + category.monthlyPrices.length, 0);
    console.log(`${archive.label}: 業種目 ${archive.categories.length} 件 / 月別株価 ${monthlyPriceCount} 件 -> ${file}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
