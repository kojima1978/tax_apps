"use client";

import { AlertTriangle, CircleCheck, Download, FileJson, LoaderCircle, Upload, X } from "lucide-react";
import Link from "next/link";
import { ChangeEvent, DragEvent, useCallback, useEffect, useState } from "react";
import { PanelHeader } from "@/components/panel-header";
import { API_BASE } from "@/lib/api";
import { ClientSummary } from "@/lib/clients";
import type { Portfolio } from "@/lib/portfolio-view";

export type BackupKind = "full" | "household";
type BackupPreview = { kind: BackupKind; exportedAt: string | null; subject: string; households: number; snapshots: number; positions: number };
type SelectedFile = { fileName: string; payload: unknown; preview: BackupPreview };

/** 復元欄は「全体」「個別」で同じ部品を使い、文言だけ差し替える。 */
const RESTORE_TEXT = {
  full: {
    pickerTitle: "全体バックアップファイルを選択",
    pickerHint: "すべての顧客を置き換えて復元します",
    action: "全データを置き換える",
    mismatch: "これは顧客単位のファイルです。「個別書き出し・復元」から取り込んでください。",
    failure: "復元できませんでした。",
  },
  household: {
    pickerTitle: "顧客ファイルを選択",
    pickerHint: "既存の顧客を消さずに1件追加します",
    action: "新規顧客として取り込む",
    mismatch: "これは全体バックアップファイルです。「全体書き出し・復元」から復元してください。",
    failure: "取り込めませんでした。",
  },
} as const;

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
 * scope="global" は顧客一覧配下（全体書き出し・復元／個別書き出し・復元）、
 * scope="household" は顧客ページ配下（その顧客だけの書き出し）で使う。
 */
export function BackupView(props: { scope: "global" } | { scope: "household"; portfolio: Portfolio }) {
  return props.scope === "global" ? <GlobalBackup /> : <HouseholdBackup portfolio={props.portfolio} />;
}

/** サーバ側（api/backup）と同じ規則でファイル名を組み立てる。 */
function exportFileName(clientCode: string) {
  const jst = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString();
  return `private-banking-${clientCode}-${jst.slice(0, 4)}${jst.slice(5, 7)}${jst.slice(8, 10)}-${jst.slice(11, 13)}${jst.slice(14, 16)}.json`;
}

/** 顧客ページ配下。この顧客ぶんの書き出しだけを扱う。 */
function HouseholdBackup({ portfolio: { household, snapshots, familyMembers } }: { portfolio: Portfolio }) {
  const [exported, setExported] = useState("");
  const years = snapshots.map((snapshot) => snapshot.fiscalYear);
  const summary = [
    { label: "顧客", value: `${household.name}（${household.clientCode}）` },
    { label: "年度", value: years.length === 0 ? "なし" : `${years.length}件（${Math.min(...years) === Math.max(...years) ? `${years[0]}年度` : `${Math.min(...years)}〜${Math.max(...years)}年度`}）` },
    { label: "明細", value: `${snapshots.reduce((total, snapshot) => total + snapshot.positions.length, 0)}件` },
    { label: "親族関係", value: `${familyMembers.length}件` },
    { label: "ファイル名", value: `private-banking-${household.clientCode}-<日時>.json` },
  ];

  return <>
    <BackupHeading eyebrow="BACKUP" description="この顧客のデータをJSONファイルへ書き出します。" />
    <article className="panel backup-single">
      <PanelHeader title="この顧客のバックアップ" subtitle="別の環境へ移すとき・作業前に退避するときに使います" />
      <div className="backup-body">
        <dl className="backup-summary">
          {summary.map(({ label, value }) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
        </dl>
        <div className="backup-preview-actions">
          <a
            className="button primary"
            href={`${API_BASE}/backup?householdId=${household.id}`}
            download
            onClick={() => setExported(exportFileName(household.clientCode))}
          ><Download />顧客を書き出す</a>
        </div>
        {exported ? <p className="backup-message success" role="status"><CircleCheck />書き出しました（{exported}）。</p> : null}
        <p className="backup-note" role="note"><AlertTriangle />取り込むと<strong>常に新規顧客として追加</strong>されます。このファイルでこの顧客を上書きすることはできません。</p>
        <p className="backup-inline-link"><Link href="/backup"><FileJson />復元・取り込みはバックアップ画面から</Link></p>
      </div>
    </article>
  </>;
}

/** 顧客一覧配下。全顧客ぶんと顧客1件ぶんの両方を扱う。 */
function GlobalBackup() {
  const [clients, setClients] = useState<ClientSummary[] | null>(null);
  const [exportTargetId, setExportTargetId] = useState("");

  const loadClients = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/clients`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      const list = await response.json() as ClientSummary[];
      setClients(list);
      // 復元後に顧客が入れ替わることがあるため、選択が消えていたら先頭へ戻す。
      setExportTargetId((current) => list.some((client) => String(client.id) === current) ? current : String(list[0]?.id ?? ""));
    } catch {
      setClients([]);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadClients(); }, [loadClients]);

  return <>
    <BackupHeading eyebrow="BACKUP & RESTORE" description="データをJSONファイルへ書き出し、必要なときに復元します。" />
    {/* よく使う個別を上、めったに使わない全体を下に置く。 */}
    <div className="backup-grid backup-grid-stacked">
      <article className="panel">
        <PanelHeader title="個別書き出し・復元" subtitle="顧客を1件ずつ扱います" />
        <div className="backup-body">
          <div className="backup-option">
            <div>
              <strong>顧客を選んで書き出す</strong>
              <span>選んだ顧客の全年度・明細・親族関係を1件ぶんのファイルに保存します。</span>
              {clients && clients.length > 0 ? <select
                className="backup-client-select"
                aria-label="書き出す顧客"
                value={exportTargetId}
                onChange={(event) => setExportTargetId(event.target.value)}
              >
                {clients.map((client) => <option key={client.id} value={client.id}>{client.name}（{client.clientCode}）</option>)}
              </select> : null}
            </div>
            {clients === null
              ? <span className="backup-option-status">顧客を読み込んでいます…</span>
              : clients.length === 0
                ? <span className="backup-option-status">登録されている顧客がありません。</span>
                : <a className="button primary" href={`${API_BASE}/backup?householdId=${exportTargetId}`} download><Download />顧客を書き出す</a>}
          </div>
          <RestoreSlot expected="household" onCompleted={loadClients} />
        </div>
      </article>
      <article className="panel">
        <PanelHeader title="全体書き出し・復元" subtitle="すべての顧客をまとめて扱います" />
        <div className="backup-body">
          <div className="backup-option">
            <div><strong>全顧客をまとめて書き出す</strong><span>すべての顧客・年度・明細を1つのファイルに保存します。障害時の復旧用です。</span></div>
            <a className="button primary" href={`${API_BASE}/backup`} download><Download />全体を書き出す</a>
          </div>
          <RestoreSlot expected="full" onCompleted={loadClients} />
          <p className="backup-note" role="note"><AlertTriangle />全体バックアップの復元は<strong>現在のすべての顧客データを削除して置き換えます</strong>。実行前に現在のデータを書き出しておいてください。</p>
        </div>
      </article>
    </div>
  </>;
}

function BackupHeading({ eyebrow, description }: { eyebrow: string; description: string }) {
  return <section className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h2>バックアップ</h2><p>{description}</p></div></section>;
}

/** ファイル選択→内容の確認→復元（または取り込み）までの一連の操作。 */
function RestoreSlot({ expected, onCompleted }: { expected: BackupKind; onCompleted: () => Promise<void> | void }) {
  const [selected, setSelected] = useState<SelectedFile | null>(null);
  const [fileError, setFileError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState("");
  const [dragging, setDragging] = useState(false);
  const text = RESTORE_TEXT[expected];

  /** 選択・ドロップの両方から呼ぶ読み込み処理。 */
  async function readFile(file: File | undefined) {
    setCompleted("");
    if (!file) return;
    try {
      if (!/\.json$/i.test(file.name)) throw new Error("JSONファイルを選んでください。");
      const payload = JSON.parse(await file.text()) as unknown;
      const preview = readBackupPreview(payload);
      // 種類ちがいのファイルはもう一方の欄へ案内する（誤って全体を置き換えないため）。
      if (preview.kind !== expected) throw new Error(text.mismatch);
      setSelected({ fileName: file.name, payload, preview });
      setFileError("");
    } catch (error) {
      setSelected(null);
      setFileError(error instanceof SyntaxError ? "JSONファイルとして読み込めませんでした。" : error instanceof Error ? error.message : "ファイルを読み込めませんでした。");
    }
  }

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // 同じファイルを選び直したときも change が発火するようにクリアする。
    event.target.value = "";
    void readFile(file);
  }

  function dropFile(event: DragEvent<HTMLLabelElement>) {
    // 既定の動作（ブラウザがファイルを開く）を止めてから受け取る。
    event.preventDefault();
    setDragging(false);
    void readFile(event.dataTransfer.files[0]);
  }

  async function runRestore() {
    if (!selected) return;
    const { households, snapshots, positions } = selected.preview;
    setBusy(true); setFileError("");
    try {
      const response = await fetch(`${API_BASE}/backup/${expected === "full" ? "restore" : "import"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selected.payload),
      });
      const result = await response.json().catch(() => null) as { error?: string; household?: { id: number; name: string }; renamedClientCode?: string | null } | null;
      if (!response.ok) throw new Error(result?.error ?? text.failure);
      setConfirming(false);
      setSelected(null);
      setCompleted(expected === "full"
        ? `全データを復元しました（顧客${households}件・年度${snapshots}件・明細${positions}件）。`
        : `「${result?.household?.name ?? "顧客"}」を新規顧客として取り込みました。${result?.renamedClientCode ? `顧客コードが重複したため ${result.renamedClientCode} に変更しています。` : ""}`);
      await onCompleted();
    } catch (error) {
      setFileError(error instanceof Error ? error.message : "処理できませんでした。");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <label
      className={`backup-file-picker ${dragging ? "dragging" : ""}`}
      onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={dropFile}
    >
      <FileJson />
      <span><strong>{dragging ? "ここにドロップ" : text.pickerTitle}</strong><small>{dragging ? "JSONファイルを読み込みます" : `${text.pickerHint}／ドラッグ＆ドロップ可`}</small></span>
      <input type="file" accept="application/json,.json" onChange={selectFile} />
    </label>
    {fileError ? <p className="backup-message error" role="alert"><AlertTriangle />{fileError}</p> : null}
    {completed ? <p className="backup-message success" role="status"><CircleCheck />{completed}</p> : null}
    {selected ? <div className="backup-preview">
      <dl>
        <div><dt>ファイル</dt><dd>{selected.fileName}</dd></div>
        <div><dt>作成日時</dt><dd>{backupTimestamp(selected.preview.exportedAt)}</dd></div>
        <div><dt>対象</dt><dd>{selected.preview.subject}</dd></div>
        <div><dt>内容</dt><dd>顧客{selected.preview.households}件 / 年度{selected.preview.snapshots}件 / 明細{selected.preview.positions}件</dd></div>
      </dl>
      <div className="backup-preview-actions">
        <button type="button" className="button secondary" onClick={() => setSelected(null)}>選び直す</button>
        <button type="button" className={`button ${expected === "full" ? "danger-button" : "primary"}`} onClick={() => setConfirming(true)}><Upload />{text.action}</button>
      </div>
    </div> : null}
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
