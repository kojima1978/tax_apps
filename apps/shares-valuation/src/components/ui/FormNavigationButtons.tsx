"use client";

import { Button } from "./Button";

interface FormNavigationButtonsProps {
  onBack: () => void;
  /** 戻るボタンのテキスト（デフォルト: "戻る"） */
  backLabel?: string;
  /** 次へボタンのテキスト（デフォルト: "次へ進む"） */
  nextLabel?: string;
  /** submit時に pending 表示するか */
  isPending?: boolean;
  /** pending中のテキスト */
  pendingLabel?: string;
  /** 次へボタンの className 追加分 */
  nextClassName?: string;
}

/** フォーム下部の 戻る / 次へ ボタンペア */
export function FormNavigationButtons({
  onBack,
  backLabel = "戻る",
  nextLabel = "次へ進む",
  isPending,
  pendingLabel,
  nextClassName,
}: FormNavigationButtonsProps) {
  return (
    <div className="flex gap-4 pt-4">
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="flex-1"
        onClick={onBack}
      >
        {backLabel}
      </Button>
      <Button
        type="submit"
        size="lg"
        className={`flex-[2] shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 ${nextClassName ?? ""}`}
        disabled={isPending}
      >
        {isPending ? pendingLabel ?? nextLabel : nextLabel}
      </Button>
    </div>
  );
}
