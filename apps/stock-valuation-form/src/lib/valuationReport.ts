import { calcTable3 } from '@/components/tables/table3/Table3Grid';
import { calcTable4 } from '@/components/tables/table4/calcTable4';
import { calcTable5 } from '@/components/tables/table5/Table5Grid';
import { KUBUN_BY_RESULT, calcTable6 } from '@/components/tables/table6/calcTable6';
import { RESULT_NAMES } from '@/components/tables/table2/Table2Grid';
import { SIZE_OVERRIDE_FIELD, calcCompanySize } from '@/components/tables/table1-2/Table1_2Grid';
import { calcShareholderJudgment, totalShOf } from '@/components/tables/Table1_1Grid';
import { SIZE_NAMES } from '@/lib/clientSummary';
import {
  SPECIAL_CENTRAL_HOLDER_FIELD,
  VALUATION_PURPOSE_FIELD,
  forcesSmallCompany,
  type ValuationPurpose,
} from '@/lib/valuationPurpose';
import type { TableProps } from '@/types/form';
import { stripAmountFormatting } from '@/lib/numberFormat';
import { formatRatePercent, getCorporateTaxRatePercent } from '@/lib/corporateTaxRate';

// ══ お客様報告用の株価集計 ══
// 既存の calcTableN はすべて getField を引数に取るので、getField をプロキシして
// 評価目的を差し替えれば「相続税評価額ベース」と「所得税・法人税ベース」を
// 同時に計算できる。各表の計算ロジックには一切手を入れない。

/** 評価目的を上書きした getField を返す */
export function withPurpose(
  getField: TableProps['getField'],
  purpose: ValuationPurpose,
): TableProps['getField'] {
  return (table, field) => {
    if (table === 'table1_1' && field === VALUATION_PURPOSE_FIELD) {
      return purpose === 'special-market-value' ? 'special-market-value' : '';
    }
    // 所得税・法人税ベースは所基通59－6／法基通9－1－14による評価そのものを示すため、
    // 帳票側のチェックの有無にかかわらず同(2)の小会社みなしを適用する。
    if (table === 'table1_1' && field === SPECIAL_CENTRAL_HOLDER_FIELD) {
      return purpose === 'special-market-value' ? '1' : '';
    }
    return getField(table, field);
  };
}

/**
 * 第4表の直前期の年利益金額（⑪〜⑮）を差し替えた getField を返す。
 * ⑯＝⑪－⑫＋⑬－⑭＋⑮ なので、⑪へ金額を入れて⑫〜⑮を0にすれば⑯がちょうどその金額になる。
 *
 * 置き換えるのは直前期だけで、直前々期以前は実績のまま残す。利益0も想定利益も
 * 「直前期の業績だけが変わったら」という同じ問いなので、扱いをそろえてある。
 * Ⓒの基は min（置換額, 置換額と直前々期実績の平均）と、通達どおりの計算がそのまま働く
 * （第4表で2年平均を選んでいる場合は、利益0でもⒸは0にならず直前々期の実績が残る）。
 */
const LATEST_PROFIT_INCOME = 'e18';
const LATEST_PROFIT_ADJUST = new Set(['e19', 'e20', 'e21', 'e22']);

export function withProfit(getField: TableProps['getField'], amount: number): TableProps['getField'] {
  return (table, field) => {
    if (table !== 'table4') return getField(table, field);
    if (field === LATEST_PROFIT_INCOME) return String(amount);
    if (LATEST_PROFIT_ADJUST.has(field)) return '0';
    return getField(table, field);
  };
}

/**
 * 会社規模を上書きした getField を返す。第1表の2の判定（総資産価額・取引金額・従業員数）を
 * 飛ばして規模だけ差し替えるので、第4表の斟酌率・第3表のLの割合・第2表の土地保有特定会社の
 * 判定基準が、まとめてその規模のものになる。
 */
export function withSize(getField: TableProps['getField'], size: number): TableProps['getField'] {
  return (table, field) => {
    if (table === 'table1_2' && field === SIZE_OVERRIDE_FIELD) return String(size);
    return getField(table, field);
  };
}

/**
 * 株主 r を納税義務者（1行目）とみなす getField を返す。
 * 1行目と r 行目を入れ替えるだけなので、同族グループの議決権合計は変わらず、
 * 既存の calcShareholderJudgment をそのまま行ごとの判定に流用できる。
 * 第1表の2の手動判定（役員・中心的な同族株主）は納税義務者本人の入力なので、
 * r≠1 では空にして「判定未了」に落とす（勝手に他人へ流用しない）。
 */
function asTaxpayer(getField: TableProps['getField'], row: number): TableProps['getField'] {
  if (row === 1) return getField;
  const MANUAL_JUDGMENT_FIELDS = ['j_yakuin', 'j_chushin_self', 'j_chushin_other'];
  return (table, field) => {
    if (table === 'table1_2' && MANUAL_JUDGMENT_FIELDS.includes(field)) return '';
    if (table === 'table1_1') {
      const m = /^sh_(\d+)_(.+)$/.exec(field);
      if (m) {
        const r = Number(m[1]);
        if (r === 1) return getField(table, `sh_${row}_${m[2]}`);
        if (r === row) return getField(table, `sh_1_${m[2]}`);
      }
    }
    return getField(table, field);
  };
}

const numberOf = (value: string): number | null => {
  const normalized = stripAmountFormatting(value);
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

export type ValuationBasisKey = ValuationPurpose;

export type ValuationBasis = {
  key: ValuationBasisKey;
  label: string;
  note: string;
  /** 類似業種比準価額（第4表 ㉘→㉗→㉖） */
  comparablePrice: number | null;
  /** 年利益金額を0としたときの類似業種比準価額 */
  comparablePriceZeroProfit: number | null;
  /** 直前期の年利益金額を想定額としたときの類似業種比準価額（想定利益が未入力なら null） */
  comparablePriceAssumed: number | null;
  /** 1株当たり純資産価額（第5表 ⑪） */
  netAssetPrice: number | null;
  /** Lの割合（中会社のみ。大会社・小会社は null。特定の評価会社では価額に使わない） */
  lRate: number | null;
  /** 第2表の特定の評価会社の判定（0=一般 1=比準要素数1 … 6=清算中） */
  classification: number;
  classificationName: string;
  /** 特定の評価会社のときに用いた第6表の区分記号（④〜⑧。一般・清算中は null） */
  gensokuKubun: string | null;
  /** 原則的評価方式による価額（一般は第3表、特定の評価会社は第6表） */
  gensoku: number | null;
  /** 年利益金額を0としたときの原則的評価方式による価額 */
  gensokuZeroProfit: number | null;
  /** 直前期の年利益金額を想定額としたときの原則的評価方式による価額（想定利益が未入力なら null） */
  gensokuAssumed: number | null;
  /** 配当還元方式による価額（第3表 ㉔。なければ㉓） */
  haitoKangen: number | null;
  /** 会社規模の判定結果（0=小会社 1〜3=中会社 4=大会社。未判定は null） */
  size: number | null;
  sizeLabel: string;
  /** 評価差額に対する法人税額等相当額の割合（％）。年分と前提条件で変わる */
  corporateTaxRatePercent: number;
};

export const BASIS_LABELS: Record<ValuationBasisKey, { label: string; note: string }> = {
  inheritance: {
    label: '相続税評価額ベース',
    // 率は年分で変わるので、率まで書く注記は basisNote で組み立てる（ここは率の入らない言い方）
    note: '評価差額に対する法人税額等相当額を控除',
  },
  'special-market-value': {
    label: '所得税・法人税ベース',
    note: '所基通59－6／法基通9－1－14：小会社として評価し、法人税額等相当額を控除しない',
  },
};

/**
 * 特定の評価会社に当たるときの原則的評価額は第6表から採る。
 * 第3表の gensoku（⑩→⑧→④⑤⑦）に対応するのが第6表の jun（純資産価額方式等の最終価額）。
 * 清算中の会社はどちらの表でも算定しないので null のまま返る。
 */
const gensokuOf = (t3: { gensoku: number | null }, t6: { t2: { result: number }; jun: number | null }) =>
  t6.t2.result === 0 ? t3.gensoku : t6.jun;

/**
 * 併用割合の説明。一般の評価会社は会社規模（Lの割合）だが、
 * 特定の評価会社は規模によらず第6表の算定方法欄のとおりに決まる。
 * 株価一覧と退職金の試算の両方から同じ文を使う。
 */
const SPECIAL_MIX_NOTES: Record<number, string> = {
  1: '第6表④：純資産価額と（類似業種比準価額 × 25％＋純資産価額 × 75％）のいずれか低い方',
  2: '第6表⑤：第7表の3の㊘（S1＋S2方式）',
  3: '第6表⑥：純資産価額 100％',
  4: '第6表⑦：純資産価額 100％',
  5: '第6表⑧：純資産価額 100％',
  6: '清算分配見込額により評価（第3表・第6表は使用しません）',
};

/**
 * ベースごとの注記。相続税評価額ベースだけ法人税額等相当額の割合が入る。
 * 率は課税時期の年分（と前提条件の上書き）で変わるので、文字列に焼き込まない。
 */
export function basisNote(key: ValuationBasisKey, ratePercent: number): string {
  return key === 'inheritance'
    ? `評価差額に対する法人税額等相当額（${formatRatePercent(ratePercent)}％）を控除`
    : BASIS_LABELS[key].note;
}

export function basisMixNote(basis: ValuationBasis): string | null {
  if (basis.classification !== 0) return SPECIAL_MIX_NOTES[basis.classification] ?? null;
  if (basis.size === null) return null;
  const rate = basis.lRate ?? (basis.size === 4 ? 1 : basis.size === 0 ? 0.5 : null);
  if (rate === null) return null;
  const pct = (v: number) => (v * 100).toLocaleString('ja-JP', { maximumFractionDigits: 2 });
  return `類似業種 ${pct(rate)}％・純資産 ${pct(1 - rate)}％`;
}

/** 指定した評価目的での株価一式 */
export function calcValuationBasis(
  getField: TableProps['getField'],
  key: ValuationBasisKey,
  assumedProfit: number | null = null,
): ValuationBasis {
  const gf = withPurpose(getField, key);
  const gfZero = withProfit(gf, 0);
  const gfAssumed = assumedProfit === null ? null : withProfit(gf, assumedProfit);
  const t3 = calcTable3(gf);
  const t3zero = calcTable3(gfZero);
  const t3assumed = gfAssumed && calcTable3(gfAssumed);
  const t4 = calcTable4(gf);
  const t4zero = calcTable4(gfZero);
  const t4assumed = gfAssumed && calcTable4(gfAssumed);
  const t5 = calcTable5(gf);
  // 特定の評価会社に当たるときは第3表を使わない。判定は利益を差し替えると変わりうる
  // （比準要素数１の判定は財産を見る）ので、試算ごとに第6表も通す。
  const t6 = calcTable6(gf);
  const t6zero = calcTable6(gfZero);
  const t6assumed = gfAssumed && calcTable6(gfAssumed);
  const classification = t6.t2.result;
  const size = calcCompanySize((field) => gf('table1_2', field), forcesSmallCompany(gf)).result;
  const corporateTaxRatePercent = getCorporateTaxRatePercent(gf);
  return {
    key,
    ...BASIS_LABELS[key],
    note: basisNote(key, corporateTaxRatePercent),
    corporateTaxRatePercent,
    comparablePrice: t4.v28 ?? t4.v27 ?? t4.v26,
    comparablePriceZeroProfit: t4zero.v28 ?? t4zero.v27 ?? t4zero.v26,
    comparablePriceAssumed: t4assumed ? t4assumed.v28 ?? t4assumed.v27 ?? t4assumed.v26 : null,
    netAssetPrice: t5['⑪'] ?? null,
    lRate: t3.lRate,
    classification,
    classificationName: RESULT_NAMES[classification] ?? RESULT_NAMES[0]!,
    gensokuKubun: KUBUN_BY_RESULT[classification] ?? null,
    gensoku: gensokuOf(t3, t6),
    gensokuZeroProfit: gensokuOf(t3zero, t6zero),
    gensokuAssumed: t3assumed && t6assumed ? gensokuOf(t3assumed, t6assumed) : null,
    // 配当還元価額の上限は「原則的評価額」なので、こちらも使う表を揃える
    haitoKangen: classification === 0 ? t3.haitoKangen : t6.v26 ?? t6.v25,
    size,
    sizeLabel: size === null ? '判定未完了' : SIZE_NAMES[size] ?? '判定未完了',
  };
}

export type ShareholderMethod = 'gensoku' | 'haito' | 'unknown';

export type ShareholderValuationRow = {
  row: number;
  name: string;
  relation: string;
  /** 株式数（第1表の1 の株式数欄） */
  shares: number | null;
  /** 議決権数 */
  votes: number | null;
  /** 議決権割合（%・1%未満切捨て） */
  votingRatio: number | null;
  method: ShareholderMethod;
  methodLabel: string;
  /** 判定が確定しない理由（確定していれば null） */
  pendingReason: string | null;
  /** ベースごとの単価と評価額（method が unknown のときは原則・配当還元の両建て） */
  amounts: {
    basis: ValuationBasisKey;
    gensokuTotal: number | null;
    /** 年利益金額を0としたときの原則的評価方式による評価額 */
    gensokuZeroProfitTotal: number | null;
    /** 直前期の年利益金額を想定額としたときの原則的評価方式による評価額 */
    gensokuAssumedTotal: number | null;
    haitoTotal: number | null;
  }[];
};

const multiply = (unit: number | null, shares: number | null) =>
  unit === null || shares === null ? null : Math.floor(unit * shares);

/**
 * 株主ごとの評価。第1表の1 の各行を納税義務者とみなして判定をやり直す。
 * 議決権5%未満の行は少数株式所有者の判定（役員・中心的な同族株主）が
 * 本人の入力に依存するため確定できない。その場合は決め打ちせず両建てで返す。
 */
export function calcShareholderValuations(
  getField: TableProps['getField'],
  bases: ValuationBasis[],
): ShareholderValuationRow[] {
  const total = totalShOf(getField);
  const rows: ShareholderValuationRow[] = [];
  for (let r = 1; r <= total; r++) {
    const name = getField('table1_1', `sh_${r}_1`).trim();
    const shares = numberOf(getField('table1_1', `sh_${r}_4`));
    const votes = numberOf(getField('table1_1', `sh_${r}_5`));
    if (name === '' && shares === null && votes === null) continue;

    const judge = calcShareholderJudgment(asTaxpayer(getField, r));
    const method: ShareholderMethod = judge.isDozokuFinal === null
      ? 'unknown'
      : judge.isDozokuFinal ? 'gensoku' : 'haito';
    const pendingReason = method !== 'unknown'
      ? null
      : judge.isDozoku === null
        ? '議決権の総数・株主情報が未入力です'
        : judge.shosuApplies
          ? '議決権5%未満のため、役員・中心的な同族株主の判定が必要です'
          : '株主判定が未完了です';

    rows.push({
      row: r,
      name,
      relation: getField('table1_1', `sh_${r}_2`).trim(),
      shares,
      votes,
      votingRatio: judge.indivRatio,
      method,
      methodLabel: method === 'gensoku' ? '原則的評価方式等' : method === 'haito' ? '配当還元方式' : '要確認',
      pendingReason,
      amounts: bases.map((basis) => ({
        basis: basis.key,
        gensokuTotal: method === 'haito' ? null : multiply(basis.gensoku, shares),
        gensokuZeroProfitTotal: method === 'haito' ? null : multiply(basis.gensokuZeroProfit, shares),
        gensokuAssumedTotal: method === 'haito' ? null : multiply(basis.gensokuAssumed, shares),
        haitoTotal: method === 'gensoku' ? null : multiply(basis.haitoKangen, shares),
      })),
    });
  }
  return rows;
}

/** 会社規模を変えた場合の株価（相続税評価額ベース） */
export type SizeScenario = {
  /** 0=小会社 1〜3=中会社 4=大会社 */
  size: number;
  sizeLabel: string;
  /** 類似業種比準価額（第4表 ㉘→㉗→㉖） */
  comparablePrice: number | null;
  /** 原則的評価方式による価額（一般は第3表、特定の評価会社は第6表） */
  gensoku: number | null;
  /** その規模での第2表の判定（0=一般。規模で土地保有特定会社の判定が変わる） */
  classification: number;
  /** 第1表の2の判定と一致する規模か */
  current: boolean;
};

/** 報告書では大きい規模から並べる（規模が下がるほど純資産価額に寄る、という読み方になる） */
const SIZE_ORDER = [4, 3, 2, 1, 0];

/**
 * 会社規模を変えたときの株価。相続税評価額ベースだけを対象にする
 * （所得税・法人税ベースは所基通59－6(2)により常に小会社として評価するので、規模を動かしても変わらない）。
 */
export function calcSizeScenarios(
  getField: TableProps['getField'],
  currentSize: number | null,
): SizeScenario[] {
  const gf = withPurpose(getField, 'inheritance');
  return SIZE_ORDER.map((size) => {
    // 土地保有特定会社の判定基準は会社規模で変わるので、規模ごとに第2表から引き直す
    const sized = withSize(gf, size);
    const t3 = calcTable3(sized);
    const t6 = calcTable6(sized);
    return {
      size,
      sizeLabel: SIZE_NAMES[size] ?? '',
      comparablePrice: t3.v1,
      gensoku: gensokuOf(t3, t6),
      classification: t6.t2.result,
      current: size === currentSize,
    };
  });
}

export type ValuationReport = {
  bases: ValuationBasis[];
  shareholders: ShareholderValuationRow[];
  /** 試算に使った直前期の想定年利益金額（千円）。未入力なら null */
  assumedProfit: number | null;
  /** 会社規模を変えた場合の株価（相続税評価額ベース。大会社→小会社の順） */
  sizeScenarios: SizeScenario[];
};

/** お客様報告の株価セクション一式 */
export function calcValuationReport(
  getField: TableProps['getField'],
  assumedProfit: number | null = null,
): ValuationReport {
  const bases: ValuationBasis[] = [
    calcValuationBasis(getField, 'inheritance', assumedProfit),
    calcValuationBasis(getField, 'special-market-value', assumedProfit),
  ];
  return {
    bases,
    shareholders: calcShareholderValuations(getField, bases),
    assumedProfit,
    sizeScenarios: calcSizeScenarios(getField, bases[0]!.size),
  };
}
