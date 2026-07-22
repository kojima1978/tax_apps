"use client";

import { AlertTriangle, CircleCheck, Download, FileJson, LoaderCircle, Upload, X } from "lucide-react";
import Link from "next/link";
import { ChangeEvent, useState } from "react";
import { PanelHeader } from "@/components/panel-header";
import { API_BASE } from "@/lib/api";

export type BackupKind = "full" | "household";
type BackupPreview = { kind: BackupKind; exportedAt: string | null; subject: string; households: number; snapshots: number; positions: number };

function backupTimestamp(value: string | null) {
  if (!value) return "不明";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "不明" : parsed.toLocaleString("ja-JP", { dateStyle: "medium", timeStyle: "short" });
}

function readBackupPreview(payload: unknown): BackupPreview {
  if (payload === null || typeof payload !== "object") throw new Error("バックアップファイルとして読み込めませんでした。");
  const backup = payload as Record<string, unknown>;
  if (backup.schemaVersion !== 1) throw new Error("このアプリのバックアップファイルではありません。");
  const exportedAt = typeof backup.exportedAt === "string" ? backup.exportedAt : null;

  if (backup.kind === "full") {
    const data = backup.data as Record<string, unknown> | undefined;
    const households = data?.households, snapshots = data?.snapshots, positions = data?.positions;
    if (!Array.isArray(households) || !Array.isArray(snapshots) || !Array.isArray(positions)) throw new Error("全体バックアップの中身が壊れています。");
    return { kind: "full", exportedAt, subject: `${households.length}件の顧客（全体）`, households: households.length, snapshots: snapshots.length, positions: positions.length };
  }

  if (backup.kind === "household") {
    const household = backup.household as Record<string, unknown> | undefined;
    const snapshots = backup.snapshots;
    if (!household || !Array.isArray(snapshots)) throw new Error("顧客データファイルの中身が壊れています。");
    const positions = snapshots.reduce((total: number, snapshot) => {
      const rows = (snapshot as Record<string, unknown> | null)?.positions;
      return total + (Array.isArray(rows) ? rows.length : 0);
    }, 0);
    return { kind: "household", exportedAt, subject: `${household.name ?? "顧客"}（${household.clientCode ?? "コード不明"}）`, households: 1, snapshots: snapshots.length, positions };
  }

  throw new Error("バックアップの種類を判別できませんでした。");
}

/**
 * バックアップ画面。
 * scope="global" は顧客一覧配下（全体の書き出し・復元・顧客ファイルの取り込み）、
 * scope="household" は顧客ページ配下（その顧客だけの書き出し）で使う。
 */
export function BackupView({ scope, household, onRestored }: {
  scope: "global" | "household";
  household?: { id: number; name: string; clientCode: string };
  onRestored?: (kind: BackupKind, restoredHouseholdId?: number) => Promise<void> | void;
}) {
  const [selected, setSelected] = useState<{ fileName: string; payload: unknown; preview: BackupPreview } | null>(null);
  const [fileError, setFileError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState("");

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // 同じファイルを選び直したときも change が発火するようにクリアする。
    event.target.value = "";
    setCompleted("");
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text()) as unknown;
      setSelected({ fileName: file.name, payload, preview: readBackupPreview(payload) });
      setFileError("");
    } catch (error) {
      setSelected(null);
      setFileError(error instanceof SyntaxError ? "JSONファイルとして読み込めませんでした。" : error instanceof Error ? error.message : "ファイルを読み込めませんでした。");
    }
  }

  async function runRestore() {
    if (!selected) return;
    const { kind, households, snapshots, positions } = selected.preview;
    setBusy(true); setFileError("");
    try {
      const response = await fetch(`${API_BASE}/backup/${kind === "full" ? "restore" : "import"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selected.payload),
      });
      const result = await response.json().catch(() => null) as { error?: string; household?: { id: number; name: string }; renamedClientCode?: string | null } | null;
      if (!response.ok) throw new Error(result?.error ?? (kind === "full" ? "復元できませんでした。" : "取り込めませんでした。"));
      setConfirming(false);
      setSelected(null);
      setCompleted(kind === "full"
        ? `全データを復元しました（顧客${households}件・年度${snapshots}件・明細${positions}件）。`
        : `「${result?.household?.name ?? "顧客"}」を新規顧客として取り込みました。${result?.renamedClientCode ? `顧客コードが重複したため ${result.renamedClientCode} に変更しています。` : ""}`);
      await onRestored?.(kind, result?.household?.id);
    } catch (error) {
      setFileError(error instanceof Error ? error.message : "処理できませんでした。");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <section className="page-heading"><div><p className="eyebrow">BACKUP &amp; RESTORE</p><h2>バックアップ</h2><p>データをJSONファイルへ書き出し、必要なときに復元します。</p></div></section>
    <div className="backup-grid">
      <article className="panel">
        <PanelHeader title="書き出し" subtitle="JSONファイルとしてダウンロードします" />
        <div className="backup-body">
          {scope === "global" ? <div className="backup-option">
            <div><strong>全顧客をまとめて書き出す</strong><span>すべての顧客・年度・明細を1つのファイルに保存します。障害時の復旧用です。</span></div>
            <a className="button primary" href={`${API_BASE}/backup`} download><Download />全体を書き出す</a>
          </div> : null}
          {scope === "household" && household ? <div className="backup-option">
            <div><strong>この顧客だけ書き出す</strong><span>{household.name}（{household.clientCode}）の全年度を保存します。別の環境へ新規顧客として取り込めます。</span></div>
            <a className="button primary" href={`${API_BASE}/backup?householdId=${household.id}`} download><Download />顧客を書き出す</a>
          </div> : null}
        </div>
      </article>
      <article className="panel">
        <PanelHeader title="復元・取り込み" subtitle="書き出したJSONファイルを読み込みます" />
        <div className="backup-body">
          {scope === "household" ? <>
            <p className="backup-note" role="note"><AlertTriangle />復元・取り込みは顧客をまたぐ操作のため、顧客一覧の「バックアップ」から実行します。</p>
            <Link className="button secondary" href="/backup"><FileJson />バックアップ画面へ</Link>
          </> : <>
            <label className="backup-file-picker">
              <FileJson />
              <span><strong>バックアップファイルを選択</strong><small>全体／顧客単位の種類は自動で判定します</small></span>
              <input type="file" accept="application/json,.json" onChange={(event) => void selectFile(event)} />
            </label>
            {fileError ? <p className="backup-message error" role="alert"><AlertTriangle />{fileError}</p> : null}
            {completed ? <p className="backup-message success" role="status"><CircleCheck />{completed}</p> : null}
            {selected ? <div className="backup-preview">
              <dl>
                <div><dt>ファイル</dt><dd>{selected.fileName}</dd></div>
                <div><dt>種類</dt><dd>{selected.preview.kind === "full" ? "全体バックアップ（置き換え）" : "顧客単位（追加）"}</dd></div>
                <div><dt>作成日時</dt><dd>{backupTimestamp(selected.preview.exportedAt)}</dd></div>
                <div><dt>対象</dt><dd>{selected.preview.subject}</dd></div>
                <div><dt>内容</dt><dd>顧客{selected.preview.households}件 / 年度{selected.preview.snapshots}件 / 明細{selected.preview.positions}件</dd></div>
              </dl>
              <div className="backup-preview-actions">
                <button type="button" className="button secondary" onClick={() => setSelected(null)}>選び直す</button>
                <button type="button" className={`button ${selected.preview.kind === "full" ? "danger-button" : "primary"}`} onClick={() => setConfirming(true)}><Upload />{selected.preview.kind === "full" ? "全データを置き換える" : "新規顧客として取り込む"}</button>
              </div>
            </div> : null}
            <p className="backup-note" role="note"><AlertTriangle />全体バックアップの復元は<strong>現在のすべての顧客データを削除して置き換えます</strong>。実行前に現在のデータを書き出しておいてください。</p>
          </>}
        </div>
      </article>
    </div>
    {confirming && selected ? <BackupConfirmModal preview={selected.preview} fileName={selected.fileName} busy={busy} error={fileError} onClose={() => setConfirming(false)} onConfirm={() => void runRestore()} /> : null}
  </>;
}

function BackupConfirmModal({ preview, fileName, busy, error, onClose, onConfirm }: {
  preview: BackupPreview;
  fileName: string;
  busy: boolean;
  error: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const isFull = preview.kind === "full";
  return <div className="modal-layer" role="presentation"><div className="modal delete-modal" role="dialog" aria-modal="true" aria-labelledby="backup-confirm-title">
    <header><div><p className={`eyebrow ${isFull ? "danger-eyebrow" : ""}`}>{isFull ? "RESTORE ALL" : "IMPORT CLIENT"}</p><h2 id="backup-confirm-title">{isFull ? "全データを置き換えますか？" : "新規顧客として取り込みますか？"}</h2></div><button type="button" className="icon-button" aria-label="閉じる" onClick={onClose} disabled={busy}><X /></button></header>
    <div className="delete-modal-body">
      <p>{isFull
        ? "現在登録されているすべての顧客・年度・明細を削除し、選択したファイルの内容へ置き換えます。この操作は取り消せません。"
        : "選択したファイルの顧客を新しい顧客として追加します。既存の顧客データは変更されません。"}</p>
      <dl>
        <div><dt>ファイル</dt><dd>{fileName}</dd></div>
        <div><dt>対象</dt><dd>{preview.subject}</dd></div>
        <div><dt>内容</dt><dd>顧客{preview.households}件 / 年度{preview.snapshots}件 / 明細{preview.positions}件</dd></div>
      </dl>
      {isFull ? <p className="backup-message warning" role="note"><AlertTriangle />先に<a href={`${API_BASE}/backup`} download>現在のデータを書き出す</a>ことをおすすめします。</p> : null}
      {error ? <p className="backup-message error" role="alert"><AlertTriangle />{error}</p> : null}
      <footer>
        <button type="button" className="button secondary" onClick={onClose} disabled={busy}>キャンセル</button>
        <button type="button" className={`button ${isFull ? "danger-button" : "primary"}`} onClick={onConfirm} disabled={busy}>{busy ? <LoaderCircle className="spin" /> : <Upload />}{isFull ? "置き換えを実行" : "取り込む"}</button>
      </footer>
    </div>
  </div></div>;
}
