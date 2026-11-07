// 欄の辞書 — 外部ツール（MCP サーバー経由の Claude Desktop など）が
// 決算書・申告書から読み取った数字を、どの欄へ入れるか決めるための対照表。
//
// 鍵にするのは「様式の略号:様式に印字されている識別記号」（4-1:G01 / 1-2:G09）。
// 識別記号は国税庁の様式にそのまま印字されているので、PDF を見ている側と保存先を
// 内部キー（f28 / e18 …）を知らせずに突き合わせられる。ただし記号は様式ごとに
// G01 から振り直されていて（第1表の1・第1表の2・第4表の1 の G01 は全部別の欄）、
// 記号だけでは一意にならないため、様式の略号まで含めたものをコードにしている。
//
// ここに載せるのは「人が入れる欄」だけにする。自動計算欄・他表からの転記欄を載せると、
// 外から書き込めるように見えてしまい、次の再計算で黙って上書きされる。
// 載せ漏れ・載せ過ぎは server/__tests__/fieldCatalog.test.ts が様式の定義と突き合わせる。
//
// 資料から決まらないもの（従業員数・相続税評価額・評価方式の判断・業種目番号）は
// 辞書に載せても「機械が決めた」ことになるだけなので、人が画面で入れる前提にしている。
//
// 単位は様式のとおり千円。円へ換算しないのは第5表の貼り付け取込と同じ理由で、
// 桁が1000倍ずれて入るより、数字がそのまま入って弾かれるほうが気づけるため。

/** 保存先のバケット。第4表の1／第4表の2はどちらも 'table4' に入る。 */
export type CatalogTable = 'table1_1' | 'table1_2' | 'table4' | 'table5';

/**
 * 値の種類。
 * - integer       … 負数を取らない整数（配当金額・資本金等の額・株式数など）
 * - signedInteger … 欠損・マイナスを取る整数（課税所得金額・利益積立金額）
 * - text          … 自由入力（科目名・株主の氏名）
 * - enum          … options のいずれか（第5表の備考）
 */
export type CatalogKind = 'integer' | 'signedInteger' | 'text' | 'enum';

/** 様式1つぶん。コードの略号と保存先バケットをここだけで決める。 */
interface FormDef {
  readonly name: string;
  readonly abbr: string;
  readonly table: CatalogTable;
}

const T1_1: FormDef = { name: '第1表の1', abbr: '1-1', table: 'table1_1' };
const T1_2: FormDef = { name: '第1表の2', abbr: '1-2', table: 'table1_2' };
const T4_1: FormDef = { name: '第4表の1', abbr: '4-1', table: 'table4' };
const T5: FormDef = { name: '第5表', abbr: '5', table: 'table5' };

export interface CatalogField {
  /** 外部からはこれで欄を指す（`<様式の略号>:<識別記号>`） */
  code: string;
  /** 様式に印字されている識別記号（G01 など。様式をまたぐと重複する） */
  symbol: string;
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

/** 様式を決めれば残りは機械的に決まるので、欄は様式ごとにまとめて作る。 */
type FieldSpec = Omit<CatalogField, 'code' | 'form' | 'table'>;

function fieldsOf(form: FormDef, specs: readonly FieldSpec[]): CatalogField[] {
  return specs.map((spec) => ({
    code: `${form.abbr}:${spec.symbol}`,
    form: form.name,
    table: form.table,
    ...spec,
  }));
}

/** 事業年度で3列に分かれる欄をまとめて作る（直前期／直前々期／直前々期の前期）。 */
function periods(
  label: string,
  kind: CatalogKind,
  entries: readonly (readonly [symbol: string, field: string])[],
  extra: Pick<CatalogField, 'required' | 'hint'> = {},
): FieldSpec[] {
  const names = ['直前期', '直前々期', '直前々期の前期'] as const;
  return entries.map(([symbol, field], i) => ({
    symbol,
    field,
    label,
    period: names[i]!,
    unit: '千円',
    kind,
    ...extra,
  }));
}

/**
 * 第4表の1 のうち人が入れる欄（25件）。
 * G25（直前期の⑰資本金等の額）は G01 からの転記なので載せない。
 */
const TABLE4_1_FIELDS: readonly FieldSpec[] = [
  {
    symbol: 'G01',
    field: '①',
    label: '① 直前期末の資本金等の額',
    unit: '千円',
    kind: 'integer',
    required: true,
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
    symbol: 'G26',
    field: 'n56',
    label: '⑰ 資本金等の額',
    period: '直前々期',
    unit: '千円',
    kind: 'integer',
    required: true,
    hint: '別表五(一)Ⅱ の差引翌期首現在資本金等の額の合計（直前々期末）',
  },
  {
    symbol: 'G27',
    field: 'n53',
    label: '⑱ 利益積立金額',
    period: '直前期',
    unit: '千円',
    kind: 'signedInteger',
    required: true,
    hint: '別表五(一)Ⅰ の差引翌期首現在利益積立金額の合計',
  },
  {
    symbol: 'G28',
    field: 'n57',
    label: '⑱ 利益積立金額',
    period: '直前々期',
    unit: '千円',
    kind: 'signedInteger',
    required: true,
    hint: '別表五(一)Ⅰ の差引翌期首現在利益積立金額の合計（直前々期末）',
  },
];

/**
 * 第1表の1 の会社情報ヘッダーと、「１．株主及び評価方式の判定」のうち
 * 株主の明細行ではない合計欄。
 * ①②④（議決権割合・グループ合計）は③⑤⑥から自動計算されるので載せない。
 */
const TABLE1_1_FIELDS: readonly FieldSpec[] = [
  {
    symbol: 'H04',
    field: 'f18',
    label: '本店の所在地',
    kind: 'text',
    hint: '法人税申告書 別表一の納税地、または決算書の表紙',
  },
  {
    symbol: 'H07',
    field: 'f13',
    label: '代表者氏名',
    kind: 'text',
    hint: '法人税申告書 別表一の代表者自署',
  },
  {
    symbol: 'G38',
    field: 'f63',
    label: '自己株式の株式数',
    unit: '株',
    kind: 'integer',
    required: true,
    hint: '別表二の発行済株式数の内訳、または株主資本等変動計算書の自己株式。無ければ 0',
  },
  {
    symbol: 'G41',
    field: '③',
    label: '③ 筆頭株主グループの議決権の合計数',
    unit: '個',
    kind: 'integer',
    required: true,
    hint: '別表二の議決権数のうち筆頭株主グループ分の合計。どこまでを同一グループと見るかは人が判断する',
  },
  {
    symbol: 'G43',
    field: '⑤',
    label: '⑤ 評価会社の発行済株式数',
    unit: '株',
    kind: 'integer',
    required: true,
    hint: '別表二、または貸借対照表の注記・株主資本等変動計算書',
  },
  {
    symbol: 'C04',
    field: '⑥',
    label: '⑥ 議決権の総数',
    unit: '個',
    kind: 'integer',
    required: true,
    hint: '別表二の議決権数の合計（自己株式には議決権が無い）',
  },
];

/** 第1表の2 の「３．会社の規模（Ｌの割合）の判定」のうち、従業員数以外の2欄。 */
const TABLE1_2_FIELDS: readonly FieldSpec[] = [
  {
    symbol: 'G09',
    field: 'f22',
    label: '直前期末の総資産価額（帳簿価額）',
    unit: '千円',
    kind: 'integer',
    required: true,
    hint: '直前期の貸借対照表の資産の合計（帳簿価額）。第5表の帳簿価額の合計と一致する',
  },
  {
    symbol: 'G12',
    field: 'f24',
    label: '直前期末以前1年間の取引金額',
    unit: '千円',
    kind: 'integer',
    required: true,
    hint: '直前期の損益計算書の売上高（営業収益）。兼業しているときは合計',
  },
];

export const CATALOG_FIELDS: readonly CatalogField[] = [
  ...fieldsOf(T1_1, TABLE1_1_FIELDS),
  ...fieldsOf(T1_2, TABLE1_2_FIELDS),
  ...fieldsOf(T4_1, TABLE4_1_FIELDS),
];

// ── 明細行で入れる表 ────────────────────────────────────────────────
//
// 欄が行数ぶん増えるので、1件ずつではなく作り方を返す。
// 保存キーは `<接頭辞>_<行番号>_<列>`（第5表の a_1_1 … l_222_4、株主の sh_1_1 … sh_135_5）。
// 列の部分は数字だけとは限らない（株主の続柄コードは sh_2_2k）ので文字列で持つ。

export interface CatalogRowColumn {
  /** 外部から指す名前（行を渡すときのキー） */
  name: string;
  /** 保存キーの列の部分 */
  key: string;
  /** 様式の欄名 */
  label: string;
  kind: CatalogKind;
  unit?: string;
  /** この列が空の行は取り込まない（行の見出しになる列） */
  required?: boolean;
  hint?: string;
}

export interface CatalogRowSide {
  key: string;
  label: string;
  /** 保存キーの接頭辞 */
  prefix: string;
  /**
   * enum 列に入れられる値（キーは列の name）。
   * 載っていない enum 列は空欄だけが入る（備考が資産側にしかないのがこれ）。
   */
  options?: Readonly<Record<string, readonly string[]>>;
}

/**
 * 続紙の枚数を持つ隠し欄。欄の値は `base`（本表だけ）から `max` までの数で、
 * 使える行数は `mainRows + contRows * (値 - base)`。
 * 行だけ書いて枚数を増やし忘れると、入れた行が画面に出ず印刷もされない。
 */
export interface CatalogRowPages {
  field: string;
  base: number;
  max: number;
}

export interface CatalogRowTable {
  /** 外部から表を指す名前 */
  id: string;
  form: string;
  /** 保存先バケット */
  table: CatalogTable;
  /** 本表の行数・続紙1枚の行数 */
  mainRows: number;
  contRows: number;
  /** 使える行番号の上限（本表＋続紙すべて） */
  maxRows: number;
  pages: CatalogRowPages;
  sides: readonly CatalogRowSide[];
  columns: readonly CatalogRowColumn[];
  hint?: string;
}

const ASSET_NOTE_OPTIONS = ['株式等', '土地等'] as const;

export const CATALOG_ROW_TABLES: readonly CatalogRowTable[] = [
  {
    id: 'balanceSheet',
    form: T5.name,
    table: T5.table,
    mainRows: 15,
    contRows: 23,
    maxRows: 15 + 23 * 9,
    pages: { field: '_pages', base: 1, max: 10 },
    sides: [
      { key: 'asset', label: '資産', prefix: 'a', options: { note: ASSET_NOTE_OPTIONS } },
      { key: 'liability', label: '負債', prefix: 'l' },
    ],
    columns: [
      { name: 'name', key: '1', label: '科目', kind: 'text', required: true },
      // 貸倒引当金のような控除項目がマイナスで入るため、金額欄は符号を取る
      {
        name: 'evaluated',
        key: '2',
        label: '相続税評価額',
        kind: 'signedInteger',
        unit: '千円',
        hint: '評価そのものなので決算書からは決まらない。帳簿価額をそのまま入れず、空で渡して人に入れてもらう',
      },
      {
        name: 'book',
        key: '3',
        label: '帳簿価額',
        kind: 'signedInteger',
        unit: '千円',
        hint: '直前期の貸借対照表の金額',
      },
      { name: 'note', key: '4', label: '備考', kind: 'enum' },
    ],
    hint: '資産・負債は片方だけでも入れ替えられる。科目をまとめるかどうかは人が決める',
  },
  {
    id: 'shareholders',
    form: T1_1.name,
    table: T1_1.table,
    mainRows: 5,
    contRows: 13,
    maxRows: 5 + 13 * 10,
    pages: { field: '_shpages', base: 0, max: 10 },
    sides: [{ key: 'shareholder', label: '株主', prefix: 'sh' }],
    columns: [
      { name: 'name', key: '1', label: '氏名又は名称', kind: 'text', required: true },
      {
        name: 'shares',
        key: '4',
        label: '㋑ 株式数',
        kind: 'integer',
        unit: '株',
        hint: '別表二の株式数又は出資の金額等',
      },
      {
        name: 'undivided',
        key: '7',
        label: '㋺ 未分割の株式の株式数',
        kind: 'integer',
        unit: '株',
        hint: '遺産分割の状況から決まるので、決算書・申告書からは入れない',
      },
      {
        name: 'votes',
        key: '5',
        label: '㋩ 議決権数',
        kind: 'integer',
        unit: '個',
        hint: '別表二の議決権数',
      },
    ],
    hint:
      '1行目は納税義務者。別表二の並び順ではなく、誰が納税義務者かを人に確かめてから渡すこと。'
      + '続柄・役職・株式の種類は辞書に載せていない（評価方式の判定に直結するので人が入れる）が、'
      + '入れ替えると同じ行のそれらも消えるので、人が入れる前に取り込むこと',
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
  /** 様式に印字されている識別記号（4欄まとめての番号） */
  symbol: string;
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
  companyName: { symbol: string; field: string };
  dates: readonly CatalogDateField[];
  parts: readonly CatalogDatePart[];
  eras: readonly CatalogEra[];
  /** 元号の欄が空のときに使う元号（様式の運用に合わせる） */
  defaultEra: string;
}

export const CATALOG_CASE_IDENTITY: CatalogCaseIdentity = {
  form: T1_1.name,
  table: T1_1.table,
  companyName: { symbol: 'E01', field: 'f12' },
  dates: [
    { key: 'taxPeriod', label: '課税時期', symbol: 'N01', prefix: 'f14', required: true },
    { key: 'fiscalYearFrom', label: '直前期（自）', symbol: 'N02', prefix: 'f15_from', required: false },
    { key: 'fiscalYearTo', label: '直前期（至）', symbol: 'N03', prefix: 'f15_to', required: false },
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

/**
 * 外部ツールへ返す取り決め。
 * 「やらないこと」を辞書と一緒に配るのは、受け手が同じ線引きで動けるようにするため。
 */
export const CATALOG_RULES: readonly string[] = [
  'コードは「様式の略号:様式に印字されている識別記号」（4-1:G01 / 1-2:G09）。同じ記号が別の様式にもあるので、略号まで含めて指定する',
  '金額の単位は千円。円で読み取った値は千円に直してから渡すこと（換算はこちらでは行わない）',
  '小数は受け付けない。端数処理は人が決める',
  '辞書に無いコードへは書き込めない。自動計算欄・他表からの転記欄は辞書に載せていない',
  '経常か非経常か、どの科目をまとめるかは資料からは決まらないので、判断が要るものは人へ返すこと',
  '従業員数・第5表の相続税評価額・続柄や役職（評価方式の判定）は辞書に載せていない。業種目番号は候補を挙げるだけで書き込まない',
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

// 版は辞書の形が変わったときに上げる
// （2: caseIdentity を足した、3: コードを様式の略号つきにして第1表の1・第1表の2 を足した）。
export function buildFieldCatalog(): FieldCatalog {
  return {
    version: 3,
    rules: CATALOG_RULES,
    formats: CATALOG_FORMATS,
    fields: CATALOG_FIELDS,
    rowTables: CATALOG_ROW_TABLES,
    caseIdentity: CATALOG_CASE_IDENTITY,
  };
}
