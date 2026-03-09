import type { ProgressStep } from '@/types/shared';

/**
 * 訪問ステップを追加し、新しい配列を返す
 */
export function addVisitStep(steps: ProgressStep[], afterIndex: number): ProgressStep[] {
  const newSteps = [...steps];
  let visitCount = 2;
  newSteps.forEach((p) => {
    const match = p.name.match(/(\d+)回目訪問/);
    if (match) {
      const num = parseInt(match[1]);
      if (num > visitCount) visitCount = num;
    }
  });

  const newStep: ProgressStep = {
    id: `step-visit-${Date.now()}`,
    name: `${visitCount + 1}回目訪問`,
    date: null,
    isDynamic: true,
  };

  newSteps.splice(afterIndex + 1, 0, newStep);
  return newSteps;
}

/**
 * 訪問ステップを削除し、残りの訪問を再番号付けした新しい配列を返す
 */
export function removeVisitStep(steps: ProgressStep[], index: number): ProgressStep[] {
  const newSteps = [...steps];
  newSteps.splice(index, 1);

  let visitIndex = 0;
  newSteps.forEach((p) => {
    if (p.name.includes('回目訪問')) {
      visitIndex++;
      p.name = `${visitIndex + 1}回目訪問`;
    }
  });

  return newSteps;
}

/**
 * 「訪問追加」ボタンを表示すべきかを判定
 */
export function shouldShowAddVisit(steps: ProgressStep[], step: ProgressStep, index: number): boolean {
  if (!step.name.includes('回目訪問')) return false;
  const nextStep = steps[index + 1];
  return !!nextStep && !nextStep.name.includes('回目訪問');
}
