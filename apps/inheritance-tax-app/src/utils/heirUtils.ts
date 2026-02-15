import type { Heir, HeirComposition, SpouseAcquisitionMode } from '../types';
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
