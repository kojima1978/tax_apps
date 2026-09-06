import { useCallback, useEffect, useState } from 'react';
import { focusAndFlash } from '@/lib/focusField';

type RequiredField = HTMLElement;

/** 入力欄以外（クリックで選ぶセルなど）は data-value に現在値を持たせている */
function fieldValue(el: RequiredField): string {
  if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) return el.value;
  return el.dataset.value ?? '';
}

/** 表示中の表にある「計算に必須の入力欄」（薄い水色＝aria-required）を拾う */
function requiredFields(): RequiredField[] {
  const seen = new Set<string>();
  return [...document.querySelectorAll<RequiredField>('.app-main [aria-required="true"]')].filter((el) => {
    if (el instanceof HTMLInputElement && (el.disabled || el.readOnly)) return false;
    if (el instanceof HTMLSelectElement && el.disabled) return false;
    // 同じ項目が複数のセルに出ることがある（業種区分など）ので1件にまとめる
    const key = el.getAttribute('name') ?? el.dataset.field;
    if (key === undefined || key === null) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const isEmpty = (el: RequiredField) => fieldValue(el).trim() === '';

interface RequiredFieldNavigatorProps {
  /** 再集計のきっかけ（表の切替・入力値の変化） */
  watch: unknown;
}

/**
 * 必須入力欄の未入力件数を出し、押すたびに次の未入力欄へ移動する。
 * 欄の位置は表ごとに異なるため、DOM（aria-required）から拾って様式定義とは二重管理にしない。
 */
export function RequiredFieldNavigator({ watch }: RequiredFieldNavigatorProps) {
  const [state, setState] = useState<{ total: number; empty: number }>({ total: 0, empty: 0 });

  useEffect(() => {
    // 表の描画が終わってから数える。requestAnimationFrame は非表示タブで止まるので使わない
    const count = () => {
      const fields = requiredFields();
      setState((prev) => {
        const next = { total: fields.length, empty: fields.filter(isEmpty).length };
        return prev.total === next.total && prev.empty === next.empty ? prev : next;
      });
    };
    count();
    const id = window.setTimeout(count, 0);
    return () => window.clearTimeout(id);
  }, [watch]);

  const goNext = useCallback(() => {
    const empties = requiredFields().filter(isEmpty);
    if (empties.length === 0) return;
    const active = document.activeElement;
    // いま見ている欄より後ろの未入力欄へ。無ければ先頭へ戻る
    const next = empties.find((el) => active instanceof HTMLElement && el !== active
      ? (active.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
      : false) ?? empties[0]!;
    focusAndFlash(next);
  }, []);

  if (state.total === 0) return null;

  return state.empty === 0 ? (
    <span className="app-required-done">必須入力 完了</span>
  ) : (
    <button
      type="button"
      className="app-tool-btn app-tool-btn-required"
      onClick={goNext}
      title="計算に必須の入力欄（薄い水色）のうち、まだ空欄のものへ移動します"
    >
      必須未入力 {state.empty}件 ▸次へ
    </button>
  );
}
