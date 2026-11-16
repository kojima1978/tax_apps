"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useModalDialog } from "@/components/use-modal-dialog";
import { inAppRoute, leavesPage } from "@/lib/leave-guard";

/**
 * モーダルではない入力画面（本人情報）で、保存していない変更を持ったまま離れようとしたら確かめる。
 *
 * - リンク（サイドバー・一覧に戻る・ほかのアプリ）: クリックを止めて LeaveConfirmModal を出す
 * - ブラウザを閉じる・再読み込み・URL の打ち直し: beforeunload（文言はブラウザが決める）
 *
 * ブラウザの「戻る」「進む」は、アプリの中の移動だとどちらの合図も来ないので止められない。
 *
 * isDirty は押した瞬間に呼ぶ（画面の表示用の state は入力の直後だと1拍遅れることがあるので、判定には使わない）。
 * 呼び出し側は useCallback で固定して渡す。
 */
export function useLeaveGuard(isDirty: () => boolean) {
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  // 「変更を破棄して移動」でページごと移るとき、beforeunload の確認を重ねて出さない。
  const leaving = useRef(false);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (leaving.current || !isDirty()) return;
      event.preventDefault();
      // 古いブラウザは returnValue を見る。
      event.returnValue = "";
    };
    const onClick = (event: MouseEvent) => {
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const click = {
        href: anchor.href, currentHref: window.location.href, target: anchor.target, download: anchor.hasAttribute("download"),
        button: event.button, modified: event.ctrlKey || event.shiftKey || event.altKey || event.metaKey,
      };
      if (!leavesPage(click) || !isDirty()) return;
      // 伝播は止めない（メニューを閉じるなどリンク自身の onClick は動かす）。next/link は defaultPrevented を見て移動をやめる。
      event.preventDefault();
      setPendingHref(anchor.href);
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    // React の onClick（next/link の移動）より先に受けるため、キャプチャで聞く。
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [isDirty]);

  const stay = () => setPendingHref(null);
  const leave = () => {
    if (pendingHref === null) return;
    const route = inAppRoute(pendingHref, window.location.href);
    setPendingHref(null);
    if (route !== null) { router.push(route); return; }
    leaving.current = true;
    window.location.assign(pendingHref);
  };

  return { confirming: pendingHref !== null, stay, leave };
}

/** 「保存していない変更があります」の確認。Escape・×は「編集に戻る」。 */
export function LeaveConfirmModal({ subject, onStay, onLeave }: { subject: string; onStay: () => void; onLeave: () => void }) {
  const { dialogRef, onKeyDown } = useModalDialog<HTMLDivElement>({ onEscape: onStay, initialFocus: ".button.secondary" });
  return <div className="modal-layer" role="presentation" onKeyDown={onKeyDown}><div ref={dialogRef} tabIndex={-1} className="modal delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="leave-confirm-title" aria-describedby="leave-confirm-description">
    <header><div><h2 id="leave-confirm-title">保存していない変更があります</h2></div><button type="button" className="icon-button" aria-label="閉じる" onClick={onStay}><X /></button></header>
    <div className="delete-modal-body">
      <p id="leave-confirm-description">{subject}の変更を保存せずに移動すると、入力した内容は失われます。</p>
      <footer><button type="button" className="button secondary" onClick={onStay}>編集に戻る</button><button type="button" className="button danger-button" onClick={onLeave}>変更を破棄して移動</button></footer>
    </div>
  </div></div>;
}
