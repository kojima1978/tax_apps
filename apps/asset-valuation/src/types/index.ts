/** 資産カテゴリ */
export type AssetCategory =
  | '建物'
  | '建物付属設備'
  | '構築物'
  | '機械装置'
  | '車両'
  | '器具備品'
  | 'ソフトウェア'
  | '無形固定資産'
  | '繰延資産'
  | '一括償却資産';

/** カテゴリ表示順 */
export const CATEGORY_ORDER: AssetCategory[] = [
  '建物',
  '建物付属設備',
  '構築物',
  '機械装置',
  '車両',
  '器具備品',
  'ソフトウェア',
  '無形固定資産',
  '繰延資産',
  '一括償却資産',
];

/** カテゴリごとの特性 */
export interface CategoryConfig {
  label: string;
  excelHeader: string;
  depreciationMethod: '定額法' | '定率法';
  multiply07: boolean;
  hasFixedAssetTaxRecord: boolean;
  hasWithin3Years: boolean;
  hasRental: boolean;
  headerLabel: string;
}

export const CATEGORY_CONFIG: Record<AssetCategory, CategoryConfig> = {
  建物: {
    label: '建物',
    excelHeader: '【1211 建物】',
    depreciationMethod: '定額法',
    multiply07: true,
    hasFixedAssetTaxRecord: true,
    hasWithin3Years: true,
    hasRental: true,
    headerLabel: '償却額',
  },
  建物付属設備: {
    label: '建物付属設備',
    excelHeader: '【    建物付属設備    】',
    depreciationMethod: '定率法',
    multiply07: true,
    hasFixedAssetTaxRecord: true,
    hasWithin3Years: true,
    hasRental: true,
    headerLabel: '償却率',
  },
  構築物: {
    label: '構築物',
    excelHeader: '【       構築物       】',
    depreciationMethod: '定率法',
    multiply07: true,
    hasFixedAssetTaxRecord: false,
    hasWithin3Years: true,
    hasRental: false,
    headerLabel: '償却率',
  },
  機械装置: {
    label: '機械装置',
    excelHeader: '【     機械装置     】',
    depreciationMethod: '定率法',
    multiply07: false,
    hasFixedAssetTaxRecord: false,
    hasWithin3Years: false,
    hasRental: false,
    headerLabel: '償却率',
  },
  車両: {
    label: '車両及び運搬具',
    excelHeader: '【    車両及び運搬具    】',
    depreciationMethod: '定率法',
    multiply07: false,
    hasFixedAssetTaxRecord: false,
    hasWithin3Years: false,
    hasRental: false,
    headerLabel: '償却率',
  },
  器具備品: {
    label: '器具及び備品',
    excelHeader: '【    器具及び備品    】',
    depreciationMethod: '定率法',
    multiply07: false,
    hasFixedAssetTaxRecord: false,
    hasWithin3Years: false,
    hasRental: false,
    headerLabel: '償却率',
  },
  ソフトウェア: {
    label: 'ソフトウェア',
    excelHeader: '【    ソフトウェア    】',
    depreciationMethod: '定率法',
    multiply07: false,
    hasFixedAssetTaxRecord: false,
    hasWithin3Years: false,
    hasRental: false,
    headerLabel: '償却率',
  },
  無形固定資産: {
    label: '無形固定資産',
    excelHeader: '【    無形固定資産    】',
    depreciationMethod: '定額法',
    multiply07: false,
    hasFixedAssetTaxRecord: false,
    hasWithin3Years: false,
    hasRental: false,
    headerLabel: '',
  },
  繰延資産: {
    label: '繰延資産',
    excelHeader: '【      繰延資産      】',
    depreciationMethod: '定額法',
    multiply07: false,
    hasFixedAssetTaxRecord: false,
    hasWithin3Years: false,
    hasRental: false,
    headerLabel: '',
  },
  一括償却資産: {
    label: '一括償却資産',
    excelHeader: '【    一括償却資産    】',
    depreciationMethod: '定額法',
    multiply07: false,
    hasFixedAssetTaxRecord: false,
    hasWithin3Years: false,
    hasRental: false,
    headerLabel: '',
  },
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
  category: AssetCategory;
  categoryLabel: string; // 表示用ラベル（例: "無形固定資産（１）"）
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

/** カテゴリ名の正規化テーブル */
export const CATEGORY_ALIASES: Record<string, AssetCategory> = {
  建物: '建物',
  たてもの: '建物',
  建物付属設備: '建物付属設備',
  建物附属設備: '建物付属設備',
  付属設備: '建物付属設備',
  附属設備: '建物付属設備',
  構築物: '構築物',
  機械装置: '機械装置',
  '機械及び装置': '機械装置',
  車両: '車両',
  '車両及び運搬具': '車両',
  車両運搬具: '車両',
  器具備品: '器具備品',
  '器具及び備品': '器具備品',
  工具器具備品: '器具備品',
  ソフトウェア: 'ソフトウェア',
  ソフトウエア: 'ソフトウェア',
  無形固定資産: '無形固定資産',
  無形資産: '無形固定資産',
  繰延資産: '繰延資産',
  一括償却資産: '一括償却資産',
  一括償却: '一括償却資産',
};

/** カテゴリ名からサフィックスを除去して基底カテゴリを取得 */
export function resolveBaseCategory(raw: string): AssetCategory | undefined {
  // 完全一致
  if (CATEGORY_ALIASES[raw]) return CATEGORY_ALIASES[raw];
  // （数字）や (数字) のサフィックスを除去して再検索
  const stripped = raw.replace(/[（(]\s*[０-９0-9]+\s*[）)]\s*$/, '').trim();
  if (stripped !== raw && CATEGORY_ALIASES[stripped]) return CATEGORY_ALIASES[stripped];
  return undefined;
}

/** categoryLabelでグループ化し、CATEGORY_ORDER準拠で並べる */
export function groupByLabel(assets: Asset[]): [string, Asset[]][] {
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
  return result;
}

/** ステップ定義 */
export const STEPS = [
  { id: 1, label: 'CSVインポート' },
  { id: 2, label: 'カラムマッピング' },
  { id: 3, label: 'データ確認・編集' },
  { id: 4, label: '計算結果' },
] as const;

export type StepId = (typeof STEPS)[number]['id'];
