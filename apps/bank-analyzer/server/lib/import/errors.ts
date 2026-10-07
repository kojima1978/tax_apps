// 取込のエラー（Django 版 analyzer/lib/exceptions.py の移植）。
//
// 画面に出す辞書（toDict）は Django 版の to_dict と同じ形・同じ文言にしてある。
// 段階1の正解（test-data/golden/expected/importer）とキーごとに突き合わせているので、
// 文言を変えるときはテストの許容差分に理由を書くこと。

export type ImportErrorType = 'encoding' | 'format' | 'data' | 'validation';

const TYPE_LABELS: Record<ImportErrorType, string> = {
  encoding: '文字コードエラー',
  format: 'ファイル形式エラー',
  data: 'データエラー',
  validation: '検証エラー',
};

export type ImportErrorDict = {
  type: ImportErrorType;
  type_label: string;
  message: string;
  suggestion: string;
  line_number: number | null;
  column_name: string | null;
  expected_value: string | null;
  actual_value: string | null;
  sample_values: string[];
  tried_encodings: string[];
};

type Details = Partial<
  Pick<ImportErrorDict, 'line_number' | 'column_name' | 'expected_value' | 'actual_value' | 'sample_values'>
>;

export abstract class StatementImportError extends Error {
  abstract readonly type: ImportErrorType;

  constructor(
    message: string,
    readonly suggestion: string,
    readonly details: Details = {},
    readonly triedEncodings: string[] = [],
  ) {
    super(message);
    this.name = new.target.name;
  }

  toDict(): ImportErrorDict {
    return {
      type: this.type,
      type_label: TYPE_LABELS[this.type],
      message: this.message,
      suggestion: this.suggestion,
      line_number: this.details.line_number ?? null,
      column_name: this.details.column_name ?? null,
      expected_value: this.details.expected_value ?? null,
      actual_value: this.details.actual_value ?? null,
      sample_values: this.details.sample_values ?? [],
      tried_encodings: this.triedEncodings,
    };
  }
}

export class EncodingError extends StatementImportError {
  readonly type = 'encoding';

  constructor(message: string, triedEncodings: string[], fileHeaderHex: string) {
    super(
      message,
      '以下の対処法をお試しください:\n' +
        '1. Excelで開き、「名前を付けて保存」で「CSV UTF-8」形式を選択\n' +
        '2. テキストエディタで開き、UTF-8またはShift-JISで保存し直す\n' +
        '3. ファイルが破損していないか確認する',
      fileHeaderHex ? { actual_value: `ファイルヘッダ: ${fileHeaderHex}` } : {},
      triedEncodings,
    );
  }
}

const REQUIRED_COLUMNS_SUGGESTION =
  'CSVファイルに以下のカラムが含まれているか確認してください:\n' +
  '- 年月日（または日付）\n' +
  '- 摘要\n' +
  '- 払戻（または払戻額）\n' +
  '- お預り（またはお預り額）\n' +
  '- 差引残高（または残高）';

export class FormatError extends StatementImportError {
  readonly type = 'format';

  constructor(
    message: string,
    opts: { suggestion?: string; missingColumns?: string[]; foundColumns?: string[]; lineNumber?: number } = {},
  ) {
    const details: Details = {};
    if (opts.lineNumber !== undefined) details.line_number = opts.lineNumber;
    if (opts.missingColumns?.length) details.expected_value = `必須カラム: ${opts.missingColumns.join(', ')}`;
    if (opts.foundColumns?.length) details.actual_value = `検出されたカラム: ${opts.foundColumns.join(', ')}`;
    super(message, opts.suggestion || REQUIRED_COLUMNS_SUGGESTION, details);
  }
}

// 行番号と値の組を5件まで「  行N: 値」で並べる。
function formatExamples(lineNumbers: number[], values: string[], limit = 5): string[] {
  return lineNumbers.slice(0, limit).map((ln, i) => `  行${ln}: ${values[i]}`);
}

// 行単位のエラーが持つ一覧の上限。件数（メッセージ）は全件を数える。
// Django 版は一覧を10件で切ってから数えていたので「（10件）」で頭打ちになっていた。
const MAX_LISTED = 10;

export class DateParseError extends StatementImportError {
  readonly type = 'data';

  constructor(
    readonly lineNumbers: number[],
    readonly invalidValues: string[],
  ) {
    const listedLines = lineNumbers.slice(0, MAX_LISTED);
    const listedValues = invalidValues.slice(0, MAX_LISTED);
    super(
      `日付の変換に失敗しました（${lineNumbers.length}件）`,
      '日付は以下の形式で入力してください:\n' +
        '- 西暦: 2024-01-01, 2024/01/01\n' +
        '- 和暦: H28.6.3, R5/4/1\n' +
        '\n変換できない値の例:\n' +
        formatExamples(listedLines, listedValues).join('\n'),
      {
        line_number: listedLines[0] ?? null,
        column_name: '日付',
        expected_value: 'YYYY-MM-DD, YYYY/MM/DD, H○○.○.○',
        actual_value: listedValues[0] ?? null,
        sample_values: listedValues.slice(0, 5),
      },
    );
  }
}

export type AmountColumn = 'amount_out' | 'amount_in' | 'balance';

export const AMOUNT_COLUMN_LABELS: Record<AmountColumn, string> = {
  amount_out: '払戻額',
  amount_in: 'お預り額',
  balance: '残高',
};

export class AmountParseError extends StatementImportError {
  readonly type = 'data';

  constructor(
    column: AmountColumn,
    readonly lineNumbers: number[],
    readonly invalidValues: string[],
    // 小数が混じっていたか。Django 版は黙って切り捨てていた（計画書 §3 の #4）ので、
    // そのときだけ1行足して「数値なのになぜ弾かれたか」が分かるようにする。
    hasDecimal = false,
  ) {
    const label = AMOUNT_COLUMN_LABELS[column];
    const listedLines = lineNumbers.slice(0, MAX_LISTED);
    const listedValues = invalidValues.slice(0, MAX_LISTED);
    super(
      `${label}の変換に失敗しました（${lineNumbers.length}件）`,
      `${label}は数値で入力してください:\n` +
        '- カンマ区切りは自動的に除去されます（例: 1,234,567）\n' +
        '- 空欄は0として扱われます\n' +
        '- 文字列や記号が含まれていないか確認してください\n' +
        (hasDecimal ? '- 小数は使えません（円単位の整数で入力してください）\n' : '') +
        '\n変換できない値の例:\n' +
        formatExamples(listedLines, listedValues).join('\n'),
      {
        line_number: listedLines[0] ?? null,
        column_name: label,
        expected_value: '数値（例: 12345 または 1,234,567）',
        actual_value: listedValues[0] ?? null,
        sample_values: listedValues.slice(0, 5),
      },
    );
  }
}

abstract class MultipleValueError extends StatementImportError {
  readonly type = 'validation';

  constructor(
    readonly values: string[],
    readonly rowCounts: Map<string, number>,
    labels: { value: string; unit: string; splitInstruction: string; detected: string },
  ) {
    const count = values.length;
    const lines = values.slice(0, 5).map((v) => `  - ${v}: ${rowCounts.get(v) ?? 0}件`);
    super(
      `このファイルには${count}種類の${labels.value}が含まれています`,
      `${labels.splitInstruction}\n\n${labels.detected}\n${lines.join('\n')}`,
      {
        expected_value: labels.unit,
        actual_value: `${count}種類の${labels.value}`,
        sample_values: values.slice(0, 5),
      },
    );
  }
}

export class MultipleBankError extends MultipleValueError {
  constructor(values: string[], rowCounts: Map<string, number>) {
    super(values, rowCounts, {
      value: '銀行名',
      unit: '1つの銀行名',
      splitInstruction:
        '1回のインポートでは1つの銀行のデータのみ取り込み可能です。\n銀行ごとにCSVファイルを分割してアップロードしてください。',
      detected: '検出された銀行名:',
    });
  }
}

export class MultipleAccountError extends MultipleValueError {
  constructor(values: string[], rowCounts: Map<string, number>) {
    super(values, rowCounts, {
      value: '口座番号',
      unit: '1つの口座番号',
      splitInstruction:
        '1回のインポートでは1つの口座番号のみ取り込み可能です。\n口座番号ごとにCSVファイルを分割してアップロードしてください。',
      detected: '検出された口座番号:',
    });
  }
}
