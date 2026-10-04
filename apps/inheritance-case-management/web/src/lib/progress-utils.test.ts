import { describe, expect, it } from 'vitest';
import type { ProgressStep } from '@/types/shared';
import {
  DEFAULT_PROGRESS_STEPS,
  addVisitStep,
  removeVisitStep,
  shouldShowAddVisit,
} from './progress-utils';

const steps = (): ProgressStep[] => DEFAULT_PROGRESS_STEPS.map((s) => ({ ...s }));
const names = (list: ProgressStep[]) => list.map((s) => s.name);

describe('訪問ステップの追加', () => {
  it('いまある最大の回数の次を、指定位置の直後に入れる', () => {
    // 既定は 初回連絡 / 初回面談 / 2回目訪問 / 遺産分割協議完了
    const added = addVisitStep(steps(), 2);
    expect(names(added)).toEqual(['初回連絡', '初回面談', '2回目訪問', '3回目訪問', '遺産分割協議完了']);
    expect(added[3].isDynamic).toBe(true);
    expect(added[3].date).toBeNull();
  });

  it('続けて足すと番号が増えていく', () => {
    const twice = addVisitStep(addVisitStep(steps(), 2), 3);
    expect(names(twice)).toEqual([
      '初回連絡', '初回面談', '2回目訪問', '3回目訪問', '4回目訪問', '遺産分割協議完了',
    ]);
  });

  it('元の配列は書き換えない', () => {
    const original = steps();
    addVisitStep(original, 2);
    expect(names(original)).toEqual(['初回連絡', '初回面談', '2回目訪問', '遺産分割協議完了']);
  });
});

describe('訪問ステップの削除', () => {
  it('消したあと残りの訪問を2回目から振り直す', () => {
    const list = addVisitStep(addVisitStep(steps(), 2), 3); // 2/3/4回目訪問
    const removed = removeVisitStep(list, 3); // 3回目訪問を消す
    expect(names(removed)).toEqual(['初回連絡', '初回面談', '2回目訪問', '3回目訪問', '遺産分割協議完了']);
  });

  it('先頭の訪問を消しても残りは2回目から始まる', () => {
    const list = addVisitStep(steps(), 2);
    const removed = removeVisitStep(list, 2);
    expect(names(removed)).toEqual(['初回連絡', '初回面談', '2回目訪問', '遺産分割協議完了']);
  });
});

describe('「訪問追加」ボタンの表示', () => {
  it('訪問の並びの最後の1つにだけ出す', () => {
    const list = addVisitStep(steps(), 2); // 初回連絡/初回面談/2回目訪問/3回目訪問/遺産分割協議完了
    expect(shouldShowAddVisit(list, list[2], 2)).toBe(false); // 2回目（次も訪問）
    expect(shouldShowAddVisit(list, list[3], 3)).toBe(true);  // 3回目（次は協議完了）
  });

  it('訪問以外のステップには出さない', () => {
    const list = steps();
    expect(shouldShowAddVisit(list, list[0], 0)).toBe(false);
    expect(shouldShowAddVisit(list, list[3], 3)).toBe(false);
  });

  it('訪問が最後尾のときは出さない（次のステップが無いため）', () => {
    const list: ProgressStep[] = [{ id: 'a', name: '初回連絡', date: null }, { id: 'b', name: '2回目訪問', date: null }];
    expect(shouldShowAddVisit(list, list[1], 1)).toBe(false);
  });
});
