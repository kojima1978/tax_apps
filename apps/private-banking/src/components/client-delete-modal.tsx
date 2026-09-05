"use client";

import { AlertTriangle, LoaderCircle, Trash2, X } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";

export function ClientDeleteModal({ household, snapshotCount, positionCount, error, saving, onClose, onSubmit }: {
  household: { name: string; clientCode: string };
  snapshotCount: number;
  positionCount: number;
  error: string;
  saving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [confirmation, setConfirmation] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    // 小さい画面でも警告文が飛ばされないよう、入力欄ではなく見出しへ移す。
    dialogRef.current?.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
    return () => { if (previousFocus?.isConnected) previousFocus.focus(); };
  }, []);
  const confirmationMatches = confirmation.toUpperCase() === household.clientCode.toUpperCase();

  return <div className="modal-layer" role="presentation" onKeyDown={(event) => {
    if (event.key === "Escape") { event.preventDefault(); if (!saving) onClose(); }
    if (event.key !== "Tab") return;
    const controls = dialogRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled)");
    if (!controls?.length) { event.preventDefault(); return; }
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement?.tagName === "H2")) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }}><div ref={dialogRef} className="modal delete-modal snapshot-delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="client-delete-title" aria-describedby="client-delete-description">
    <header><div><p className="eyebrow danger-eyebrow">DELETE CLIENT</p><h2 id="client-delete-title" tabIndex={-1}>{household.name}を削除しますか？</h2></div><button type="button" className="icon-button" aria-label="閉じる" onClick={onClose} disabled={saving}><X /></button></header>
    <form onSubmit={onSubmit}>
      <div className="snapshot-delete-warning"><AlertTriangle /><div><strong>この顧客のすべての年度・明細が削除されます</strong><p id="client-delete-description">この操作は取り消せません。必要な場合は、先にバックアップ画面からこの顧客のデータを書き出してください。</p></div></div>
      {error ? <p className="client-modal-error" role="alert"><AlertTriangle />{error}</p> : null}
      <dl className="snapshot-delete-summary"><div><dt>顧客コード</dt><dd>{household.clientCode}</dd></div><div><dt>登録年度</dt><dd>{snapshotCount}年度</dd></div><div><dt>登録明細</dt><dd>{positionCount}件</dd></div></dl>
      <label className="snapshot-delete-confirm">確認のため「{household.clientCode}」と入力してください<input name="confirmationClientCode" autoComplete="off" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} aria-describedby="client-delete-confirm-help" disabled={saving} /><small id="client-delete-confirm-help">入力した顧客コードが一致するまで削除ボタンは有効になりません。</small></label>
      <footer><button type="button" className="button secondary" onClick={onClose} disabled={saving}>キャンセル</button><button type="submit" className="button danger-button" disabled={saving || !confirmationMatches}>{saving ? <LoaderCircle className="spin" /> : <Trash2 />}顧客を削除</button></footer>
    </form>
  </div></div>;
}
