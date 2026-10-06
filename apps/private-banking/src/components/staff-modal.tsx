"use client";

import { AlertTriangle, LoaderCircle, Plus, Trash2, UserCog, X } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useModalDialog } from "@/components/use-modal-dialog";
import { API_BASE } from "@/lib/api";
import type { Staff } from "@/lib/staff";

async function requestStaff<T>(method: string, body: unknown, fallback: string): Promise<T> {
  const response = await fetch(`${API_BASE}/staff`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => null) as (T & { error?: string }) | null;
  if (!response.ok || !result) throw new Error(result?.error ?? fallback);
  return result;
}

/**
 * 担当者の台帳。顧客一覧の「担当者」から開く。
 *
 * 削除できるのは担当している顧客が0件のときだけ（API 側で拒む）。担当がいる人を候補から
 * 外したいときは「退職」にする ── 選択欄から消えるだけで、その顧客の「担当 ○○」は残る。
 */
export function StaffModal({ onClose }: { onClose: (changed: boolean) => void }) {
  const [staff, setStaff] = useState<Staff[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [changed, setChanged] = useState(false);
  const { dialogRef, onKeyDown } = useModalDialog<HTMLDivElement>({ onEscape: () => { if (!busy) onClose(changed); }, initialFocus: "#staff-new-name" });

  const load = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/staff`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      setStaff(await response.json() as Staff[]);
    } catch {
      setStaff([]);
      setError("担当者の一覧を読み込めませんでした。");
    }
  }, []);

  // 初回の取得だけ。以降は操作のたびに取り直す（担当件数も同時に更新されるため）。
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  /** 操作の共通部分。成功したら一覧を取り直し、顧客一覧に伝える変更ありの印を立てる。 */
  async function run(action: () => Promise<string>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const message = await action();
      await load();
      setChanged(true);
      setNotice(message);
      setConfirmingId(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "担当者を更新できませんでした。");
    } finally {
      setBusy(false);
    }
  }

  function addStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form).entries()) as { name: string; nameKana: string };
    if (fields.name.trim() === "") return;
    void run(async () => {
      const created = await requestStaff<Staff>("POST", fields, "担当者を登録できませんでした。");
      form.reset();
      form.querySelector<HTMLInputElement>("#staff-new-name")?.focus();
      return `${created.name}を登録しました。`;
    });
  }

  return <div className="modal-layer" role="presentation" onKeyDown={onKeyDown}><div ref={dialogRef} className="modal staff-modal" role="dialog" aria-modal="true" aria-labelledby="staff-modal-title">
    <header>
      <div>
        <h2 id="staff-modal-title">担当者</h2>
        <p>ここに登録した担当者だけが、顧客の担当者として選べます。</p>
      </div>
      <button type="button" className="icon-button" aria-label="閉じる" onClick={() => onClose(changed)} disabled={busy}><X /></button>
    </header>
    <div className="staff-modal-body">
      {error ? <p className="client-modal-error" role="alert"><AlertTriangle />{error}</p> : null}
      {notice ? <p className="staff-modal-notice" role="status">{notice}</p> : null}

      <form className="staff-new-form" onSubmit={addStaff}>
        <div>
          <label htmlFor="staff-new-name">担当者名<span className="required-mark">必須</span></label>
          <input id="staff-new-name" name="name" required maxLength={100} autoComplete="off" placeholder="例：佐藤税理士" disabled={busy} />
        </div>
        <div>
          <label htmlFor="staff-new-kana">カナ</label>
          <input id="staff-new-kana" name="nameKana" maxLength={100} autoComplete="off" placeholder="例：サトウ" disabled={busy} />
        </div>
        <button type="submit" className="button primary" disabled={busy}>{busy ? <LoaderCircle className="spin" /> : <Plus />}追加</button>
      </form>

      {staff === null
        ? <p className="staff-modal-loading"><LoaderCircle className="spin" />読み込んでいます</p>
        : staff.length === 0
          ? <p className="staff-modal-empty"><UserCog />担当者がまだ登録されていません。</p>
          : <ul className="staff-list">
              {staff.map((row) => <StaffRow
                // 保存でサーバー側の値が変わったら行を作り直す（入力中の下書きを残さない）。
                key={`${row.id}:${row.name}:${row.nameKana}`}
                row={row}
                busy={busy}
                confirming={confirmingId === row.id}
                onSave={(name, nameKana) => void run(async () => {
                  const saved = await requestStaff<Staff>("PATCH", { id: row.id, name, nameKana, isActive: row.isActive }, "担当者を更新できませんでした。");
                  return `${saved.name}を保存しました。`;
                })}
                onToggleActive={() => void run(async () => {
                  await requestStaff<Staff>("PATCH", { id: row.id, name: row.name, nameKana: row.nameKana, isActive: !row.isActive }, "担当者を更新できませんでした。");
                  return row.isActive ? `${row.name}を退職にしました。以降は候補に出ません。` : `${row.name}を在籍に戻しました。`;
                })}
                onRequestDelete={() => { setError(""); setNotice(""); setConfirmingId(row.id); }}
                onCancelDelete={() => setConfirmingId(null)}
                onDelete={() => void run(async () => {
                  await requestStaff<{ ok: true }>("DELETE", { id: row.id }, "担当者を削除できませんでした。");
                  return `${row.name}を削除しました。`;
                })}
              />)}
            </ul>}
    </div>
    <footer><button type="button" className="button secondary" onClick={() => onClose(changed)} disabled={busy}>閉じる</button></footer>
  </div></div>;
}

function StaffRow({ row, busy, confirming, onSave, onToggleActive, onRequestDelete, onCancelDelete, onDelete }: {
  row: Staff;
  busy: boolean;
  confirming: boolean;
  onSave: (name: string, nameKana: string) => void;
  onToggleActive: () => void;
  onRequestDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(row.name);
  const [nameKana, setNameKana] = useState(row.nameKana);
  const dirty = name.trim() !== row.name || nameKana.trim() !== row.nameKana;

  return <li className={`staff-row${row.isActive ? "" : " is-retired"}`}>
    <div className="staff-row-fields">
      <label className="sr-only" htmlFor={`staff-name-${row.id}`}>{row.name}の担当者名</label>
      <input id={`staff-name-${row.id}`} value={name} maxLength={100} autoComplete="off" onChange={(event) => setName(event.target.value)} disabled={busy} />
      <label className="sr-only" htmlFor={`staff-kana-${row.id}`}>{row.name}のカナ</label>
      <input id={`staff-kana-${row.id}`} value={nameKana} maxLength={100} autoComplete="off" placeholder="カナ" onChange={(event) => setNameKana(event.target.value)} disabled={busy} />
    </div>
    <span className="staff-row-meta">
      {row.isActive ? null : <span className="staff-retired-tag">退職</span>}
      {row.clientCount === 0 ? "担当なし" : `担当 ${row.clientCount}件`}
    </span>
    {confirming
      ? <div className="staff-row-actions">
          {/* 消せるのは担当が0件の人だけ（1件でもあれば API が拒む）なので、確認はこの1段で足りる。 */}
          <span className="staff-row-confirm">削除しますか？</span>
          <button type="button" className="button danger-button" onClick={onDelete} disabled={busy}><Trash2 />削除する</button>
          <button type="button" className="text-button" onClick={onCancelDelete} disabled={busy}>やめる</button>
        </div>
      : <div className="staff-row-actions">
          {dirty ? <button type="button" className="button secondary" onClick={() => onSave(name.trim(), nameKana.trim())} disabled={busy || name.trim() === ""}>保存</button> : null}
          <button type="button" className="text-button" onClick={onToggleActive} disabled={busy}>{row.isActive ? "退職にする" : "在籍に戻す"}</button>
          <button type="button" className="text-button danger-text-button" onClick={onRequestDelete} disabled={busy}><Trash2 />削除</button>
        </div>}
  </li>;
}
