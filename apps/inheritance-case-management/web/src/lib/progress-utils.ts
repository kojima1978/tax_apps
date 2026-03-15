import type { ProgressStep } from '@/types/shared';

/** 進捗ステップ名定数（ProgressModal, analytics-utils で参照） */
export const STEP_NAMES = {
  FILING: '申告（済）',
  BILLING: '請求（済）',
  PAYMENT: '入金（済）',
} as const;

/** 新規案件の初期進捗ステップ */
export const DEFAULT_PROGRESS_STEPS: readonly ProgressStep[] = [
  { id: "step-1", name: "初回連絡", date: null },
  { id: "step-2", name: "初回面談", date: null },
  { id: "step-3", name: "2回目訪問", date: null },
  { id: "step-8", name: "最終チェック完了", date: null },
  { id: "step-4", name: "遺産分割（済）", date: null },
  { id: "step-5", name: STEP_NAMES.FILING, date: null },
  { id: "step-6", name: STEP_NAMES.BILLING, date: null },
  { id: "step-7", name: STEP_NAMES.PAYMENT, date: null },
] as const;

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
