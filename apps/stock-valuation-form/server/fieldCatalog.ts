// 欄の辞書 — 外部ツール（MCP サーバー経由の Claude Desktop など）が
// 決算書・申告書から読み取った数字を、どの欄へ入れるか決めるための対照表。
//
// 鍵にするのは様式の識別コード（G01 …）。国税庁の様式にそのまま印字されている番号なので、
// PDF を見ている側と保存先を、内部キー（f28 / e18 …）を知らせずに突き合わせられる。
//
// ここに載せるのは「人が入れる欄」だけにする。自動計算欄・他表からの転記欄を載せると、
// 外から書き込めるように見えてしまい、次の再計算で黙って上書きされる。
// 載せ漏れ・載せ過ぎは server/__tests__/fieldCatalog.test.ts が様式の定義と突き合わせる。
//
// 単位は様式のとおり千円。円へ換算しないのは第5表の貼り付け取込と同じ理由で、
// 桁が1000倍ずれて入るより、数字がそのまま入って弾かれるほうが気づけるため。

/** 保存先のバケット。第4表の1／第4表の2はどちらも 'table4' に入る。 */
export type CatalogTable = 'table1_1' | 'table4' | 'table5';

/**
 * 値の種類。
 * - integer       … 負数を取らない整数（配当金額・資本金等の額など）
 * - signedInteger … 欠損・マイナスを取る整数（課税所得金額・利益積立金額）
 * - text          … 自由入力（科目名）
 * - enum          … options のいずれか（第5表の備考）
 */
export type CatalogKind = 'integer' | 'signedInteger' | 'text' | 'enum';

export interface CatalogField {
  /** 様式の識別コード。外部からはこれで欄を指す */
  code: string;
  /** どの様式の欄か（表示用） */
  form: string;
  /** 保存先バケット */
  table: CatalogTable;
  /** 保存キー（内部用。外部ツールは code を使う） */
  field: string;
  /** 様式の欄名 */
  label: string;
  /** 事業年度の別。年度で3列に分かれる欄だけ持つ */
  period?: string;
  /** 様式の単位 */
  unit?: string;
  kind: CatalogKind;
  /** 比準要素の計算に要る欄（空のままだと株価が出ない） */
  required?: boolean;
  /**
   * 取込の手がかり。どの資料のどこを見るかの目安で、判定そのものではない。
   * 非経常かどうかなど人が決める部分は、ここに書かずに読み手へ返す。
   */
  hint?: string;
}

const T4 = '第4表の1' as const;

/** 事業年度で3列に分かれる欄をまとめて作る（直前期／直前々期／直前々期の前期）。 */
function periods(
  label: string,
  kind: CatalogKind,
  entries: readonly (readonly [code: string, field: string])[],
  extra: Pick<CatalogField, 'required' | 'hint'> = {},
): CatalogField[] {
  const names = ['直前期', '直前々期', '直前々期の前期'] as const;
  return entries.map(([code, field], i) => ({
    code, form: T4, table: 'table4' as const, field, label,
    period: names[i]!, unit: '千円', kind, ...extra,
  }));
}

/**
 * 第4表の1 のうち人が入れる欄（25件）。
 * G25（直前期の⑰資本金等の額）は G01 からの転記なので載せない。
 */
export const CATALOG_FIELDS: readonly CatalogField[] = [
  {
    code: 'G01', form: T4, table: 'table4', field: '①',
    label: '① 直前期末の資本金等の額', unit: '千円', kind: 'integer', required: true,
    hint: '別表五(一)Ⅱ の差引翌期首現在資本金等の額の合計',
  },
  ...periods('⑥ 年配当金額', 'integer', [['G04', 'f28'], ['G05', 'f32'], ['G06', 'f36']], {
    required: true,
    hint: '株主資本等変動計算書の剰余金の配当。支払った期ではなく、その事業年度に係る配当',
  }),
  ...periods('⑦ 左のうち非経常的な配当金額', 'integer', [['G07', 'f29'], ['G08', 'f33'], ['G09', 'f37']], {
    hint: '記念配当・特別配当など。経常か非経常かは資料からは決まらないので人が判断する',
  }),
  ...periods('⑪ 法人税の課税所得金額', 'signedInteger', [['G10', 'e18'], ['G11', 'e25'], ['G12', 'e32']], {
    required: true,
    hint: '別表四の所得金額又は欠損金額。欠損はマイナスのまま入れる',
  }),
  ...periods('⑫ 非経常的な利益金額', 'integer', [['G13', 'e19'], ['G14', 'e26'], ['G15', 'e33']], {
    hint: '固定資産売却益・保険差益など。非経常かどうかは人が判断する',
  }),
  ...periods('⑬ 受取配当等の益金不算入額', 'integer', [['G16', 'e20'], ['G17', 'e27'], ['G18', 'e34']], {
    hint: '別表八(一)の益金不算入額',
  }),
  ...periods('⑭ 左の所得税額', 'integer', [['G19', 'e21'], ['G20', 'e28'], ['G21', 'e35']], {
    hint: '⑬の受取配当等につき課された所得税額',
  }),
  ...periods('⑮ 損金算入した繰越欠損金の控除額', 'integer', [['G22', 'e22'], ['G23', 'e29'], ['G24', 'e36']], {
    hint: '別表七(一)の当期控除額',
  }),
  {
    code: 'G26', form: T4, table: 'table4', field: 'n56',
    label: '⑰ 資本金等の額', period: '直前々期', unit: '千円', kind: 'integer', required: true,
    hint: '別表五(一)Ⅱ の差引翌期首現在資本金等の額の合計（直前々期末）',
  },
  {
    code: 'G27', form: T4, table: 'table4', field: 'n53',
    label: '⑱ 利益積立金額', period: '直前期', unit: '千円', kind: 'signedInteger', required: true,
    hint: '別表五(一)Ⅰ の差引翌期首現在利益積立金額の合計',
  },
  {
    code: 'G28', form: T4, table: 'table4', field: 'n57',
    label: '⑱ 利益積立金額', period: '直前々期', unit: '千円', kind: 'signedInteger', required: true,
    hint: '別表五(一)Ⅰ の差引翌期首現在利益積立金額の合計（直前々期末）',
  },
];

/**
 * 明細行で入れる表（第5表）。欄が行数ぶん増えるので、1件ずつではなく作り方を返す。
 * 保存キーは `<接頭辞>_<行番号>_<列番号>`（a_1_1 … l_222_4）。
 */
export interface CatalogRowTable {
  form: string;
  table: CatalogTable;
  /** 本表の行数・続紙1枚の行数・続紙を含む最大枚数 */
  mainRows: number;
  contRows: number;
  maxPages: number;
  /** 使える行番号の上限（本表＋続紙すべて） */
  maxRows: number;
  sides: readonly {
    key: string;
    label: string;
    /** 保存キーの接頭辞 */
    prefix: string;
    /** 備考列に入れられる値。空配列なら自由入力 */
    noteOptions: readonly string[];
  }[];
  columns: readonly { index: number; label: string; kind: CatalogKind; unit?: string }[];
}

export const CATALOG_ROW_TABLES: readonly CatalogRowTable[] = [
  {
    form: '第5表',
    table: 'table5',
    mainRows: 15,
    contRows: 23,
    maxPages: 10,
    maxRows: 15 + 23 * 9,
    sides: [
      { key: 'asset', label: '資産', prefix: 'a', noteOptions: ['株式等', '土地等'] },
      { key: 'liability', label: '負債', prefix: 'l', noteOptions: [] },
    ],
    columns: [
      { index: 1, label: '科目', kind: 'text' },
      // 貸倒引当金のような控除項目がマイナスで入るため、金額欄は符号を取る
      { index: 2, label: '相続税評価額', kind: 'signedInteger', unit: '千円' },
      { index: 3, label: '帳簿価額', kind: 'signedInteger', unit: '千円' },
      { index: 4, label: '備考', kind: 'enum' },
    ],
  },
];

// ── 案件の見出しになる欄（第1表の1） ──────────────────────────────────
//
// 案件の一覧に出る会社名と課税時期は案件の列ではなく様式の欄から作られる
// （src/features/cases/caseLabels.ts が保存のたびに作り直す）。外から案件を作るときに
// 列だけ埋めて欄を空のままにすると、画面で開いた次の自動保存で見出しが空になる ──
// 「作ったはずの案件が（会社名未入力）になる」という、誰にも見えない壊れ方。
// そのため案件を作る口には、どの欄が見出しになるかを教える必要がある。
//
// これを fields（コード1つで1欄を指して書き込む側）に載せないのは、和暦の日付が
// 元号・年・月・日の4欄に分かれていて「コード1つ＝欄1つ」にならないため。N01 のような
// 印字コードは4欄まとめての番号で、1欄ずつには振られていない。

/** 和暦日付の4欄の内訳。保存キーは `<prefix><keySuffix>`（f14 → f14_g / f14_y / f14_m / f14_d）。 */
export interface CatalogDatePart {
  part: 'era' | 'year' | 'month' | 'day';
  /** 保存キーの接尾辞 */
  keySuffix: string;
  /** 見出しにするときに値の後ろへ付ける字 */
  labelSuffix: string;
}

/** 和暦日付の欄（元号・年・月・日の4欄で1つの日付）。 */
export interface CatalogDateField {
  /** 外部ツールから指す名前 */
  key: string;
  /** 様式の欄名 */
  label: string;
  /** 様式の識別コード（4欄まとめての番号） */
  code: string;
  /** 保存キーの接頭辞 */
  prefix: string;
  /** 案件の見出しに使う欄か（空だと一覧で見分けられない） */
  required: boolean;
}

/**
 * 元号。元号年＋`base`＝西暦年で、`start`〜`end` がその元号の期間。
 * 期間を配るのは、改元をまたぐ日付（令和1年1月1日・平成40年）を外からも弾けるようにするため
 * ── 黙って別の日として入ると、会社規模の判定も日付の前後関係の確認も結果が変わる。
 */
export interface CatalogEra {
  name: string;
  base: number;
  /** 様式のプルダウンで選べる元号年の上限 */
  lastYear: number;
  start: string;
  end?: string;
}

/**
 * 案件を作るのに要る欄。
 *
 * 課税時期の見出し（「令和8年3月15日」）は `parts` の順に「値＋labelSuffix」をつなげたもの。
 * 年が空なら見出しも空、月が空ならそこで止める（caseLabels.ts の taxPeriodLabel と同じ規則）。
 */
export interface CatalogCaseIdentity {
  form: string;
  table: CatalogTable;
  companyName: { code: string; field: string };
  dates: readonly CatalogDateField[];
  parts: readonly CatalogDatePart[];
  eras: readonly CatalogEra[];
  /** 元号の欄が空のときに使う元号（様式の運用に合わせる） */
  defaultEra: string;
}

export const CATALOG_CASE_IDENTITY: CatalogCaseIdentity = {
  form: '第1表の1',
  table: 'table1_1',
  companyName: { code: 'E01', field: 'f12' },
  dates: [
    { key: 'taxPeriod', label: '課税時期', code: 'N01', prefix: 'f14', required: true },
    { key: 'fiscalYearFrom', label: '直前期（自）', code: 'N02', prefix: 'f15_from', required: false },
    { key: 'fiscalYearTo', label: '直前期（至）', code: 'N03', prefix: 'f15_to', required: false },
  ],
  parts: [
    { part: 'era', keySuffix: '_g', labelSuffix: '' },
    { part: 'year', keySuffix: '_y', labelSuffix: '年' },
    { part: 'month', keySuffix: '_m', labelSuffix: '月' },
    { part: 'day', keySuffix: '_d', labelSuffix: '日' },
  ],
  eras: [
    { name: '令和', base: 2018, lastYear: 64, start: '2019-05-01' },
    { name: '平成', base: 1988, lastYear: 31, start: '1989-01-08', end: '2019-04-30' },
  ],
  defaultEra: '令和',
};

/**
 * 外部ツールへ返す取り決め。
 * 「やらないこと」を辞書と一緒に配るのは、受け手が同じ線引きで動けるようにするため。
 */
/**
 * 種類ごとの値の書き方。入力欄は打鍵のたびに整形するので、保存されている値も
 * 整形後の文字列（1,234 / △5,678）になっている。外から書くときも同じ形に揃えないと、
 * 画面で開いたときだけ見た目が違う値が混ざる。
 *
 * 整形の規則をここから配るのは、外部ツール側に「この様式では負数を△で書く」といった
 * 知識を持たせないため。△ は src/lib/numberFormat.ts の NEGATIVE_MARK と同じもので、
 * ずれたらテストが落ちる。
 */
export interface CatalogFormat {
  /** 数字として扱う欄か。text / enum は false */
  numeric: boolean;
  /** 3桁区切りに使う文字 */
  groupSeparator?: string;
  /** 負数の書き方。無ければ負数を受け付けない欄 */
  negativeMark?: string;
}

export const CATALOG_FORMATS: Record<CatalogKind, CatalogFormat> = {
  integer: { numeric: true, groupSeparator: ',' },
  signedInteger: { numeric: true, groupSeparator: ',', negativeMark: '△' },
  text: { numeric: false },
  enum: { numeric: false },
};

export const CATALOG_RULES: readonly string[] = [
  '金額の単位は千円。円で読み取った値は千円に直してから渡すこと（換算はこちらでは行わない）',
  '小数は受け付けない。端数処理は人が決める',
  '辞書に無いコードへは書き込めない。自動計算欄・他表からの転記欄は辞書に載せていない',
  '経常か非経常か、どの科目をまとめるかは資料からは決まらないので、判断が要るものは人へ返すこと',
  '書き込みは既定で試算のみ。差分を確認してから確定する',
  '案件の見出し（会社名・課税時期）は様式の欄から作られる。案件を作るときは caseIdentity の欄も埋めること',
];

export interface FieldCatalog {
  version: number;
  rules: readonly string[];
  formats: Record<CatalogKind, CatalogFormat>;
  fields: readonly CatalogField[];
  rowTables: readonly CatalogRowTable[];
  caseIdentity: CatalogCaseIdentity;
}

// 版は辞書の形が変わったときに上げる（2: caseIdentity を足した）。
export function buildFieldCatalog(): FieldCatalog {
  return {
    version: 2,
    rules: CATALOG_RULES,
    formats: CATALOG_FORMATS,
    fields: CATALOG_FIELDS,
    rowTables: CATALOG_ROW_TABLES,
    caseIdentity: CATALOG_CASE_IDENTITY,
  };
}

/** コード → 欄。未知のコードは undefined（呼び出し側で弾く） */
export function findByCode(code: string): CatalogField | undefined {
  return CATALOG_FIELDS.find((f) => f.code === code.trim().toUpperCase());
}
