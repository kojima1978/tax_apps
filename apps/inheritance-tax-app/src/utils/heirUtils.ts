import type { Heir, HeirComposition } from '../types';

/**
 * 有効な相続人数を計算（代襲相続を考慮）
 * - 存命の相続人: 1人としてカウント
 * - 死亡かつ代襲相続人あり: 代襲相続人の人数をカウント
 * - 死亡かつ代襲相続人なし: 0人
 */
export function countEffectiveHeirs(heirs: Heir[]): number {
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
