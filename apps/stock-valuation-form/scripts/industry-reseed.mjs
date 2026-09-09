// 年分アーカイブ（prisma/industry-data/*.json）の内容をDBへ反映し直す。
//
//   docker compose exec stock-valuation-form npm run industry:reseed
//     … 何をするかを一覧するだけ（DBは変わらない）
//   docker compose exec stock-valuation-form npm run industry:reseed -- --yes
//     … 一覧したとおりに実行する
//   docker compose exec stock-valuation-form npm run industry:reseed -- 2026 --yes
//     … 西暦年で対象を絞る（複数指定可）
//
// 起動時のシードは「未登録の年分だけ」入れる。`git pull` でアーカイブの中身が
// 直っても登録済みの年分は読み飛ばされるので、その反映口がこれ。
//
// 触るのはアーカイブのある年分だけ。ファイルが無い年分（画面から登録して
// `npm run industry:save` していないもの）には一切手を出さない ── 消しても
// 戻す先が無いため。一覧にはそれも出すので、書き戻し漏れがここで分かる。

import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_BASE, getJson, parseArgs, postJson, putJson } from './industryApi.mjs';

const DEFAULT_DIR = 'prisma/industry-data';

/** 年分アーカイブとして最低限の形を確かめる。本検証はサーバ側（parseArchive）。 */
function readArchive(file) {
  const archive = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (typeof archive !== 'object' || archive === null || Array.isArray(archive)) {
    throw new Error(`${path.basename(file)}: JSONの中身がオブジェクトではありません`);
  }
  if (typeof archive.era !== 'string' || !Number.isInteger(archive.eraYear)) {
    throw new Error(`${path.basename(file)}: 元号（era）と元号年（eraYear）がありません`);
  }
  if (!Array.isArray(archive.categories) || archive.categories.length === 0) {
    throw new Error(`${path.basename(file)}: 業種目（categories）が1件も入っていません`);
  }
  return archive;
}

function monthlyPriceCount(archive) {
  return archive.categories.reduce(
    (sum, category) => sum + (category.monthlyPrices?.length ?? 0),
    0,
  );
}

/** ディレクトリ内の全アーカイブを読む。名前順にして一覧の並びを安定させる。 */
function readArchiveDir(dir) {
  if (!fs.existsSync(dir)) throw new Error(`年分アーカイブのディレクトリがありません: ${dir}`);

  const files = fs.readdirSync(dir).filter((name) => name.endsWith('.json')).sort();
  if (files.length === 0) throw new Error(`年分アーカイブのJSONが1件もありません: ${dir}`);

  return files.map((name) => {
    const archive = readArchive(path.join(dir, name));
    return {
      file: name,
      archive,
      label: archive.label ?? `${archive.era}${archive.eraYear}年分`,
      categoryCount: archive.categories.length,
      monthlyPriceCount: monthlyPriceCount(archive),
    };
  });
}

/**
 * アーカイブとDBを突き合わせて、何をするかを決める。
 * 対象年（西暦）が指定されていれば、そこに挙がっていない年分は対象外にする。
 */
function planReseed(entries, registeredYears, wantedYears) {
  const wanted = (gregorianYear) =>
    wantedYears.length === 0 || wantedYears.includes(gregorianYear);

  const matched = new Set();
  const plan = entries.map((entry) => {
    const existing = registeredYears.find(
      (year) => year.era === entry.archive.era && year.eraYear === entry.archive.eraYear,
    );
    if (existing) matched.add(existing.gregorianYear);

    // 未登録の年分の西暦はファイル側の値で見る（DBに無いので引けない）。
    // 元号から導き直すのはサーバの役目なので、ここでは絞り込みの material としてだけ使う。
    const gregorianYear = existing?.gregorianYear
      ?? (Number.isInteger(entry.archive.gregorianYear) ? entry.archive.gregorianYear : null);

    // 西暦が読めないファイルは、年で絞っているときは対象から外す（取り違えを避ける）。
    const target = gregorianYear === null ? wantedYears.length === 0 : wanted(gregorianYear);

    return {
      ...entry,
      existing: existing ?? null,
      action: !target ? 'skip' : existing === undefined ? 'create' : 'replace',
    };
  });

  // アーカイブの無い年分。消したら戻せないので触らないが、書き戻し漏れとして知らせる。
  const orphans = registeredYears.filter((year) => !matched.has(year.gregorianYear));

  return { plan, orphans };
}

function printPlan(plan, orphans, dir) {
  console.log(`年分アーカイブ: ${dir}`);
  for (const row of plan) {
    const counts = `業種目 ${row.categoryCount} 件 / 月別株価 ${row.monthlyPriceCount} 件`;
    if (row.action === 'create') {
      console.log(`  [新規登録] ${row.label} ← ${row.file}（${counts}）`);
    } else if (row.action === 'replace') {
      console.log(`  [入れ直し] ${row.label} ← ${row.file}（${counts}）※現在の登録内容は破棄されます`);
    } else {
      console.log(`  [対象外]   ${row.label}（${row.file}）`);
    }
  }
  for (const year of orphans) {
    console.log(
      `  [触れない] ${year.label} … アーカイブがありません`
      + '（npm run industry:save で書き戻さないとバックアップ以外に復元手段がありません）',
    );
  }
}

async function runPlan(base, plan) {
  for (const row of plan) {
    if (row.action === 'skip') continue;

    const body = {
      era: row.archive.era,
      eraYear: row.archive.eraYear,
      categories: row.archive.categories,
    };

    const response = row.action === 'create'
      ? await postJson(base, '/industry-years', body)
      : await putJson(base, `/industry-years/${row.existing.gregorianYear}`, body);

    console.log(
      `${response.year.label}を${row.action === 'create' ? '登録しました' : '入れ直しました'}`
      + `（業種目 ${response.categoryCount} 件 / 月別株価 ${response.monthlyPriceCount} 件）`,
    );
  }
}

async function main() {
  const { options, rest } = parseArgs(process.argv.slice(2), ['yes']);
  const base = options.base ?? DEFAULT_BASE;
  const dir = options.dir ?? DEFAULT_DIR;

  const wantedYears = rest.map((value) => {
    const year = Number(value);
    if (!Number.isInteger(year)) throw new Error(`対象年は西暦の整数で指定してください: ${value}`);
    return year;
  });

  const entries = readArchiveDir(dir);
  const { years: registeredYears } = await getJson(base, '/industry-years');
  const { plan, orphans } = planReseed(entries, registeredYears, wantedYears);

  printPlan(plan, orphans, dir);

  const todo = plan.filter((row) => row.action !== 'skip');
  if (todo.length === 0) {
    console.log('対象の年分がありません。');
    return;
  }

  if (options.yes !== true) {
    console.log('');
    console.log('確認のみで終了しました。実行するには --yes を付けてください。');
    return;
  }

  console.log('');
  await runPlan(base, plan);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
