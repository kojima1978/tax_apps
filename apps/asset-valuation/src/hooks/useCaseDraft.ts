import { useCallback, useEffect, useState } from 'react';
import type { Asset, StepId } from '@/types';

/** 作業中の案件を保存するキー（マッピングプリセットとは別枠） */
const DRAFT_KEY = 'asset-valuation:draft';

/** 保存する作業内容。復元すればステップまで含めて続きから再開できる */
export interface CaseDraft {
  caseName: string;
  taxDate: string;
  assets: Asset[];
  labelOrder: string[];
  currentStep: StepId;
  maxReachedStep: StepId;
  /** 保存時刻（ISO文字列） */
  savedAt: string;
}

/** 入力途中の状態。savedAt は保存時に付ける */
export type DraftInput = Omit<CaseDraft, 'savedAt'>;

function readDraft(): CaseDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as CaseDraft;
    // 資産が1件も無い下書きは復元しても意味がない
    return Array.isArray(draft?.assets) && draft.assets.length > 0 ? draft : null;
  } catch {
    return null;
  }
}

/**
 * 作業中の案件をlocalStorageへ自動保存し、次回起動時に復元できるようにする。
 *
 * 資産・案件名・課税時期・カテゴリ順・ステップはすべてメモリ上にしか無いため、
 * リロードやタブを閉じた時点で並べ替えごと消えてしまうのを防ぐ。
 */
export function useCaseDraft(current: DraftInput) {
  const { caseName, taxDate, assets, labelOrder, currentStep, maxReachedStep } = current;

  // 起動時点の下書き（復元バナー用）。以後の自動保存で書き換わらないよう固定する
  const [restorable, setRestorable] = useState<CaseDraft | null>(() => readDraft());
  const [savedAt, setSavedAt] = useState<string | null>(null);
  // 容量超過などで保存できていない状態。離脱警告を出す条件にもなる
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    // 空の状態で既存の下書きを潰さない（復元を選ぶ前にリロードしても残す）
    if (assets.length === 0) return;
    const timer = setTimeout(() => {
      const draft: CaseDraft = {
        caseName,
        taxDate,
        assets,
        labelOrder,
        currentStep,
        maxReachedStep,
        savedAt: new Date().toISOString(),
      };
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        setSavedAt(draft.savedAt);
        setSaveError(false);
      } catch {
        setSaveError(true);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [caseName, taxDate, assets, labelOrder, currentStep, maxReachedStep]);

  // 保存できていないときだけ離脱を警告する（保存できていれば復元できるので出さない）
  useEffect(() => {
    if (!saveError || assets.length === 0) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [saveError, assets.length]);

  /** 復元バナーを閉じる（下書き自体は残す） */
  const dismissRestore = useCallback(() => setRestorable(null), []);

  /** 下書きを破棄する */
  const discardDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // 消せなくても操作は続行できる
    }
    setRestorable(null);
    setSavedAt(null);
  }, []);

  return { restorable, savedAt, saveError, dismissRestore, discardDraft };
}
