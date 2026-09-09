// 国税庁「類似業種比準価額計算上の業種目及び業種目別株価等」の別紙PDFを、
// 管理画面・CLIと同じ形のJSONへ変換する。
//
//   npm run industry:pdf -- output/list_all.pdf
//   npm run industry:pdf -- output/list_all.pdf --only-new-months
//   npm run industry:pdf -- output/list_all.pdf --out output/x.json --compare <archive.json>
//   npm run industry:pdf -- output/list_all.pdf --no-compare
//
// 別紙は毎月更新されるが、載っている業種目とB・C・Dはその年分の間そのままで、
// 右へ新しい月の列が増えていくだけ ── という前提で運用してよいかどうかは
// 毎回確かめないと分からない。そこで登録済みのアーカイブと突き合わせ、
// 「増えた月」と「マスタが改訂されていないこと」を出すところまでをこのスクリプトが持つ。
// DBへ入れるのは industry-import.mjs / industry-reseed.mjs の仕事。
//
// PDFの構造（奇数ページと偶数ページが同じ業種目のかたまりを扱う）:
//   奇数 … 業種目名（大中小で字下げが違う）・番号・内容・B配当・C利益・D簿価純資産・
//          前年平均・前年11月分・前年12月分
//   偶数 … 当年の各月株価（上段）と課税時期の属する月以前2年間の平均株価（下段）
//
// 実行はコンテナの中を前提にしている（ローカルに node_modules を作らないため）:
//   docker compose exec stock-valuation-form npm run industry:pdf -- output/list_all.pdf
// PDFはホストから ./output に置けばコンテナの /app/output から見える（唯一の書き込み可の経路）。

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { archiveFileName, parseArgs } from './industryApi.mjs';

// --- PDFの座標（すべてポイント。左上原点で top を数える） ------------------

const NUMBER_X = [176, 196];   // 業種目番号の列
const DESCRIPTION_X0 = 196;    // 内容欄の左端
const METRIC_X0 = 370;         // B以降の数値列の左端（マスタ面）
const MONTH_X0 = 205;          // 月別株価の数値列の左端（月次面）
const BODY_TOP = [190, 800];   // 表の中身。上はヘッダ、下はページ番号を外す
const MONTH_PITCH = 28.8;      // 月の列ピッチ
const LINE_TOLERANCE = 3.0;    // 同じ行とみなす縦のずれ
const INDENT_TOLERANCE = 2.0;  // 同じ字下げ段とみなす横のずれ

const ERA_OFFSETS = new Map([['令和', 2018], ['平成', 1988], ['昭和', 1925]]);

const LEVELS = ['LARGE', 'MIDDLE', 'SMALL'];

// --- 文字と数値 -------------------------------------------------------------

// 数値の判定・変換のときだけ NFKC で全角を潰す。業種目名や内容は
// 「（木造建築工事業を除く）」の全角括弧まで半角になってしまうので触らない。
const half = (text) => text.normalize('NFKC').replace(/,/g, '');

// PDFは欄の幅いっぱいに字間を空けて名称を組むことがあり、pdfjs はその字間を
// 空白として返す（「畜 産 食 料 品 製 造 業」）。公表データの名称・内容に
// 空白は入らないので、組み立てたところで落とす。
const squeeze = (parts) => parts.join('').replace(/\s+/gu, '');

function toInt(text, what) {
  const normalized = half(text);
  if (!/^[0-9]+$/.test(normalized)) {
    throw new Error(`${what}: 整数として読めません: ${JSON.stringify(text)}`);
  }
  return Number(normalized);
}

function toNumber(text, what) {
  const normalized = half(text);
  if (!/^[0-9]+(?:\.[0-9]+)?$/.test(normalized)) {
    throw new Error(`${what}: 数値として読めません: ${JSON.stringify(text)}`);
  }
  return Number(normalized);
}

// --- PDFの読み出し ----------------------------------------------------------

async function loadPdfjs() {
  try {
    return await import('pdfjs-dist/legacy/build/pdf.mjs');
  } catch {
    throw new Error(
      'pdfjs-dist が見つかりません。PDFの変換は開発イメージの中で実行してください'
      + '（本番イメージは npm install --omit=dev なので devDependencies が入りません）',
    );
  }
}

async function openPdf(file) {
  const { getDocument } = await loadPdfjs();
  const require = createRequire(import.meta.url);
  const root = path.dirname(require.resolve('pdfjs-dist/package.json'));
  return getDocument({
    data: new Uint8Array(fs.readFileSync(file)),
    // 埋め込みフォントだけで読める別紙では使われないが、CMap頼みのPDFに当たっても
    // 落ちないように場所だけ教えておく。
    cMapUrl: `${path.join(root, 'cmaps')}/`,
    cMapPacked: true,
  }).promise;
}

/** ページの文字を座標つきの語として取り出す。 */
async function wordsOf(page) {
  const pageHeight = page.view[3];
  const words = [];
  for (const item of (await page.getTextContent()).items) {
    if (typeof item.str !== 'string') continue;
    const text = item.str.trim();
    if (text === '') continue;
    words.push({
      text,
      top: pageHeight - item.transform[5],
      x0: item.transform[4],
      x1: item.transform[4] + item.width,
    });
  }
  return words;
}

/** 見出しとページ番号を落として、表の中身だけにする。 */
const inBody = (word) => word.top >= BODY_TOP[0] && word.top <= BODY_TOP[1];

/** 語を行にまとめる。番号と名称でフォントが違い数ptずれるので許容幅を持たせる。 */
function linesOf(words) {
  const lines = [];
  for (const word of [...words].sort((a, b) => a.top - b.top || a.x0 - b.x0)) {
    const line = lines.find((candidate) => Math.abs(candidate.top - word.top) <= LINE_TOLERANCE);
    if (line) line.words.push(word);
    else lines.push({ top: word.top, words: [word] });
  }
  for (const line of lines) line.words.sort((a, b) => a.x0 - b.x0);
  return lines;
}

const isNumberWord = (word) =>
  word.x0 >= NUMBER_X[0] && word.x0 <= NUMBER_X[1] && /^[0-9]{1,3}$/.test(half(word.text));

/** 業種目番号のある行を起点に、次の番号の直前までを1業種目のかたまりとする。 */
function bandsOf(page, lines) {
  // 表の下の (注) 書きは名称の列と同じ左端に来る。最後の業種目が飲み込むので先に切る。
  const noteIndex = lines.findIndex((line) => /^[(（]注[)）]/.test(line.words[0].text));
  const body = noteIndex === -1 ? lines : lines.slice(0, noteIndex);

  const starts = [];
  body.forEach((line, index) => {
    const word = line.words.find(isNumberWord);
    if (word) starts.push({ index, number: toInt(word.text, `p${page}の業種目番号`) });
  });
  if (starts.length === 0) throw new Error(`p${page}: 業種目番号が1つも見つかりません`);

  return starts.map((start, position) => ({
    number: start.number,
    lines: body.slice(start.index, position + 1 < starts.length ? starts[position + 1].index : body.length),
  }));
}

// --- 奇数ページ（業種目マスタ） ---------------------------------------------

function parseMasterPage(page, lines) {
  return bandsOf(page, lines).map(({ number, lines: band }) => {
    const what = `p${page}の業種目${number}`;
    const nameParts = [];
    const descriptionParts = [];
    const metrics = [];
    let nameX0 = null;

    for (const line of band) {
      for (const word of line.words) {
        if (isNumberWord(word)) continue;
        if (word.x0 < NUMBER_X[0]) {
          nameParts.push(word.text);
          if (nameX0 === null || word.x0 < nameX0) nameX0 = word.x0;
        } else if (word.x0 >= METRIC_X0) {
          metrics.push(word);
        } else if (word.x0 >= DESCRIPTION_X0) {
          descriptionParts.push(word.text);
        }
      }
    }

    if (nameX0 === null) throw new Error(`${what}: 業種目名が見つかりません`);
    if (metrics.length !== 6) {
      const found = metrics.map((word) => `${word.text}@${word.x0.toFixed(0)}`).join(' ');
      throw new Error(`${what}: 数値列がB・C・D・前年平均・前年11月分・前年12月分の6つではありません -> ${found}`);
    }
    metrics.sort((a, b) => a.x0 - b.x0);

    return {
      number,
      name: squeeze(nameParts),
      nameX0,
      description: squeeze(descriptionParts),
      dividend: toNumber(metrics[0].text, `${what}のB`),
      profit: toInt(metrics[1].text, `${what}のC`),
      netAsset: toInt(metrics[2].text, `${what}のD`),
      previousYearAveragePrice: toInt(metrics[3].text, `${what}の前年平均`),
      previousNovember: toInt(metrics[4].text, `${what}の前年11月分`),
      previousDecember: toInt(metrics[5].text, `${what}の前年12月分`),
    };
  });
}

// --- 偶数ページ（月別株価） -------------------------------------------------

// 列が飛んでいないことをピッチで確かめる。数字は右揃えなので右端で測る
// （同じ行に「972」と「1,060」が並ぶと左端の間隔は揃わない）。
function assertUniformPitch(words, what) {
  for (let index = 1; index < words.length; index += 1) {
    const gap = words[index].x1 - words[index - 1].x1;
    if (Math.abs(gap - MONTH_PITCH) > 1.0) {
      throw new Error(`${what}: 月の列の間隔が ${gap.toFixed(1)}pt です（${MONTH_PITCH}pt のはず）`);
    }
  }
}

function parseMonthlyPage(page, lines) {
  const rows = new Map();

  for (const { number, lines: band } of bandsOf(page, lines)) {
    const what = `p${page}の業種目${number}`;
    const groups = [];
    for (const line of band) {
      const numbers = line.words.filter((word) => word.x0 >= MONTH_X0);
      if (numbers.length === 0) continue;
      assertUniformPitch(numbers, what);
      groups.push(numbers.map((word) => toInt(word.text, `${what}の月別株価`)));
    }

    if (groups.length !== 2) {
      throw new Error(`${what}: 各月の株価と2年平均の2段になっていません（${groups.length}段）`);
    }
    if (groups[0].length !== groups[1].length) {
      throw new Error(`${what}: 上段 ${groups[0].length} 列に対し下段が ${groups[1].length} 列です`);
    }
    if (groups[0].length < 1 || groups[0].length > 12) {
      throw new Error(`${what}: 月の列が ${groups[0].length} 個あります`);
    }
    rows.set(number, { prices: groups[0], twoYearAverages: groups[1] });
  }

  return rows;
}

// --- 組み立て ---------------------------------------------------------------

/** 名称の左端で大中小を決める。深く字下げされているほど下位の分類。 */
function levelResolver(masters) {
  const groups = [];
  for (const x0 of masters.map((row) => row.nameX0).sort((a, b) => a - b)) {
    const last = groups[groups.length - 1];
    if (last !== undefined && x0 - last <= INDENT_TOLERANCE) continue;
    groups.push(x0);
  }
  if (groups.length !== LEVELS.length) {
    const found = groups.map((x0) => x0.toFixed(1)).join(', ');
    throw new Error(`名称の字下げが大・中・小の3段になっていません: ${found}`);
  }
  return (x0) => LEVELS[groups.findIndex((left) => x0 - left <= INDENT_TOLERANCE)];
}

function detectYear(words, options) {
  if (options.era !== undefined || options['era-year'] !== undefined) {
    const era = options.era;
    const eraYear = Number(options['era-year']);
    if (!ERA_OFFSETS.has(era)) throw new Error(`--era が元号ではありません: ${era}`);
    if (!Number.isInteger(eraYear)) throw new Error(`--era-year は整数で指定してください: ${options['era-year']}`);
    return { era, eraYear, gregorianYear: ERA_OFFSETS.get(era) + eraYear };
  }

  // 「(注)」書きにも「令和８年分」が出てくるので、見出しの語だけを見る。
  const title = words
    .map((word) => word.text.normalize('NFKC'))
    .find((text) => text.includes('業種目別株価等'));
  const match = title === undefined ? null : /(令和|平成|昭和)\s*([0-9]+)\s*年分/.exec(title);
  if (match === null) {
    throw new Error('PDFの見出しから年分を読み取れません。--era 令和 --era-year 8 のように指定してください');
  }
  const eraYear = Number(match[2]);
  return { era: match[1], eraYear, gregorianYear: ERA_OFFSETS.get(match[1]) + eraYear };
}

async function parsePdf(file, options) {
  const pdf = await openPdf(file);
  if (pdf.numPages % 2 !== 0) {
    throw new Error(`ページ数が偶数ではありません（${pdf.numPages}）。奇数=マスタ・偶数=月別株価の対が崩れています`);
  }

  const masters = [];
  const monthlies = new Map();
  let year = null;

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const words = await wordsOf(await pdf.getPage(pageNumber));
    if (pageNumber === 1) year = detectYear(words, options);
    const lines = linesOf(words.filter(inBody));
    if (pageNumber % 2 === 1) masters.push(...parseMasterPage(pageNumber, lines));
    else for (const [number, row] of parseMonthlyPage(pageNumber, lines)) monthlies.set(number, row);
  }

  const numbers = masters.map((row) => row.number);
  const expected = numbers.map((_, index) => index + 1);
  if (numbers.join(',') !== expected.join(',')) {
    throw new Error(`業種目番号が1..${numbers.length}の連番ではありません: ${numbers.slice(0, 20).join(', ')} ...`);
  }

  const monthCounts = new Set([...monthlies.values()].map((row) => row.prices.length));
  if (monthCounts.size !== 1) {
    throw new Error(`業種目によって月の数が違います: ${[...monthCounts].sort((a, b) => a - b).join(', ')}`);
  }

  const levelOf = levelResolver(masters);
  const categories = [];
  let largeName = '';
  let middleName = '';

  for (const row of masters) {
    const level = levelOf(row.nameX0);
    if (level === 'LARGE') {
      largeName = row.name;
      middleName = '';
    } else if (level === 'MIDDLE') {
      middleName = row.name;
    }
    const smallName = level === 'SMALL' ? row.name : '';

    const monthly = monthlies.get(row.number);
    if (monthly === undefined) throw new Error(`業種目${row.number}: 月別株価のページが見つかりません`);

    const monthlyPrices = [
      { year: year.gregorianYear - 1, month: 11, price: row.previousNovember, twoYearAveragePrice: null },
      { year: year.gregorianYear - 1, month: 12, price: row.previousDecember, twoYearAveragePrice: null },
      ...monthly.prices.map((price, index) => ({
        year: year.gregorianYear,
        month: index + 1,
        price,
        twoYearAveragePrice: monthly.twoYearAverages[index],
      })),
    ];

    categories.push({
      number: row.number,
      largeName,
      middleName,
      smallName,
      name: row.name,
      level,
      description: row.description,
      dividend: row.dividend,
      profit: row.profit,
      netAsset: row.netAsset,
      previousYearAveragePrice: row.previousYearAveragePrice,
      monthlyPrices,
    });
  }

  return {
    formatVersion: 1,
    label: `${year.era}${year.eraYear}年分`,
    era: year.era,
    eraYear: year.eraYear,
    gregorianYear: year.gregorianYear,
    categories,
  };
}

// --- 登録済みアーカイブとの突き合わせ ---------------------------------------

const MASTER_FIELDS = [
  ['name', '名称'],
  ['level', '分類'],
  ['description', '内容'],
  ['dividend', 'B配当'],
  ['profit', 'C利益'],
  ['netAsset', 'D簿価純資産'],
  ['previousYearAveragePrice', '前年平均'],
];

const monthKey = (price) => `${price.year}-${price.month}`;
const monthLabel = (key) => `${key.split('-')[0]}年${key.split('-')[1]}月分`;

function diffArchives(current, previous) {
  const before = new Map(previous.categories.map((category) => [category.number, category]));
  const after = new Map(current.categories.map((category) => [category.number, category]));

  const added = [...after.keys()].filter((number) => !before.has(number));
  const removed = [...before.keys()].filter((number) => !after.has(number));
  const masterChanges = [];
  const newMonths = new Set();
  const changedMonths = new Set();

  for (const [number, category] of after) {
    const old = before.get(number);
    if (old === undefined) continue;

    for (const [field, label] of MASTER_FIELDS) {
      if (category[field] !== old[field]) {
        masterChanges.push(`業種目${number} ${label}: ${JSON.stringify(old[field])} -> ${JSON.stringify(category[field])}`);
      }
    }

    const oldPrices = new Map(old.monthlyPrices.map((price) => [monthKey(price), price]));
    for (const price of category.monthlyPrices) {
      const key = monthKey(price);
      const oldPrice = oldPrices.get(key);
      if (oldPrice === undefined) newMonths.add(key);
      else if (oldPrice.price !== price.price || oldPrice.twoYearAveragePrice !== price.twoYearAveragePrice) {
        changedMonths.add(key);
      }
    }
  }

  const sortMonths = (keys) => [...keys].sort((a, b) => {
    const [ay, am] = a.split('-').map(Number);
    const [by, bm] = b.split('-').map(Number);
    return ay - by || am - bm;
  });

  return { added, removed, masterChanges, newMonths: sortMonths(newMonths), changedMonths: sortMonths(changedMonths) };
}

function readArchive(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/** 差分で増えた月だけを残す（--months-only での取込用）。マスタはそのまま残す。 */
function keepOnly(archive, months) {
  const keep = new Set(months);
  return {
    ...archive,
    categories: archive.categories.map((category) => ({
      ...category,
      monthlyPrices: category.monthlyPrices.filter((price) => keep.has(monthKey(price))),
    })),
  };
}

// --- 出力 -------------------------------------------------------------------

function defaultOutFile(archive, months) {
  const name = months === null
    ? archiveFileName(archive.label, archive.gregorianYear)
    : `業種目別株価_${archive.label}_${archive.gregorianYear}_${months.map((key) => key.split('-')[1].padStart(2, '0')).join('-')}.json`;
  return path.join('output', name);
}

function report(archive, diff, outFile, onlyNewMonths) {
  const monthlyPriceCount = archive.categories
    .reduce((total, category) => total + category.monthlyPrices.length, 0);
  console.log(`${archive.label}（${archive.gregorianYear}年）: 業種目 ${archive.categories.length} 件 / 月別株価 ${monthlyPriceCount} 件`);
  console.log(`  -> ${outFile}`);

  if (diff === null) {
    console.log('登録済みのアーカイブと比べていません。年分ごと取り込むなら:');
    console.log(`  npm run industry:import -- ${outFile}`);
    return;
  }

  if (diff.added.length > 0) console.log(`  業種目が増えました: ${diff.added.join(', ')}`);
  if (diff.removed.length > 0) console.log(`  業種目が減りました: ${diff.removed.join(', ')}`);
  console.log(diff.masterChanges.length === 0
    ? '  名称・内容・B・C・D・前年平均: 変更なし'
    : `  名称・内容・B・C・D・前年平均: ${diff.masterChanges.length} 件の変更`);
  for (const change of diff.masterChanges.slice(0, 20)) console.log(`    ${change}`);
  if (diff.masterChanges.length > 20) console.log(`    ... ほか ${diff.masterChanges.length - 20} 件`);

  console.log(diff.newMonths.length === 0
    ? '  増えた月: なし'
    : `  増えた月: ${diff.newMonths.map(monthLabel).join(' / ')}`);
  if (diff.changedMonths.length > 0) {
    console.log(`  値が変わった月: ${diff.changedMonths.map(monthLabel).join(' / ')}`);
  }

  const revised = diff.added.length > 0 || diff.removed.length > 0
    || diff.masterChanges.length > 0 || diff.changedMonths.length > 0;

  console.log('');
  if (revised) {
    console.log('改訂されています。アーカイブを差し替えたうえで年分ごと入れ直してください:');
    console.log(`  cp ${outFile} prisma/industry-data/${archiveFileName(archive.label, archive.gregorianYear)}`);
    console.log(`  npm run industry:reseed -- ${archive.gregorianYear} --yes`);
  } else if (diff.newMonths.length > 0) {
    console.log('増えたのは月の列だけです。月別株価だけ取り込めます:');
    console.log(`  npm run industry:import -- ${outFile} --months-only`);
    if (!onlyNewMonths) console.log('  （--only-new-months を付けると増えた月だけのファイルになります）');
    console.log('  取込後は npm run industry:save でアーカイブへ書き戻すこと');
  } else {
    console.log('登録済みの内容と同じです。取り込むものはありません。');
  }
}

// --- 入口 -------------------------------------------------------------------

async function main() {
  const { options, rest } = parseArgs(process.argv.slice(2), ['only-new-months', 'no-compare']);
  if (rest.length !== 1) {
    throw new Error('変換するPDFを1つ指定してください（例: npm run industry:pdf -- output/list_all.pdf）');
  }

  const archive = await parsePdf(rest[0], options);

  const defaultCompare = path.join('prisma/industry-data', archiveFileName(archive.label, archive.gregorianYear));
  const compareFile = options['no-compare'] === true
    ? null
    : options.compare ?? (fs.existsSync(defaultCompare) ? defaultCompare : null);
  const diff = compareFile === null ? null : diffArchives(archive, readArchive(compareFile));

  const onlyNewMonths = options['only-new-months'] === true;
  if (onlyNewMonths && diff === null) {
    throw new Error('--only-new-months は登録済みアーカイブとの比較が要ります（--compare で指定してください）');
  }
  if (onlyNewMonths && diff.newMonths.length === 0) {
    throw new Error('増えた月がありません。--only-new-months を外してください');
  }

  const output = onlyNewMonths ? keepOnly(archive, diff.newMonths) : archive;
  const outFile = options.out ?? defaultOutFile(archive, onlyNewMonths ? diff.newMonths : null);
  fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
  fs.writeFileSync(outFile, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

  if (compareFile !== null) console.log(`比較対象: ${compareFile}`);
  report(output, diff, outFile, onlyNewMonths);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
