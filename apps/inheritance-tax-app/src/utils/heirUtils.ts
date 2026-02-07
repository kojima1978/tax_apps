import type { Heir } from '../types';

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
