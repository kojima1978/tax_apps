import type { Heir, HeirComposition, HeirType, SpouseAcquisitionMode, BeneficiaryOption } from '../types';
import { RANK_LABELS } from '../constants';

/**
 * 有効な相続人数を計算（代襲相続を考慮）
 * - 存命の相続人: 1人としてカウント
 * - 死亡かつ代襲相続人あり: 代襲相続人の人数をカウント
 * - 死亡かつ代襲相続人なし: 0人
 */
function countEffectiveHeirs(heirs: Heir[]): number {
  return heirs.reduce((acc, heir) => {
    if (heir.isDeceased && heir.representatives) {
      return acc + heir.representatives.length;
    }
    return acc + (heir.isDeceased ? 0 : 1);
  }, 0);
}

/** 有効相続人の個別割合（代襲相続考慮） */
export interface EffectiveHeirShare {
  type: HeirType;
  /** othersグループ内での割合（合計 = 1.0） */
  ratio: number;
  label: string;
}

/**
 * 代襲相続を考慮した個別割合を返す。
 * 被代襲者の取り分を代襲相続人で均等分割する。
 */
export function getEffectiveHeirShares(composition: HeirComposition): EffectiveHeirShare[] {
  let heirs: Heir[];
  let baseType: HeirType;
  let repType: HeirType;

  switch (composition.selectedRank) {
    case 'rank1':
      heirs = composition.rank1Children;
      baseType = 'child';
      repType = 'grandchild';
      break;
    case 'rank2': {
      const count = composition.rank2Ascendants.length;
      if (count === 0) return [];
      return composition.rank2Ascendants.map((_, i) => ({
        type: 'parent' as HeirType,
        ratio: 1 / count,
        label: getHeirLabel('parent', i, count),
      }));
    }
    case 'rank3':
      heirs = composition.rank3Siblings;
      baseType = 'sibling';
      repType = 'nephew_niece';
      break;
    default:
      return [];
  }

  const originalCount = heirs.length;
  if (originalCount === 0) return [];

  const perOriginal = 1 / originalCount;
  const raw: { type: HeirType; ratio: number }[] = [];

  for (const heir of heirs) {
    if (heir.isDeceased && heir.representatives && heir.representatives.length > 0) {
      const perRep = perOriginal / heir.representatives.length;
      for (let j = 0; j < heir.representatives.length; j++) {
        raw.push({ type: repType, ratio: perRep });
      }
    } else if (!heir.isDeceased) {
      raw.push({ type: baseType, ratio: perOriginal });
    }
  }

  // タイプ別にラベル生成
  const typeCounts: Partial<Record<HeirType, number>> = {};
  for (const s of raw) typeCounts[s.type] = (typeCounts[s.type] || 0) + 1;
  const typeIdx: Partial<Record<HeirType, number>> = {};

  return raw.map(s => {
    const count = typeCounts[s.type]!;
    const idx = typeIdx[s.type] || 0;
    typeIdx[s.type] = idx + 1;
    return { ...s, label: getHeirLabel(s.type, idx, count) };
  });
}

/**
 * 有効な相続人の情報を取得（基礎控除計算用および税額計算用）
 */
export function getHeirInfo(composition: HeirComposition): {
  rank: number;
  totalHeirsCount: number;
  rankHeirsCount: number;
} {
  let rank = 0;
  let rankHeirsCount = 0;

  switch (composition.selectedRank) {
    case 'rank1': {
      const count = countEffectiveHeirs(composition.rank1Children);
      if (count > 0) { rank = 1; rankHeirsCount = count; }
      break;
    }
    case 'rank2': {
      const count = composition.rank2Ascendants.length;
      if (count > 0) { rank = 2; rankHeirsCount = count; }
      break;
    }
    case 'rank3': {
      const count = countEffectiveHeirs(composition.rank3Siblings);
      if (count > 0) { rank = 3; rankHeirsCount = count; }
      break;
    }
  }

  const totalHeirsCount = (composition.hasSpouse ? 1 : 0) + rankHeirsCount;

  return { rank, totalHeirsCount, rankHeirsCount };
}

/**
 * 相続人ラベルを生成（例: "子1", "兄弟姉妹2"）
 */
const HEIR_TYPE_LABELS: Record<string, string> = {
  spouse: '配偶者',
  child: '子',
  grandchild: '孫',
  parent: '親',
  grandparent: '祖父母',
  sibling: '兄弟姉妹',
  nephew_niece: '甥姪',
};

export function getHeirLabel(type: string, index: number, count: number): string {
  const base = HEIR_TYPE_LABELS[type] || type;
  return count > 1 ? `${base}${index + 1}` : base;
}

/**
 * シナリオ名を生成（ファイル名用: "配偶者あり_子2人"）
 */
export function getScenarioName(composition: HeirComposition): string {
  const parts: string[] = [];
  if (composition.hasSpouse) parts.push('配偶者あり');

  const { rank, rankHeirsCount } = getHeirInfo(composition);
  if (rank > 0 && rankHeirsCount > 0) parts.push(`${RANK_LABELS[rank]}${rankHeirsCount}人`);

  return parts.join('_') || '相続人なし';
}

/**
 * 配偶者取得モードのラベルを生成
 */
export function getSpouseModeLabel(mode: SpouseAcquisitionMode): string {
  switch (mode.mode) {
    case 'legal': return '法定相続分';
    case 'limit160m': return '1億6,000万円';
    case 'custom': return `${mode.value.toLocaleString()}万円（カスタム）`;
  }
}

/**
 * 相続人構成から受取人選択肢リストを生成（保険契約用）
 */
export function getBeneficiaryOptions(composition: HeirComposition): BeneficiaryOption[] {
  const options: BeneficiaryOption[] = [];

  if (composition.hasSpouse) {
    options.push({ id: 'spouse', label: '配偶者' });
  }

  const addHeirs = (heirs: Heir[], baseType: string) => {
    const effective: { id: string; type: string }[] = [];
    for (const heir of heirs) {
      if (heir.isDeceased && heir.representatives) {
        for (const rep of heir.representatives) {
          effective.push({ id: rep.id, type: rep.type });
        }
      } else if (!heir.isDeceased) {
        effective.push({ id: heir.id, type: baseType });
      }
    }
    // タイプ別にカウントしてラベル生成
    const typeCounts: Record<string, number> = {};
    for (const e of effective) typeCounts[e.type] = (typeCounts[e.type] || 0) + 1;
    const typeIdx: Record<string, number> = {};
    for (const e of effective) {
      const count = typeCounts[e.type];
      const idx = typeIdx[e.type] || 0;
      typeIdx[e.type] = idx + 1;
      options.push({ id: e.id, label: getHeirLabel(e.type, idx, count) });
    }
  };

  switch (composition.selectedRank) {
    case 'rank1': addHeirs(composition.rank1Children, 'child'); break;
    case 'rank2': addHeirs(composition.rank2Ascendants, 'parent'); break;
    case 'rank3': addHeirs(composition.rank3Siblings, 'sibling'); break;
  }

  return options;
}
