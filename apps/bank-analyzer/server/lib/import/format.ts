// 取込できる形式の案内（依頼24）: ひな形の CSV と、通帳を OCR する AI に渡す指示文。
//
// 列は columns.ts の表、分類名・キーワード・贈与の閾値は呼ぶ側がいまの設定から渡す
// （分類名をここで持たない。設定で分類を足せば指示文にも出る）。画面からも使うので純粋な関数だけ置く。

import { GIFT_CATEGORY, OTHER_CATEGORY, TRANSFER_CATEGORY, UNCATEGORIZED } from '../categories.js';
import { IMPORT_COLUMNS, type StandardColumn } from './columns.js';
import { eraLabel, type EraChoice } from './eralessDates.js';

// 列の表のほかの決まり（画面・README・指示文で同じ文を使う）
export const IMPORT_RULES: readonly string[] = [
  '1行目を見出しの行にする（1行目が表題で2行目が見出しでもよい）。通帳の1行を1行に書く',
  '列は名前で読むので、並びが違っても読める。並びは下の表の順をすすめる',
  '必須でない列は、列ごと無くても、空欄でも、一部の行だけ書いてあってもよい',
  '文字コードは UTF-8（BOM の有無は問わない）か Shift_JIS。Excel（.xlsx）も読める。中身が CSV のテキスト（.txt）も CSV として読む',
  '日付も金額も無い行（通帳の「繰越」など）は取引でないので読み飛ばし、取込の手順3に一覧を出す。繰越の残高は1行目の残高を確かめる出発点にする',
  '元号の無い日付（6-08-12・6.8.12・06/08/12）は、手順3で元号を選んでまとめて直す。年が戻る所（31-04-26 の次が 1-05-07）で区切り、区切りごとに別の元号を当てられる',
  '読めない日付・金額や列ずれの疑いのある行（項目の数が見出しと違う・払戻額もお預り額も空欄・分類に金額・摘要に「\"」）は、ファイルを止めずに手順3の問題の行にする。直すか「このままでよい」か削除するまで取り込まない',
  '1ファイルに複数の口座を入れるときは、全行に銀行名と口座番号を書く（口座ごとに分けて取り込む）',
  '一度に10ファイル・1ファイル10MBまで',
];

export type FormatCategory = { name: string; keywords: string[] };

export type ImportFormat = {
  categories: FormatCategory[]; // 選べる分類（未分類は除く）。並びは画面の分類と同じ
  giftThreshold: number;
  ocrPrompt?: {
    currentVersion: number;
    currentRules: string;
    versions: { version: number; rules: string; note: string; createdAt: string | null }[];
  };
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

// 指示文に足す、人が分かっていること（任意。依頼27）
export type InstructionHint = {
  era?: EraChoice | null; // この通帳の日付の元号
  period?: string; // 通帳の期間（書かれたまま渡す）
};

export type InstructionOptions = {
  output?: 'csv' | 'xlsx';
  extraRules?: string;
  // 文字認識へ集中させ、分類は取込後の別工程にする
  ocrOnly?: boolean;
  // Gemini の回答本文を、そのままアプリへ貼り付けられる2部構成にする
  includeImprovement?: boolean;
};

export type GeminiResponseParts = { csv: string; improvementDraft: string };

function excelClipboardToCsv(input: string): string {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]!;
    if (ch === '"') {
      if (quoted && input[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && ch === '\t') {
      row.push(field); field = '';
    } else if (!quoted && (ch === '\n' || ch === '\r')) {
      if (ch === '\r' && input[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else {
      field += ch;
    }
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.map((cells) => cells.map(csvCell).join(',')).join('\n');
}

// Gemini の回答全体、```csv のコードブロックだけ、CSVだけ、のどれを貼っても取引CSVを取り出す。
// 「次回依頼文案」があれば別欄へ回す。CSV の値に改行を入れない指示なので、見出し単位で区切れる。
export function extractGeminiResponse(raw: string): GeminiResponseParts {
  const text = raw.replaceAll('\r\n', '\n').trim();
  if (!text) return { csv: '', improvementDraft: '' };
  const required = ['日付', '摘要', '払戻額', 'お預り額'];
  const isCsv = (value: string) => {
    const first = value.split('\n').find((line) => line.trim()) ?? '';
    return required.every((name) => first.includes(name));
  };
  const firstLine = text.split('\n').find((line) => line.trim()) ?? '';
  if (firstLine.includes('\t') && required.every((name) => firstLine.includes(name))) {
    return { csv: excelClipboardToCsv(text), improvementDraft: '' };
  }
  const fenced = [...text.matchAll(/```(?:csv)?\s*\n([\s\S]*?)```/gi)].map((m) => m[1]!.trim());
  let csv = fenced.find(isCsv) ?? '';
  const heading = /^#{1,6}\s*次回依頼文案\s*$/m;
  const match = heading.exec(text);
  let improvementDraft = match ? text.slice(match.index + match[0].length).split(/^#{1,6}\s+/m)[0]!.trim() : '';
  improvementDraft = improvementDraft.replace(/^```(?:markdown|md)?\s*\n?/i, '').replace(/```\s*$/i, '').trim();
  if (!csv) {
    const lines = text.split('\n');
    const start = lines.findIndex((line) => isCsv(line));
    if (start >= 0) {
      const endOffset = lines.slice(start + 1).findIndex((line) => heading.test(line));
      csv = lines.slice(start, endOffset < 0 ? undefined : start + 1 + endOffset).join('\n').replace(/```\s*$/i, '').trim();
    }
  }
  return { csv, improvementDraft };
}

export function promptImprovementRequest(currentPrompt: string, issue: string, geminiDraft = ''): string {
  return `# 通帳PDF文字認識の依頼文を改善してください

下の「現在の依頼文」で通帳PDFをExcel化したところ、「今回見つかった問題」がありました。
GeminiがExcelに書いた案も参考にし、次回から同じ問題を減らす追加ルールを作ってください。

## 返答方法
- 返すのは、次回から追加するルールの箇条書きだけにしてください。
- 現在の依頼文に既にあるルールは繰り返さず、今回の問題を防ぐ具体的な確認方法を書いてください。
- 読めない箇所を推測で補完させないでください。
- Excelの列名・シート名・出力形式は変更しないでください。

## 今回見つかった問題
${issue.trim() || '（ここに問題を記入してください）'}

## Geminiが作った追加ルール案
${geminiDraft.trim() || '（案なし）'}

## 現在の依頼文
${currentPrompt}`;
}

// 依頼26・27 で Gemini の読み取りを試して決めた文。繰越の行・列ずれ・半角カナの濁点・元号の無い日付・
// 振込がみな贈与になる、を潰すように書いてある。長さは Gemini にそのまま貼れる範囲に保つ。
// 元号は推測させない（1ページの画像からは決めようが無い）。分かっていれば hint で渡す
export function aiInstruction(format: ImportFormat, hint: InstructionHint = {}, options: InstructionOptions = {}): string {
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

  const period = hint.period?.trim();
  const excel = options.output === 'xlsx';
  const ocrOnly = options.ocrOnly ?? excel;
  const includeImprovement = options.includeImprovement === true;
  const extraRules = options.extraRules?.trim();
  const knownLines = [
    ...(hint.era
      ? [
          hint.era === 'AD'
            ? '- この通帳の日付は西暦です。日付は 2024-08-12 の形（4桁の年）で書く'
            : `- この通帳の日付の元号は ${eraLabel(hint.era)} です。日付は ${hint.era}6.8.12 の形で書く`,
        ]
      : []),
    ...(period ? [`- この通帳の期間: ${period}`] : []),
  ];

  return [
    excel
      ? '通帳PDFを読み取り、添付したひな形と同じ形式の Excel を作ってください。銀行取引分析アプリへそのまま取り込みます。'
      : includeImprovement
        ? '通帳PDFを読み取り、銀行取引分析アプリへ貼り付けられるCSVテキストを作ってください。ファイルの作成は不要です。'
        : '通帳の画像を読み取り、次の形式の CSV を作ってください。銀行取引分析アプリへそのまま取り込みます。',
    excel
      ? '返すのは Excel ファイル（.xlsx）だけにしてください。前後に説明文を付けず、Googleスプレッドシートで作業した場合も最後は .xlsx でダウンロードしてください。'
      : includeImprovement
        ? '回答は「取引CSV」と「次回依頼文案」の2部だけにしてください。取引CSVは必ず ```csv のコードブロックに入れてください。'
        : '返すのは CSV だけにしてください（前後に説明の文を付けない）。保存するときの拡張子は .csv です。',
    '',
    ...(knownLines.length > 0 ? ['## 分かっていること', ...knownLines, ''] : []),
    ...(extraRules ? ['## これまでの誤りから追加したルール', extraRules, ''] : []),
    ...(includeImprovement
      ? [
          '## 回答の形',
          '# 取引CSV',
          '```csv',
          headerLine,
          '（ここに取引行）',
          '```',
          '# 次回依頼文案',
          '- （今回迷った点と、次回の精度を上げる具体的な追加ルール）',
          '',
        ]
      : []),
    excel ? '## Excel の書き方' : '## CSV の書き方',
    excel ? '- 1枚目のシート名は「取引データ」。1行目は見出し行。列は次の順に並べ、列名はこのとおりに書く' : '- 1行目は見出し行。列は次の順に並べ、列名はこのとおりに書く',
    `  ${headerLine}`,
    excel
      ? `- どの行も${IMPORT_COLUMNS.length}列を保つ。書くことが無いセルは空欄にし、セルの結合、列の追加・削除、見出しの変更をしない`
      : `- どの行も項目は必ず${IMPORT_COLUMNS.length}個（見出しと同じ数）。書くことが無い項目も空欄で残す。返す前に全行の項目の数を数え直す`,
    excel ? '- 金額・残高は数値セルにし、カンマや「円」などの文字を入れない' : '- 金額・残高は数字だけ。カンマを入れない（区切りのカンマと紛れて列がずれる）',
    ...(excel ? [] : ['- 値に「,」や「"」が入るときは、値全体を「"」で囲む（中の「"」は「""」と2つ重ねる）', '- 文字コードは UTF-8']),
    '- 1ファイルに複数の口座を入れるときは、全行に銀行名と口座番号を書く',
    ...(excel
      ? [
          '- 2枚目の「検査結果」シートに、残高不一致・日付の逆転・重複の疑い・読めない箇所をPDFページ番号と取引データ行番号つきで書く',
          '- 3枚目の「次回依頼文案」シートに、今回迷った点と、次回の文字認識精度を上げるための具体的な追加ルール案を書く。既存ルールの繰り返しはしない',
        ]
      : []),
    '',
    '## 列の書き方',
    ...columnLines,
    '',
    '## 通帳の読み方',
    excel
      ? '- 通帳の1行の取引を Excel「取引データ」シートの1行にする。「繰越」「合計」「前ページより」「次ページへ」など、取引でない行は書かない'
      : '- 通帳の1行の取引を CSV の1行にする。「繰越」「合計」「前ページより」「次ページへ」など、取引でない行は書かない',
    '- 行は通帳に印字された順のまま。ページをまたいで同じ行が2回写っていたら1回だけ書く',
    '- 摘要が2つの欄（摘要・お取引内容 など）に分かれていたら、空白1つでつないで摘要に書く',
    '- 通帳の列名が違っても意味で当てる（お支払金額・お引出し → 払戻額、お預り金額・ご入金 → お預り額、残高 → 差引残高）',
    hint.era
      ? '- 日付に元号が無いとき（6-08-12 など）は、上の「分かっていること」の元号で書く'
      : '- 日付に元号が無いとき（6-08-12 など）は、通帳の数字のまま書く（6-08-12）。推測で元号を付けない。元号はアプリの取込の画面でまとめて指定する。これだけでは要確認にしない',
    '- 半角カナは全角カナにし、濁点・半濁点は前の字とまとめて1文字にする（ｾﾞｲｷﾝ → ゼイキン、ﾎﾟ → ポ）。濁点・半濁点のあとに空白や「"」を入れない。語の区切りの空白は印字のとおり',
    '- 大きく印字された字は大きいまま書く（ｼﾖｳｹﾝ → シヨウケン、ﾘﾖｳ → リヨウ）。小さい字（ョ・ッ など）に直さない',
    '- 口座番号は先頭の0を残す',
    '',
    '## 読めないとき・合わないとき',
    '- 前後の行や似た行から推測して埋めない。読めた所だけ書き、読めない字は「■」にして、メモに読めなかった箇所を書き、要確認を「○」にする',
    '- 検算: 前の行の差引残高 − 払戻額 ＋ お預り額 が、その行の差引残高と合うかを1行ずつ確かめる。合わない行は画像を読み直す。それでも合わなければ読めたとおりに書き、メモに「残高が合わない」と書いて要確認を「○」にする',
    '- 金額・残高は通帳のとおりに書く。計算で作らない（検算は確かめるためだけ）',
    '',
    ...(ocrOnly
      ? ['## 分類', '- 今回は文字認識の正確さを優先するため、分類の列は空欄にする。分類はデータをアプリへ取り込んだ後に別工程で行う']
      : [
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
        ]),
    ...(includeImprovement
      ? [
          '',
          '## 次回依頼文案',
          '- CSVの後に「# 次回依頼文案」の見出しを付け、今回迷った箇所と、次回から追加するとよい具体的な確認ルールを箇条書きで書く',
          '- 既存の依頼文にあるルールは繰り返さない',
        ]
      : []),
  ].join('\n');
}
