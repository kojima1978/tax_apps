// 取込できる形式の案内（依頼24）: ひな形の CSV と、通帳を OCR する AI に渡す指示文。
//
// 列は columns.ts の表、分類名・キーワード・贈与の閾値は呼ぶ側がいまの設定から渡す
// （分類名をここで持たない。設定で分類を足せば指示文にも出る）。画面からも使うので純粋な関数だけ置く。

import { GIFT_CATEGORY, OTHER_CATEGORY, UNCATEGORIZED } from '../categories.js';
import { IMPORT_COLUMNS } from './columns.js';

// 列の表のほかの決まり（画面・README・指示文で同じ文を使う）
export const IMPORT_RULES: readonly string[] = [
  '1行目を見出しの行にする（1行目が表題で2行目が見出しでもよい）。通帳の1行を1行に書く',
  '列は名前で読むので、並びが違っても読める。並びは下の表の順をすすめる',
  '必須でない列は、列ごと無くても、空欄でも、一部の行だけ書いてあってもよい',
  '文字コードは UTF-8（BOM の有無は問わない）か Shift_JIS。Excel（.xlsx）も読める',
  '1ファイルに複数の口座を入れるときは、全行に銀行名と口座番号を書く（口座ごとに分けて取り込む）',
  '一度に10ファイル・1ファイル10MBまで',
];

export type FormatCategory = { name: string; keywords: string[] };

export type ImportFormat = {
  categories: FormatCategory[]; // 選べる分類（未分類は除く）。並びは画面の分類と同じ
  giftThreshold: number;
};

// ひな形の例の行（架空の値）。差引残高がつながるように書いてある
const TEMPLATE_ROWS: readonly Record<string, string>[] = [
  { 日付: '2024-04-15', 摘要: '年金 ニホンネンキンキコウ', 払戻額: '', お預り額: '150000', 差引残高: '1150000', 分類: '年金' },
  { 日付: 'R6.4.20', 摘要: 'カード', 払戻額: '50000', お預り額: '', 差引残高: '1100000', 分類: '' },
  {
    日付: '令和6年4月25日',
    摘要: '振込 ヤマダ タロウ',
    払戻額: '1000000',
    お預り額: '',
    差引残高: '100000',
    分類: '',
    メモ: '振込先の名前が一部読めない',
    要確認: '○',
  },
];

const TEMPLATE_ACCOUNT = { 銀行名: 'さくら銀行', 支店名: '本店', 口座番号: '0012345', 種別: '普通' };

function csvCell(v: string): string {
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

// 見出し行＋例の行。改行は CRLF（Excel で開いたときに崩れないように）。BOM は付ける側で
export function templateCsv(): string {
  const header = IMPORT_COLUMNS.map((c) => c.name);
  const lines = [header, ...TEMPLATE_ROWS.map((r) => header.map((h) => ({ ...TEMPLATE_ACCOUNT, ...r })[h] ?? ''))];
  return lines.map((cells) => cells.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

// README の「取込できる形式」に載せる表（README と同じかはテストが確かめる）
export function formatGuideMarkdown(): string {
  const cell = (v: string) => v.replaceAll('|', '\\|');
  return [
    ...IMPORT_RULES.map((r) => `- ${r}`),
    '',
    '| 列の名前 | 必須 | 書き方 |',
    '|---|---|---|',
    ...IMPORT_COLUMNS.map(
      (c) => `| ${c.name}${c.aliases.length ? `（${c.aliases.join('・')} も可）` : ''} | ${c.required ? '必須' : '任意'} | ${cell(c.format)} |`,
    ),
  ].join('\n');
}

const yen = (n: number) => `${n.toLocaleString('ja-JP')}円`;

export function aiInstruction(format: ImportFormat): string {
  const names = format.categories.map((c) => c.name).filter((n) => n !== UNCATEGORIZED);
  const gift = format.categories.find((c) => c.name === GIFT_CATEGORY);
  const columnLines = IMPORT_COLUMNS.map((c) => `- ${c.name}（${c.required ? '必須' : '任意'}）: ${c.format}`);
  const categoryLines = format.categories
    .filter((c) => c.name !== UNCATEGORIZED)
    .map((c) => {
      const kw = c.keywords.slice(0, 8);
      return `- ${c.name}${kw.length > 0 ? `（摘要の例: ${kw.join('・')}${c.keywords.length > kw.length ? ' など' : ''}）` : ''}`;
    });

  return [
    '通帳の画像を読み取り、次の形式の CSV を作ってください。銀行取引分析アプリへそのまま取り込みます。',
    '',
    '## 形式',
    '- 1行目は見出し行。列は次の順に並べる（列名はこのとおりに書く）',
    `  ${IMPORT_COLUMNS.map((c) => c.name).join(',')}`,
    '- 通帳の1行を CSV の1行にする',
    '- 文字コードは UTF-8',
    '- 1ファイルに複数の口座を入れるときは、全行に銀行名と口座番号を書く',
    '- 必須でない列も見出しは残し、書くことが無ければ空欄にする',
    '',
    '## 列の書き方',
    ...columnLines,
    '',
    '## 分類',
    '分類の列には次の名前のどれかを、このとおりに書く。ここに無い名前は作らない。',
    ...categoryLines,
    ...(gift && names.includes(GIFT_CATEGORY)
      ? [
          `- 出金が${yen(format.giftThreshold)}以上で摘要に「${gift.keywords.join('・') || '振込'}」を含む取引は「${GIFT_CATEGORY}」にする（それ未満は摘要で判断する）`,
        ]
      : []),
    ...(names.includes(OTHER_CATEGORY) ? [`- どれにも当たらないとはっきり分かるものだけ「${OTHER_CATEGORY}」にする`] : []),
    '',
    '## 守ること',
    '- 金額・残高は通帳のとおりに書く。計算で作らない',
    '- 読めない字は推測で埋めない。メモに読めなかった箇所を書き、要確認を「○」にする',
    '- 分類に迷ったら空欄にする（アプリが自動で分類する）',
    '- 口座番号は先頭の0を残す',
  ].join('\n');
}
