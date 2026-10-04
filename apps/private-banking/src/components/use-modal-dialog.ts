"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";

/** モーダルの中でフォーカスを受け取れる要素。畳んだ `<details>` の中など見えていないものは呼び出し側で除く。 */
const focusableSelector = 'button:not(:disabled), [href], input:not([type="hidden"]):not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex]:not([tabindex="-1"])';

/**
 * モーダルの共通の作法。開いたらダイアログの中へフォーカスを移し、Tab を中で巡回させ、
 * 閉じたら呼び出したボタンへフォーカスを戻す。
 *
 * 背景に inert を掛けていないので、巡回させないと Tab が背後の画面へ抜けていき、
 * キーボードだけでは入力欄へ戻れなくなる（明細モーダルは開いた直後のフォーカスが body のままだった）。
 * Escape の扱いだけはモーダルごとに違う（保存中は閉じない・確認を挟む）ので呼び出し側に委ねる。
 */
export function useModalDialog<T extends HTMLElement>({ onEscape, initialFocus }: { onEscape: () => void; initialFocus?: string }) {
  const dialogRef = useRef<T>(null);
  // 開いた瞬間と閉じた瞬間の1回だけ。initialFocus は呼び出し側が固定の文字列で渡す。
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const target = initialFocus ? dialogRef.current?.querySelector<HTMLElement>(initialFocus) : null;
    (target ?? dialogRef.current)?.focus({ preventScroll: true });
    return () => { if (opener?.isConnected) opener.focus(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") { event.preventDefault(); onEscape(); return; }
    if (event.key !== "Tab") return;
    const controls = [...(dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [])].filter((element) => element.offsetParent !== null);
    if (controls.length === 0) { event.preventDefault(); return; }
    const first = controls[0];
    const last = controls[controls.length - 1];
    const active = document.activeElement;
    const inside = active instanceof HTMLElement && controls.includes(active);
    // ダイアログ自身（tabIndex=-1）や見出しにフォーカスがある状態で Shift+Tab を押したら、末尾から入り直す。
    if (event.shiftKey && (!inside || active === first)) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus(); }
  };

  return { dialogRef, onKeyDown };
}
