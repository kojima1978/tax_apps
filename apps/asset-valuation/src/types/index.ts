/**
 * 償却方法
 *
 * 帳簿上（法人税・所得税）の償却方法を表す。相続税の財産評価では
 * 「評価時点で効力を有する耐用年数省令 別表第十（＝200%定率法）を一律適用」
 * するのが原則的な取扱いなので、この区別は**評価計算には影響しない**。
 * 小計を帳簿と突合しやすくするための分類として保持する。
 */
export type DepreciationMethod =
  | '定額法'
  | '200%定率法'
  | '250%定率法'
  | '旧定額法'
  | '旧定率法'
  | '3年均等'
  | '即時償却'
  | '均等償却';

/** 有形固定資産（定額法・定率法を選択できる区分）で選べる償却方法 */
const METHODS_TANGIBLE = [
  '定額法',
  '200%定率法',
  '250%定率法',
  '旧定額法',
  '旧定率法',
] as const;

/** 定額法しか選べない区分（建物・生物）で選べる償却方法 */
const METHODS_STRAIGHT = ['定額法', '旧定額法', '旧定率法'] as const;

/** 無形固定資産（定額法のみ） */
const METHODS_INTANGIBLE = ['定額法'] as const;

/**
 * 資産区分ごとに選択できる償却方法
 * ここが唯一の定義元。カテゴリ名・型・表示順すべてこれから生成する。
 */
export const CLASS_METHODS = {
  建物: METHODS_STRAIGHT,
  建物附属設備: METHODS_TANGIBLE,
  構築物: METHODS_TANGIBLE,
  機械及び装置: METHODS_TANGIBLE,
  車両運搬具: METHODS_TANGIBLE,
  工具器具備品: METHODS_TANGIBLE,
  生物: METHODS_STRAIGHT,
  ソフトウェア: METHODS_INTANGIBLE,
  特許権: METHODS_INTANGIBLE,
  商標権: METHODS_INTANGIBLE,
  意匠権: METHODS_INTANGIBLE,
  実用新案権: METHODS_INTANGIBLE,
  のれん: METHODS_INTANGIBLE,
  一括償却資産: ['3年均等'],
  少額減価償却資産: ['即時償却'],
  繰延資産: ['均等償却'],
} as const satisfies Record<string, readonly DepreciationMethod[]>;

/** 資産区分 */
export type AssetClass = keyof typeof CLASS_METHODS;

/** 資産区分の表示順 */
export const ASSET_CLASSES = Object.keys(CLASS_METHODS) as AssetClass[];

/** 資産カテゴリ（資産区分 × 償却方法） */
export type AssetCategory = {
  [C in AssetClass]: `${C}（${(typeof CLASS_METHODS)[C][number]}）`;
}[AssetClass];

/** 旧バージョンのJSONを読み込むためだけに残しているカテゴリ（新規選択不可） */
export type LegacyAssetCategory = '無形固定資産';

export const LEGACY_CATEGORIES: LegacyAssetCategory[] = ['無形固定資産'];

/** 資産カテゴリ（レガシー含む） */
export type AnyAssetCategory = AssetCategory | LegacyAssetCategory;

/** カテゴリ名を組み立てる */
export function buildCategory<C extends AssetClass>(
  assetClass: C,
  method: (typeof CLASS_METHODS)[C][number]
): AssetCategory {
  return `${assetClass}（${method}）` as AssetCategory;
}

/** 評価方式 */
export type ValuationMethod =
  /** 定額法（取得価額 × 0.9 × 経過/耐用）で償却額を控除 */
  | 'building'
  /** 定率法未償却残額表の残価率を乗じる */
  | 'decliningBalance'
  /** 期末簿価をそのまま評価額とする */
  | 'bookValue'
  /** 財産性なし（評価額0） */
  | 'none';

/** 資産区分ごとの評価上の特性 */
export interface AssetClassConfig {
  valuationMethod: ValuationMethod;
  /** ×0.7（評価上の斟酌） */
  multiply07: boolean;
  /** 固定資産税評価明細による評価の対象になり得るか */
  hasFixedAssetTaxRecord: boolean;
  /** 3年以内取得 → 簿価 の対象になり得るか */
  hasWithin3Years: boolean;
  /** 賃貸（借家権割合30%控除）の対象になり得るか */
  hasRental: boolean;
  /** H列の見出し */
  headerLabel: string;
}

/** 簿価評価の区分は特性が同一なので生成する */
function bookValueConfig(): AssetClassConfig {
  return {
    valuationMethod: 'bookValue',
    multiply07: false,
    hasFixedAssetTaxRecord: false,
    hasWithin3Years: false,
    hasRental: false,
    headerLabel: '',
  };
}

/** 財産性なし（評価額0）の区分の共通特性 */
function noValueConfig(): AssetClassConfig {
  return {
    valuationMethod: 'none',
    multiply07: false,
    hasFixedAssetTaxRecord: false,
    hasWithin3Years: false,
    hasRental: false,
    headerLabel: '',
  };
}

/** 定率法評価の有形資産（×0.7・固定資産税明細・賃貸なし）の共通特性 */
function decliningBalanceConfig(): AssetClassConfig {
  return {
    valuationMethod: 'decliningBalance',
    multiply07: false,
    hasFixedAssetTaxRecord: false,
    hasWithin3Years: false,
    hasRental: false,
    headerLabel: '残価率',
  };
}

const CLASS_CONFIG: Record<AssetClass, AssetClassConfig> = {
  建物: {
    valuationMethod: 'building',
    multiply07: true,
    hasFixedAssetTaxRecord: true,
    hasWithin3Years: true,
    hasRental: true,
    headerLabel: '償却額',
  },
  建物附属設備: {
    valuationMethod: 'decliningBalance',
    multiply07: true,
    hasFixedAssetTaxRecord: true,
    hasWithin3Years: true,
    hasRental: true,
    headerLabel: '残価率',
  },
  構築物: {
    valuationMethod: 'decliningBalance',
    multiply07: true,
    hasFixedAssetTaxRecord: false,
    hasWithin3Years: true,
    hasRental: false,
    headerLabel: '残価率',
  },
  機械及び装置: decliningBalanceConfig(),
  車両運搬具: decliningBalanceConfig(),
  工具器具備品: decliningBalanceConfig(),
  生物: decliningBalanceConfig(),
  ソフトウェア: decliningBalanceConfig(),
  特許権: bookValueConfig(),
  商標権: bookValueConfig(),
  意匠権: bookValueConfig(),
  実用新案権: bookValueConfig(),
  のれん: bookValueConfig(),
  一括償却資産: bookValueConfig(),
  少額減価償却資産: bookValueConfig(),
  // 創立費・開業費等。相続税評価上の財産性はないので評価額0
  繰延資産: noValueConfig(),
};

/** 資産区分ごとの評価根拠 */
const CLASS_EVALUATION_BASIS: Record<AssetClass, EvaluationBasis> = {
  建物: '評基通89－2(2)',
  建物附属設備: '評基通92',
  構築物: '評基通97',
  機械及び装置: '評基通129',
  車両運搬具: '評基通129',
  工具器具備品: '評基通129',
  生物: '評基通129',
  ソフトウェア: '評基通129',
  特許権: '簿価',
  商標権: '簿価',
  意匠権: '簿価',
  実用新案権: '簿価',
  のれん: '簿価',
  一括償却資産: '簿価',
  少額減価償却資産: '簿価',
  繰延資産: '財産性なし',
};

/** 自動マッチ時に採用する既定の償却方法 */
const DEFAULT_METHOD: { [C in AssetClass]: (typeof CLASS_METHODS)[C][number] } = {
  建物: '定額法',
  建物附属設備: '200%定率法',
  構築物: '200%定率法',
  機械及び装置: '200%定率法',
  車両運搬具: '200%定率法',
  工具器具備品: '200%定率法',
  生物: '定額法',
  ソフトウェア: '定額法',
  特許権: '定額法',
  商標権: '定額法',
  意匠権: '定額法',
  実用新案権: '定額法',
  のれん: '定額法',
  一括償却資産: '3年均等',
  少額減価償却資産: '即時償却',
  繰延資産: '均等償却',
};

/** 資産区分の既定カテゴリ（償却方法が特定できないときの初期値） */
export function defaultCategoryOf(assetClass: AssetClass): AssetCategory {
  return buildCategory(assetClass, DEFAULT_METHOD[assetClass]);
}

/** カテゴリごとの特性 */
export interface CategoryConfig extends AssetClassConfig {
  label: string;
  /** 資産区分（レガシーカテゴリは null） */
  assetClass: AssetClass | null;
  /** 償却方法（レガシーカテゴリは null） */
  method: DepreciationMethod | null;
  evaluationBasis: EvaluationBasis;
}

/** レガシーカテゴリの特性 */
const LEGACY_CATEGORY_CONFIG: Record<LegacyAssetCategory, CategoryConfig> = {
  無形固定資産: {
    label: '無形固定資産',
    assetClass: null,
    method: null,
    valuationMethod: 'none',
    evaluationBasis: '財産性なし',
    multiply07: false,
    hasFixedAssetTaxRecord: false,
    hasWithin3Years: false,
    hasRental: false,
    headerLabel: '',
  },
};

/** 資産区分 × 償却方法 の全カテゴリ（表示順） */
export const CATEGORY_ORDER: AnyAssetCategory[] = [
  ...ASSET_CLASSES.flatMap((cls) =>
    (CLASS_METHODS[cls] as readonly DepreciationMethod[]).map((method) =>
      buildCategory(cls, method as never)
    )
  ),
  ...LEGACY_CATEGORIES,
];

/** 新規選択できるカテゴリ（レガシーを除く） */
export const SELECTABLE_CATEGORIES = CATEGORY_ORDER.filter(
  (c): c is AssetCategory => !(LEGACY_CATEGORIES as string[]).includes(c)
);

export const CATEGORY_CONFIG: Record<AnyAssetCategory, CategoryConfig> = {
  ...(Object.fromEntries(
    ASSET_CLASSES.flatMap((cls) =>
      (CLASS_METHODS[cls] as readonly DepreciationMethod[]).map((method) => {
        const category = buildCategory(cls, method as never);
        return [
          category,
          {
            ...CLASS_CONFIG[cls],
            label: category,
            assetClass: cls,
            method,
            evaluationBasis: CLASS_EVALUATION_BASIS[cls],
          } satisfies CategoryConfig,
        ];
      })
    )
  ) as Record<AssetCategory, CategoryConfig>),
  ...LEGACY_CATEGORY_CONFIG,
};

/** 評価根拠 */
export type EvaluationBasis =
  | '固定資産税評価明細'
  | '3年内_簿価'
  | '評基通89－2(2)'
  | '評基通92'
  | '評基通97'
  | '評基通129'
  | '簿価'
  | '財産性なし';

/** 資産データ */
export interface Asset {
  id: string;
  no: number;
  category: AnyAssetCategory;
  categoryLabel: string; // 表示・小計の単位（通常は category と同一）
  name: string;
  acquisitionDate: string; // YYYY-MM-DD
  usefulLife: number;
  acquisitionCost: number;
  bookValue: number;
  hasFixedAssetTaxRecord: boolean;
  isRental: boolean;
  // 計算結果（自動算出）
  elapsedYears: number;
  depreciationAmountOrRate: number;
  evaluationAmount: number | null; // null = '-'
  evaluationBasis: EvaluationBasis;
  isWithin3Years: boolean;
}

/** 案件データ */
export interface CaseData {
  version: string;
  exportedAt: string;
  caseName: string;
  taxDate: string; // YYYY-MM-DD
  assets: Asset[];
  /** 利用者が入れ替えたカテゴリの表示順（未指定＝標準順） */
  categoryOrder?: string[];
}

/** マッピングフィールド */
export const MAPPING_FIELDS = [
  { key: 'no', label: 'NO', required: true },
  { key: 'name', label: '資産名称', required: true },
  { key: 'category', label: '資産カテゴリ', required: true },
  { key: 'acquisitionDate', label: '取得年月', required: true },
  { key: 'usefulLife', label: '耐用年数', required: true },
  { key: 'acquisitionCost', label: '取得価額', required: true },
  { key: 'bookValue', label: '期末簿価', required: true },
] as const;

export type MappingFieldKey = (typeof MAPPING_FIELDS)[number]['key'];

/** カラムマッピング */
export type ColumnMapping = Record<MappingFieldKey, string>;

/** カテゴリマッピング */
export type CategoryMapping = Record<string, AssetCategory>;

/** マッピングプリセット */
export interface MappingPreset {
  name: string;
  columnMapping: ColumnMapping;
  categoryMapping: CategoryMapping;
}

/** プリセットJSON */
export interface PresetExportData {
  version: string;
  presets: MappingPreset[];
}

/** カテゴリ表示順のプリセット（localStorageに保存） */
export interface CategoryOrderPreset {
  name: string;
  order: string[];
}

/**
 * CSVヘッダー名 → マッピングフィールド の候補テーブル。
 * 会計ソフトごとに列名が違うため、初回でも手作業なしで割り当てられるようにする。
 * 先に書いたものを優先する。
 */
const COLUMN_ALIASES: Record<MappingFieldKey, readonly string[]> = {
  no: ['no', '番号', '管理番号', '資産番号', '資産no', '整理番号', '通番', '資産コード', 'コード'],
  name: ['資産名称', '資産名', '名称等', '名称', '資産の名称', '資産の名称等', '品名', '摘要'],
  category: ['勘定科目', '勘定科目名', '科目', '資産区分', '資産の種類', '資産種類', '種類', '資産分類', 'カテゴリ'],
  acquisitionDate: ['取得年月日', '取得年月', '取得日', '取得日付', '事業供用日', '供用年月日'],
  usefulLife: ['耐用年数', '法定耐用年数', '償却年数', '耐用'],
  acquisitionCost: ['取得価額', '取得金額', '取得原価', '取得価格'],
  bookValue: ['期末帳簿価額', '期末簿価', '期末未償却残高', '未償却残高', '期末残高', '帳簿価額', '簿価'],
};

/** 照合用にヘッダー名を正規化（空白除去・全角英数記号→半角・小文字化） */
function normalizeHeader(raw: string): string {
  return raw
    .replace(/[\s　]/g, '')
    .replace(/[Ａ-Ｚａ-ｚ０-９％]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .toLowerCase();
}

/**
 * CSVヘッダーからカラム割り当てを推測する。
 * 完全一致を全フィールドで先に確定させ、余ったヘッダーだけ部分一致に回す
 * （「取得価額」より先に「取得年月日」を取られる等の取り違えを防ぐ）。
 */
export function autoMapColumns(headers: string[]): ColumnMapping {
  const normalized = headers.map(normalizeHeader);
  const used = new Set<number>();
  const result = Object.fromEntries(
    MAPPING_FIELDS.map((f) => [f.key, ''])
  ) as ColumnMapping;

  const assign = (key: MappingFieldKey, match: (header: string, alias: string) => boolean) => {
    if (result[key]) return;
    for (const alias of COLUMN_ALIASES[key]) {
      const idx = normalized.findIndex(
        (h, i) => !used.has(i) && match(h, normalizeHeader(alias))
      );
      if (idx >= 0) {
        result[key] = headers[idx]!;
        used.add(idx);
        return;
      }
    }
  };

  for (const f of MAPPING_FIELDS) assign(f.key, (h, alias) => h === alias);
  for (const f of MAPPING_FIELDS) assign(f.key, (h, alias) => h.includes(alias));

  return result;
}

/** 最長共通部分列の長さ ÷ 長い方の文字数（0〜1） */
function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const dp = new Array<number>(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    let prev = 0;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j]!;
      dp[j] = a[i - 1] === b[j - 1] ? prev + 1 : Math.max(dp[j]!, dp[j - 1]!);
      prev = tmp;
    }
  }
  return dp[b.length]! / Math.max(a.length, b.length);
}

/**
 * 解決できなかったカテゴリ名に近い資産区分を提案する。
 * 「工具備品」→ 工具器具備品 のような表記ゆれの手がかりを出すためのもの。
 */
export function suggestAssetClasses(raw: string, limit = 3): AssetClass[] {
  // 「（１）」等の枝番は落として区分名だけで比較する
  const key = raw.replace(/[（(].*$/, '').trim();
  if (!key) return [];
  const best = new Map<AssetClass, number>();
  for (const [alias, cls] of Object.entries(CLASS_ALIASES)) {
    const score = similarity(key, alias);
    if (score > (best.get(cls) ?? 0)) best.set(cls, score);
  }
  return Array.from(best.entries())
    .filter(([, score]) => score >= 0.4)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([cls]) => cls);
}

/** CSVのカテゴリ名 → 資産区分 の正規化テーブル */
export const CLASS_ALIASES: Record<string, AssetClass> = {
  建物: '建物',
  たてもの: '建物',
  建物付属設備: '建物附属設備',
  建物附属設備: '建物附属設備',
  付属設備: '建物附属設備',
  附属設備: '建物附属設備',
  構築物: '構築物',
  機械装置: '機械及び装置',
  機械及び装置: '機械及び装置',
  車両: '車両運搬具',
  車両運搬具: '車両運搬具',
  '車両及び運搬具': '車両運搬具',
  器具備品: '工具器具備品',
  '器具及び備品': '工具器具備品',
  工具器具備品: '工具器具備品',
  工具器具及び備品: '工具器具備品',
  生物: '生物',
  ソフトウェア: 'ソフトウェア',
  ソフトウエア: 'ソフトウェア',
  特許権: '特許権',
  商標権: '商標権',
  意匠権: '意匠権',
  実用新案権: '実用新案権',
  のれん: 'のれん',
  営業権: 'のれん',
  一括償却資産: '一括償却資産',
  一括償却: '一括償却資産',
  少額減価償却資産: '少額減価償却資産',
  少額資産: '少額減価償却資産',
  繰延資産: '繰延資産',
  創立費: '繰延資産',
  開業費: '繰延資産',
  開発費: '繰延資産',
  株式交付費: '繰延資産',
  社債発行費: '繰延資産',
};

/** 償却方法名の正規化テーブル（全角記号・全角数字は正規化してから引く） */
const METHOD_ALIASES: Record<string, DepreciationMethod> = {
  定額法: '定額法',
  新定額法: '定額法',
  '200%定率法': '200%定率法',
  定率法: '200%定率法',
  '250%定率法': '250%定率法',
  旧定額法: '旧定額法',
  旧定率法: '旧定率法',
  '3年均等': '3年均等',
  即時償却: '即時償却',
  均等償却: '均等償却',
  均等額償却: '均等償却',
};

/** 全角の％・数字を半角へ */
function normalizeMethodName(raw: string): string {
  return raw
    .replace(/％/g, '%')
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
}

/** 「区分（償却方法）」形式を分解する */
function splitCategoryName(raw: string): { cls?: AssetClass; method?: DepreciationMethod } {
  const m = raw.match(/^(.+?)[（(]\s*([^（()）]+?)\s*[)）]\s*$/);
  if (!m) return {};
  return {
    cls: CLASS_ALIASES[m[1]!.trim()],
    method: METHOD_ALIASES[normalizeMethodName(m[2]!.trim())],
  };
}

/** CSVのカテゴリ名から新カテゴリを解決する */
export function resolveBaseCategory(raw: string): AssetCategory | undefined {
  const trimmed = raw.trim();

  // 「区分（償却方法）」の完全一致
  const parsed = splitCategoryName(trimmed);
  if (parsed.cls) {
    const methods = CLASS_METHODS[parsed.cls] as readonly DepreciationMethod[];
    if (parsed.method && methods.includes(parsed.method)) {
      return buildCategory(parsed.cls, parsed.method as never);
    }
    // （１）等の連番サフィックスは無視して区分だけで解決
    return defaultCategoryOf(parsed.cls);
  }

  // 区分名のみ
  const cls = CLASS_ALIASES[trimmed];
  if (cls) return defaultCategoryOf(cls);

  return undefined;
}

/** 旧バージョンのカテゴリ名を新カテゴリへ移行する */
export function migrateCategory(raw: string): AnyAssetCategory | undefined {
  if (raw in CATEGORY_CONFIG) return raw as AnyAssetCategory;
  return resolveBaseCategory(raw);
}

/**
 * categoryLabelでグループ化し、CATEGORY_ORDER準拠で並べる。
 * labelOrder（利用者が入れ替えた順）を渡すとそれを優先し、
 * labelOrder に無いカテゴリは標準順のまま後ろに続く。
 */
export function groupByLabel(
  assets: Asset[],
  labelOrder?: readonly string[]
): [string, Asset[]][] {
  const labelMap = new Map<string, Asset[]>();
  for (const a of assets) {
    if (!labelMap.has(a.categoryLabel)) labelMap.set(a.categoryLabel, []);
    labelMap.get(a.categoryLabel)!.push(a);
  }
  const result: [string, Asset[]][] = [];
  for (const baseCat of CATEGORY_ORDER) {
    const labels = Array.from(labelMap.keys())
      .filter((l) => labelMap.get(l)![0]!.category === baseCat)
      .sort();
    for (const label of labels) {
      result.push([label, labelMap.get(label)!]);
      labelMap.delete(label);
    }
  }
  // CATEGORY_ORDER に無いカテゴリ（想定外）は末尾へ
  for (const [label, group] of labelMap) {
    result.push([label, group]);
  }

  if (!labelOrder?.length) return result;
  // 指定されたカテゴリを指定順に並べ、未指定分は標準順のまま後ろへ（sortは安定）
  const rank = new Map(labelOrder.map((l, i) => [l, i]));
  return result.sort(
    ([a], [b]) =>
      (rank.get(a) ?? Number.MAX_SAFE_INTEGER) -
      (rank.get(b) ?? Number.MAX_SAFE_INTEGER)
  );
}

/** ステップ定義 */
export const STEPS = [
  { id: 1, label: 'CSVインポート' },
  { id: 2, label: 'カラムマッピング' },
  { id: 3, label: 'データ確認・編集' },
  { id: 4, label: '計算結果' },
] as const;

export type StepId = (typeof STEPS)[number]['id'];
