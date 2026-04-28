import type { ProgressStep, CaseStatus } from '@/types/shared';

/** 進捗ステップ名定数（ProgressModal, analytics-utils, edit-case-form で参照） */
export const STEP_NAMES = {
  FILING: '税務申告完了',
  BILLING: '請求書発送完了',
  PAYMENT: '入金確認完了',
} as const;

/** ステータスと進捗ステップの対応マッピング（整合性チェック・自動変更提案で使用） */
export const STATUS_STEP_MAP: { status: CaseStatus; stepName: string }[] = [
  { status: '申告済', stepName: STEP_NAMES.FILING },
  { status: '請求済', stepName: STEP_NAMES.BILLING },
  { status: '入金済', stepName: STEP_NAMES.PAYMENT },
];

/** ステータスの進行順（整合性チェックで使用） */
export const STATUS_ORDER: readonly CaseStatus[] = ['未着手', '手続中', '申告済', '請求済', '入金済'] as const;

/** 新規案件の初期進捗ステップ */
export const DEFAULT_PROGRESS_STEPS: readonly ProgressStep[] = [
  { id: "step-1", name: "初回連絡", date: null },
  { id: "step-2", name: "初回面談", date: null },
  { id: "step-3", name: "2回目訪問", date: null },
  { id: "step-8", name: "最終チェック完了", date: null },
  { id: "step-4", name: "遺産分割協議完了", date: null },
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

/** ステータスと進捗ステップの整合性チェック */
export function checkStatusProgressConsistency(
  status: CaseStatus,
  progress: ProgressStep[],
): { warnings: string[]; suggestion?: { status: CaseStatus; message: string } } {
  const warnings: string[] = [];

  for (const { status: expectedStatus, stepName } of STATUS_STEP_MAP) {
    const step = progress.find(s => s.name === stepName);
    if (status === expectedStatus && !step?.date) {
      warnings.push(`進み具合が「${expectedStatus}」ですが、進捗の「${stepName}」に日付が入力されていません。`);
    }
  }

  const currentIdx = STATUS_ORDER.indexOf(status);
  if (currentIdx >= 0) {
    for (let i = STATUS_STEP_MAP.length - 1; i >= 0; i--) {
      const { status: suggestedStatus, stepName } = STATUS_STEP_MAP[i];
      const suggestedIdx = STATUS_ORDER.indexOf(suggestedStatus);
      const step = progress.find(s => s.name === stepName);
      if (step?.date && suggestedIdx > currentIdx) {
        return {
          warnings,
          suggestion: {
            status: suggestedStatus,
            message: `進捗の「${stepName}」に日付が入力されています。\n進み具合を「${suggestedStatus}」に変更しますか？`,
          },
        };
      }
    }
  }

  return { warnings };
}
