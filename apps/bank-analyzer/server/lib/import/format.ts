// 取込できる形式の案内（依頼24）: ひな形の CSV と、通帳を OCR する AI に渡す指示文。
//
// 列は columns.ts の表、分類名・キーワード・贈与の閾値は呼ぶ側がいまの設定から渡す
// （分類名をここで持たない。設定で分類を足せば指示文にも出る）。画面からも使うので純粋な関数だけ置く。

import { GIFT_CATEGORY, OTHER_CATEGORY, TRANSFER_CATEGORY, UNCATEGORIZED } from '../categories.js';
import { IMPORT_COLUMNS, type StandardColumn } from './columns.js';

// 列の表のほかの決まり（画面・README・指示文で同じ文を使う）
export const IMPORT_RULES: readonly string[] = [
  '1行目を見出しの行にする（1行目が表題で2行目が見出しでもよい）。通帳の1行を1行に書く',
  '列は名前で読むので、並びが違っても読める。並びは下の表の順をすすめる',
  '必須でない列は、列ごと無くても、空欄でも、一部の行だけ書いてあってもよい',
  '文字コードは UTF-8（BOM の有無は問わない）か Shift_JIS。Excel（.xlsx）も読める。中身が CSV のテキスト（.txt）も CSV として読む',
  '日付も金額も無い行（通帳の「繰越」など）は取引でないので読み飛ばし、取込の手順3に一覧を出す。繰越の残高は1行目の残高を確かめる出発点にする',
  '読めない日付・金額や列ずれの疑いのある行（項目の数が見出しと違う・払戻額もお預り額も空欄・分類に金額・摘要に「\"」）は、ファイルを止めずに手順3の問題の行にする。直すか「このままでよい」か削除するまで取り込まない',
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

// 分類が入金・出金のどちらに付くか（指示文に添えるだけ。設定で足した分類は書かない）
const CATEGORY_SIDE: Readonly<Record<string, string>> = {
  生活費: '出金',
  給与: '入金',
  年金: '入金',
  [GIFT_CATEGORY]: '出金',
  税金: '出金',
  '修繕・資本': '出金',
  '事業・不動産': '入金・出金',
  関連会社: '入金・出金',
  '銀行・利息・手数料': '入金・出金',
  '証券・株式・配当': '入金・出金',
  保険会社: '入金・出金',
  [TRANSFER_CATEGORY]: '入金・出金',
  [OTHER_CATEGORY]: '入金・出金',
};

// 指示文でだけ書き方を絞る列（アプリはカンマ付きも読めるが、AI にはカンマを書かせない。
// 区切りのカンマと紛れて列がずれる。依頼26）
const AI_COLUMN_FORMAT: Partial<Record<StandardColumn, string>> = {
  date: '和暦は R6.8.12（令和）・H28.6.3（平成）の形、西暦は 2024-08-12 の形',
  amount_out: '数字だけ（カンマ・「円」・「¥」を付けない。例: 1773190）。無ければ空欄',
  amount_in: '払戻額と同じ書き方',
  balance: '払戻額と同じ書き方。通帳に無ければ空欄',
};

// 依頼26 で Gemini の読み取りを試して決めた文。繰越の行・列ずれ・半角カナの濁点・元号の無い日付・
// 振込がみな贈与になる、の5つを潰すように書いてある。長さは Gemini にそのまま貼れる範囲に保つ
export function aiInstruction(format: ImportFormat): string {
  const listed = format.categories.filter((c) => c.name !== UNCATEGORIZED);
  const names = listed.map((c) => c.name);
  const headerLine = IMPORT_COLUMNS.map((c) => c.name).join(',');
  const columnLines = IMPORT_COLUMNS.map((c) => `- ${c.name}（${c.required ? '必須' : '任意'}）: ${AI_COLUMN_FORMAT[c.key] ?? c.format}`);
  const categoryLines = listed.map((c) => {
    const side = CATEGORY_SIDE[c.name];
    // 贈与・教育費のキーワード（振込）は例に出さない。例にすると振込がみな贈与になる。下の決まりで書く
    const kw = c.name === GIFT_CATEGORY ? [] : c.keywords.slice(0, 8);
    const notes = [
      ...(side ? [`${side}`] : []),
      ...(kw.length > 0 ? [`摘要の例: ${kw.join('・')}${c.keywords.length > kw.length ? ' など' : ''}`] : []),
    ];
    return `- ${c.name}${notes.length > 0 ? `（${notes.join('。')}）` : ''}`;
  });

  return [
    '通帳の画像を読み取り、次の形式の CSV を作ってください。銀行取引分析アプリへそのまま取り込みます。',
    '返すのは CSV だけにしてください（前後に説明の文を付けない）。保存するときの拡張子は .csv です。',
    '',
    '## CSV の書き方',
    '- 1行目は見出し行。列は次の順に並べ、列名はこのとおりに書く',
    `  ${headerLine}`,
    `- どの行も項目は必ず${IMPORT_COLUMNS.length}個（見出しと同じ数）。書くことが無い項目も空欄で残す。返す前に全行の項目の数を数え直す`,
    '- 金額・残高は数字だけ。カンマを入れない（区切りのカンマと紛れて列がずれる）',
    '- 値に「,」や「"」が入るときは、値全体を「"」で囲む（中の「"」は「""」と2つ重ねる）',
    '- 文字コードは UTF-8',
    '- 1ファイルに複数の口座を入れるときは、全行に銀行名と口座番号を書く',
    '',
    '## 列の書き方',
    ...columnLines,
    '',
    '## 通帳の読み方',
    '- 通帳の1行の取引を CSV の1行にする。「繰越」「合計」「前ページより」「次ページへ」など、取引でない行は書かない',
    '- 行は通帳に印字された順のまま。ページをまたいで同じ行が2回写っていたら1回だけ書く',
    '- 摘要が2つの欄（摘要・お取引内容 など）に分かれていたら、空白1つでつないで摘要に書く',
    '- 通帳の列名が違っても意味で当てる（お支払金額・お引出し → 払戻額、お預り金額・ご入金 → お預り額、残高 → 差引残高）',
    '- 日付に元号が無いとき（6-08-12 など）は、表紙・前後のページ・取引の内容から元号を決めて R6.8.12 の形で書き、決めた根拠を1行目のメモに書く。決められなければ読めた数字のまま書き、要確認を「○」にする',
    '- 半角カナは全角カナにし、濁点・半濁点は前の字とまとめて1文字にする（ｾﾞ → ゼ、ﾎﾟ → ポ）。「"」や空白にしない',
    '- 口座番号は先頭の0を残す',
    '',
    '## 読めないとき・合わないとき',
    '- 前後の行や似た行から推測して埋めない。読めた所だけ書き、読めない字は「■」にして、メモに読めなかった箇所を書き、要確認を「○」にする',
    '- 検算: 前の行の差引残高 − 払戻額 ＋ お預り額 が、その行の差引残高と合うかを1行ずつ確かめる。合わない行は画像を読み直す。それでも合わなければ読めたとおりに書き、メモに「残高が合わない」と書いて要確認を「○」にする',
    '- 金額・残高は通帳のとおりに書く。計算で作らない（検算は確かめるためだけ）',
    '',
    '## 分類',
    '分類の列には次の名前のどれかを、このとおりに書く。ここに無い名前は作らない。（）は入金・出金のどちらに付く分類か。',
    ...categoryLines,
    ...(names.includes(GIFT_CATEGORY)
      ? [
          `- 「${GIFT_CATEGORY}」は、出金が${yen(format.giftThreshold)}以上の振込だけに付ける。入金には付けない。${yen(format.giftThreshold)}未満の振込は空欄にする`,
        ]
      : []),
    ...(names.includes(OTHER_CATEGORY) ? [`- どれにも当たらないとはっきり分かるものだけ「${OTHER_CATEGORY}」にする`] : []),
    '- 分類に迷ったら空欄にする（アプリが自動で分類する）。自信のあるものだけ書く',
  ].join('\n');
}
