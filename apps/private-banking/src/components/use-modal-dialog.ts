"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { formSnapshot, hasUnsavedFormChanges } from "@/lib/form-snapshot";

/** モーダルの中でフォーカスを受け取れる要素。畳んだ `<details>` の中など見えていないものは呼び出し側で除く。 */
const focusableSelector = 'button:not(:disabled), [href], input:not([type="hidden"]):not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex]:not([tabindex="-1"])';

/** 入力を持たないモーダル（削除の確認・印刷の案内など）。Escape でそのまま閉じてよい。 */
type PlainOptions = { onEscape: () => void; initialFocus?: string };

/**
 * 入力を持つモーダル。閉じ方（Escape・×・キャンセル）を requestClose 1つに通し、
 * 変更があるときは「変更を保存せずに閉じますか？」を挟む。
 *
 * - busy: 保存中は閉じない
 * - isDirty: 変更の有無。省くと、ダイアログの中のフォームを開いたときの内容と比べる（lib/form-snapshot）。
 *   フォームを持たない・送る内容と入力が一致しない画面（まとめて入力の表・親族の編集）だけ渡す
 */
type GuardedOptions = { onClose: () => void; busy?: boolean; isDirty?: () => boolean; initialFocus?: string };

/** ModalCloseConfirm に渡す、閉じる前の確認の状態。 */
export type ModalCloseConfirmState = {
  open: boolean;
  keepEditing: () => void;
  discard: () => void;
};

/**
 * モーダルの共通の作法。開いたらダイアログの中へフォーカスを移し、Tab を中で巡回させ、
 * 閉じたら呼び出したボタンへフォーカスを戻す。入力を持つモーダルは、変更があるとき閉じる前に確かめる。
 *
 * 背景に inert を掛けていないので、巡回させないと Tab が背後の画面へ抜けていき、
 * キーボードだけでは入力欄へ戻れなくなる（明細モーダルは開いた直後のフォーカスが body のままだった）。
 *
 * 確認は以前、親族の編集だけが出し、まとめて入力は Escape だけ止め（×とキャンセルは素通り）、
 * 明細の追加・修正は何も出さずに閉じていた。閉じ方ごと・モーダルごとに違うと「ここは消えない」と
 * 覚えた操作が別の場所で入力を消すので、判定と確認をここ1か所に置く。
 */
export function useModalDialog<T extends HTMLElement>(options: PlainOptions | GuardedOptions) {
  const { initialFocus } = options;
  const guard = "onClose" in options ? options : null;
  const busy = guard?.busy ?? false;
  const dialogRef = useRef<T>(null);
  const initialSnapshot = useRef<string | null>(null);
  const focusBeforeConfirm = useRef<HTMLElement | null>(null);
  const [confirming, setConfirming] = useState(false);
  // 確認を出したまま Enter で保存を始めたら、確認は引っ込める（保存に失敗したあと確認だけが残らないように）。
  if (busy && confirming) setConfirming(false);

  // 開いた瞬間と閉じた瞬間の1回だけ。initialFocus は呼び出し側が固定の文字列で渡す。
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const target = initialFocus ? dialogRef.current?.querySelector<HTMLElement>(initialFocus) : null;
    (target ?? dialogRef.current)?.focus({ preventScroll: true });
    // 開いたときの入力の控え。子の初期化（useEffect）が済んだ後に取る。
    const form = dialogRef.current?.querySelector("form");
    if (form) initialSnapshot.current = formSnapshot(form);
    return () => { if (opener?.isConnected) opener.focus(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestClose = () => {
    if (!guard || busy) return;
    const dirty = guard.isDirty ? guard.isDirty() : hasUnsavedFormChanges(initialSnapshot.current, dialogRef.current?.querySelector("form") ?? null);
    if (!dirty) { guard.onClose(); return; }
    focusBeforeConfirm.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setConfirming(true);
  };

  const keepEditing = () => {
    setConfirming(false);
    // 確認を出す前にいた欄へ戻す。キャンセルのボタンのように確認と入れ替わって消えた要素なら、ダイアログへ。
    const target = focusBeforeConfirm.current;
    (target?.isConnected ? target : dialogRef.current)?.focus({ preventScroll: true });
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      if ("onEscape" in options) options.onEscape();
      // 確認が出ている間の Escape は「編集に戻る」。2回押して閉じてしまうことがないようにする。
      else if (confirming) keepEditing();
      else requestClose();
      return;
    }
    if (event.key !== "Tab") return;
    // 巡回の範囲はダイアログを包む層。ダイアログの外（同じ層）に出るトーストの「元に戻す」にも Tab で届くようにする。
    const scope = dialogRef.current?.closest<HTMLElement>(".modal-layer") ?? dialogRef.current;
    const controls = [...(scope?.querySelectorAll<HTMLElement>(focusableSelector) ?? [])].filter((element) => element.offsetParent !== null);
    if (controls.length === 0) { event.preventDefault(); return; }
    const first = controls[0];
    const last = controls[controls.length - 1];
    const active = document.activeElement;
    const inside = active instanceof HTMLElement && controls.includes(active);
    // ダイアログ自身（tabIndex=-1）や見出しにフォーカスがある状態で Shift+Tab を押したら、末尾から入り直す。
    if (event.shiftKey && (!inside || active === first)) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus(); }
  };

  const closeConfirm: ModalCloseConfirmState = { open: confirming && !busy, keepEditing, discard: () => guard?.onClose() };
  return { dialogRef, onKeyDown, requestClose, closeConfirm };
}
