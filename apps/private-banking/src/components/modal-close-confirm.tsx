"use client";

import { useEffect, useRef } from "react";
import type { ModalCloseConfirmState } from "@/components/use-modal-dialog";

/**
 * 「変更を保存せずに閉じますか？」の確認。モーダルのフッターで、いつものボタンの代わりに出す。
 * 文言とボタンの並びをモーダルごとに変えないよう、ここ1か所に置く（出す・消すは useModalDialog が決める）。
 *
 * 出た瞬間のフォーカスは「編集に戻る」へ移す。確認を出した Escape・Enter をもう一度押しても、
 * 入力が消える側（破棄）ではなく残る側に倒れるようにするため。
 */
export function ModalCloseConfirm({ confirm, message = "変更を保存せずに閉じますか？", discardLabel = "変更を破棄して閉じる" }: {
  confirm: Pick<ModalCloseConfirmState, "keepEditing" | "discard">;
  message?: string;
  discardLabel?: string;
}) {
  const keepEditingRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { keepEditingRef.current?.focus(); }, []);
  return <>
    <p className="modal-close-confirm-message" role="alert">{message}</p>
    <button type="button" className="button secondary" ref={keepEditingRef} onClick={confirm.keepEditing}>編集に戻る</button>
    <button type="button" className="button danger-button" onClick={confirm.discard}>{discardLabel}</button>
  </>;
}
