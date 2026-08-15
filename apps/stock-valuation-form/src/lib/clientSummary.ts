import { calcCompanySize } from '@/components/tables/table1-2/Table1_2Grid';
import { calcTable2 } from '@/components/tables/table2/Table2Grid';
import { calcTable4 } from '@/components/tables/table4/Table4Grid';
import { calcTable5 } from '@/components/tables/table5/Table5Grid';
import { calcShareholderJudgment } from '@/components/tables/Table1_1Grid';
import { forcesSmallCompany, getValuationPurpose } from '@/lib/valuationPurpose';
import type { TableProps } from '@/types/form';

export type SummaryItem = {
  title: string;
  description: string;
  tone: 'positive' | 'attention' | 'neutral';
};

export type ActionItem = {
  priority: '高' | '中' | '低';
  title: string;
  description: string;
};

const SIZE_NAMES: Record<number, string> = {
  0: '小会社', 1: '中会社（L=0.60）', 2: '中会社（L=0.75）', 3: '中会社（L=0.90）', 4: '大会社',
};

const RESULT_NAMES: Record<number, string> = {
  0: '一般の評価会社', 1: '比準要素数1の会社', 2: '株式等保有特定会社', 3: '土地保有特定会社',
  4: '開業後3年未満の会社等', 5: '開業前または休業中の会社', 6: '清算中の会社',
};

const eraDate = (getField: TableProps['getField']) => {
  const era = getField('table1_1', 'f14_g');
  const year = getField('table1_1', 'f14_y');
  const month = getField('table1_1', 'f14_m');
  const day = getField('table1_1', 'f14_d');
  return era && year && month && day ? `${era}${year}年${month}月${day}日` : '未入力';
};

const numberOf = (value: string): number | null => {
  const normalized = value.replace(/,/g, '').trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

function calcSimilarIndustrySensitivity(
  getField: TableProps['getField'],
  t4: ReturnType<typeof calcTable4>,
) {
  const useSecond = t4.p25 !== null && (t4.p22 === null || t4.p25 < t4.p22);
  const prefix = useSecond ? 'r2' : 'r1';
  const marketPrice = useSecond ? t4.A2 : t4.A1;
  const referenceDividendYen = numberOf(getField('table4', `${prefix}sB1`));
  const referenceDividendSen = numberOf(getField('table4', `${prefix}sB2`));
  const referenceDividend = referenceDividendYen === null
    ? null
    : referenceDividendYen + (referenceDividendSen ?? 0) / 100;
  const referenceProfit = numberOf(getField('table4', `${prefix}sC`));
  const referenceNetAsset = numberOf(getField('table4', `${prefix}sD`));
  const medical = getField('table1_1', 'medical') === '1';
  const divisor = medical ? 2 : 3;
  const common = marketPrice !== null && t4.shin !== null && t4.cap4 !== null
    ? (marketPrice * t4.shin * (t4.cap4 / 50)) / divisor
    : null;
  const impact = (reference: number | null) => common !== null && reference !== null && reference > 0
    ? common / reference
    : null;

  return {
    adoptedBlock: useSecond ? '第2業種目' : '第1業種目',
    marketPrice,
    items: [
      { key: 'dividend', label: '配当', value: medical ? null : impact(referenceDividend), excluded: medical },
      { key: 'profit', label: '利益', value: impact(referenceProfit), excluded: false },
      { key: 'netAsset', label: '純資産', value: impact(referenceNetAsset), excluded: false },
    ],
  };
}

export function calcClientSummary(getField: TableProps['getField']) {
  const t2 = calcTable2(getField);
  const t4 = calcTable4(getField);
  const t5 = calcTable5(getField);
  const judge = calcShareholderJudgment(getField);
  const size = calcCompanySize(
    (field) => getField('table1_2', field),
    forcesSmallCompany(getField),
  ).result;
  const purpose = getValuationPurpose(getField);
  const comparablePrice = t4.v28 ?? t4.v27 ?? t4.v26;
  const netAssetPrice = t5['⑫'] ?? t5['⑪'] ?? null;
  const sensitivity = calcSimilarIndustrySensitivity(getField, t4);
  const classificationKnown = t2.j.s1 !== null
    || t2.j.s2 !== null
    || t2.j.s3 !== null
    || t2.j.s4a !== null
    || t2.j.s4b !== null
    || t2.j.s5a
    || t2.j.s5b
    || t2.j.s6;
  const classificationLabel = classificationKnown ? (RESULT_NAMES[t2.result] ?? '判定未完了') : '判定未完了';
  const shareholderMethod = judge.isDozokuFinal === null
    ? '判定未完了'
    : judge.isDozokuFinal ? '原則的評価方式等' : '配当還元方式';

  const missing: string[] = [];
  if (!getField('table1_1', 'f12')) missing.push('会社名');
  if (eraDate(getField) === '未入力') missing.push('評価基準日');
  if (size === null) missing.push('会社規模判定に必要な業種・資産・取引金額・従業員数');
  if (t5['⑪'] === null) missing.push('第5表の資産・負債・発行済株式数');
  if (judge.isDozokuFinal === null) missing.push('株主・議決権情報');

  const current: SummaryItem[] = [
    {
      title: '会社規模・評価区分',
      description: size === null || !classificationKnown
        ? `会社規模は${size === null ? '未判定' : SIZE_NAMES[size]}、評価区分は${classificationLabel}です。必要項目の入力後に判定を確定します。`
        : `${SIZE_NAMES[size]}、${classificationLabel}として判定されています。`,
      tone: classificationKnown && t2.result === 0 ? 'positive' : 'attention',
    },
    {
      title: '株主に応じた評価方式',
      description: `${shareholderMethod}${judge.indivRatio === null ? '' : `（対象株主の議決権割合 ${judge.indivRatio}%）`}です。`,
      tone: judge.isDozokuFinal === null ? 'attention' : 'neutral',
    },
  ];

  if (netAssetPrice !== null && comparablePrice !== null) {
    const gap = netAssetPrice - comparablePrice;
    current.push({
      title: '評価要素の差',
      description: gap > 0
        ? `純資産価額は類似業種比準価額を${Math.abs(gap).toLocaleString('ja-JP')}円上回っています。資産蓄積の影響が相対的に大きい状態です。`
        : gap < 0
          ? `類似業種比準価額は純資産価額を${Math.abs(gap).toLocaleString('ja-JP')}円上回っています。収益・配当要素の影響が相対的に大きい状態です。`
          : '純資産価額と類似業種比準価額は同額です。',
      tone: Math.abs(gap) > Math.max(netAssetPrice, comparablePrice) * 0.25 ? 'attention' : 'neutral',
    });
  }

  if (t2.kabuRatio !== null || t2.landRatio !== null) {
    current.push({
      title: '資産構成',
      description: `総資産に占める株式等は${t2.kabuRatio === null ? '未判定' : `${t2.kabuRatio}%`}、土地等は${t2.landRatio === null ? '未判定' : `${t2.landRatio}%`}です。`,
      tone: t2.j.s2 === true || t2.j.s3 === true ? 'attention' : 'neutral',
    });
  }

  const actions: ActionItem[] = [];
  if (missing.length) {
    actions.push({ priority: '高', title: '未入力項目を確定する', description: `${missing.join('、')}を確認し、判定と金額の精度を高めます。` });
  }
  if (purpose === 'special-market-value') {
    actions.push({ priority: '高', title: '評価基準時点の時価資料を整える', description: '土地・上場有価証券の時価資料と、59－6の場合は譲渡・贈与直前の議決権資料を保存します。' });
  }
  if (t2.j.s2 === true) {
    actions.push({ priority: '高', title: '保有株式の構成を見直す', description: '株式等保有特定会社に該当しているため、事業上の必要性、持株会社化、売却・配当等を含めて保有方針を検討します。' });
  }
  if (t2.j.s3 === true) {
    actions.push({ priority: '高', title: '土地保有の目的と再編余地を確認する', description: '土地保有特定会社への該当を踏まえ、事業利用状況、遊休資産、賃貸・売却・組替えの選択肢を整理します。' });
  }
  if (netAssetPrice !== null && comparablePrice !== null && netAssetPrice > comparablePrice * 1.25) {
    actions.push({ priority: '中', title: '資産蓄積と株価への影響を検証する', description: '余剰資産、配当政策、役員退職金、設備投資などを事業承継計画と一体で検討します。' });
  }
  if (judge.isDozokuFinal === false) {
    actions.push({ priority: '中', title: '株主ごとの評価方式を確認する', description: '配当還元方式の適用可否は株主ごとに異なるため、移転予定株式と移転後の議決権構成を照合します。' });
  }
  actions.push({ priority: actions.length ? '低' : '中', title: '株式移転の実行計画を作る', description: '贈与・譲渡・相続の候補時期、移転株数、資金負担を並べ、税額だけでなく経営権への影響も比較します。' });

  return {
    companyName: getField('table1_1', 'f12') || '会社名未入力',
    representative: getField('table1_1', 'f13') || '未入力',
    valuationDate: eraDate(getField),
    purposeLabel: purpose === 'special-market-value' ? '所得税・法人税の時価評価' : '相続税・贈与税の評価',
    sizeLabel: size === null ? '未判定' : SIZE_NAMES[size],
    classificationLabel,
    shareholderMethod,
    netAssetPrice,
    comparablePrice,
    stockRatio: t2.kabuRatio,
    landRatio: t2.landRatio,
    current,
    actions,
    missing,
    sensitivity,
  };
}
