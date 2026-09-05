// 書き出したJSONを読み込んで復元する。
//
//   npm run industry:import -- industry-export/業種目データ_令和8年分_2026.json
//   npm run industry:import -- <file> --months-only   … 登録済みの年分へ月別株価だけ流し込む
//
// 未登録の年分は業種目マスタ・B・C・D・月別株価を1トランザクションで作る。
// 既に登録済みの年分は作り直せない（年分の削除APIを用意していない）ので、
// 月別株価だけの上書き取込に限る。まるごと戻すならバックアップからのリストアで対応する。

import fs from 'node:fs';
import { DEFAULT_BASE, getJson, parseArgs, postJson } from './industryApi.mjs';

/** 月別株価を (年, 月) ごとにまとめる。月次取込APIは1回につき1ヶ月分。 */
function groupMonthlyPrices(categories) {
  const groups = new Map();

  for (const category of categories) {
    for (const price of category.monthlyPrices ?? []) {
      const key = `${price.year}-${price.month}`;
      if (!groups.has(key)) groups.set(key, { year: price.year, month: price.month, rows: [] });
      groups.get(key).rows.push({
        number: category.number,
        price: price.price,
        twoYearAveragePrice: price.twoYearAveragePrice ?? null,
      });
    }
  }

  return [...groups.values()].sort((a, b) => a.year - b.year || a.month - b.month);
}

/** ファイルを取り違えたときにここで気付けるだけの最小限の確認。本検証はサーバ側。 */
function readArchive(file) {
  const archive = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (typeof archive !== 'object' || archive === null || Array.isArray(archive)) {
    throw new Error(`${file}: JSONの中身がオブジェクトではありません`);
  }
  if (typeof archive.era !== 'string' || !Number.isInteger(archive.eraYear)) {
    throw new Error(`${file}: 元号（era）と元号年（eraYear）がありません。年分の書き出しファイルですか？`);
  }
  if (!Array.isArray(archive.categories) || archive.categories.length === 0) {
    throw new Error(`${file}: 業種目（categories）が1件も入っていません`);
  }
  return archive;
}

async function importArchive(base, file, monthsOnly) {
  const archive = readArchive(file);
  const label = archive.label ?? `${archive.era}${archive.eraYear}年分`;

  const { years } = await getJson(base, '/industry-years');
  const existing = years.find(
    (year) => year.era === archive.era && year.eraYear === archive.eraYear,
  );

  if (!existing && monthsOnly) {
    throw new Error(`${label}は未登録です。--months-only を外して年分ごと登録してください`);
  }

  if (!existing) {
    const response = await postJson(base, '/industry-years', {
      era: archive.era,
      eraYear: archive.eraYear,
      categories: archive.categories,
    });
    console.log(
      `${response.year.label}を復元しました`
      + `（業種目 ${response.categoryCount} 件 / 月別株価 ${response.monthlyPriceCount} 件）`,
    );
    return;
  }

  if (!monthsOnly) {
    throw new Error(
      `${label}は既に登録されています。`
      + '月別株価だけ上書きするなら --months-only を付けてください'
      + '（業種目マスタとB・C・Dの作り直しはできません）',
    );
  }

  const groups = groupMonthlyPrices(archive.categories);
  if (groups.length === 0) throw new Error(`${file}: 月別株価が1件も入っていません`);

  let created = 0;
  let updated = 0;
  for (const group of groups) {
    const response = await postJson(base, `/industry-years/${existing.gregorianYear}/monthly-prices`, {
      year: group.year,
      month: group.month,
      rows: group.rows,
    });
    created += response.created;
    updated += response.updated;
    console.log(`  ${group.year}年${group.month}月分: 新規 ${response.created} 件 / 上書き ${response.updated} 件`);
  }
  console.log(`${existing.label}の月別株価を取り込みました（新規 ${created} 件 / 上書き ${updated} 件）`);
}

async function main() {
  const { options, rest } = parseArgs(process.argv.slice(2), ['months-only']);
  if (rest.length === 0) {
    throw new Error('読み込むJSONファイルを指定してください（例: npm run industry:import -- 業種目データ_令和8年分_2026.json）');
  }

  const base = options.base ?? DEFAULT_BASE;
  for (const file of rest) {
    await importArchive(base, file, options['months-only'] === true);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
