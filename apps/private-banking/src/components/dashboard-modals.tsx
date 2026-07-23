"use client";

import { AlertTriangle, ChevronRight, CircleCheck, Link2, LoaderCircle, Pencil, Plus, Printer, Trash2, X } from "lucide-react";
import { FormEvent, useState } from "react";
import { ClientFields } from "@/components/client-fields";
import { compactYen } from "@/lib/format";
import { type Portfolio, type PrintSection, type Section, type Snapshot, fiscalYearLabel, trendValues } from "@/lib/portfolio-view";

/** ダッシュボード全体で使うモーダル群（顧客・年度・印刷・相続税）。 */

export function ClientEditModal({ household, error, saving, onClose, onSubmit, onRequestDelete }: {
  household: Portfolio["household"];
  error: string;
  saving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onRequestDelete: () => void;
}) {
  return <div className="modal-layer" role="presentation"><div className="modal client-switcher-modal" role="dialog" aria-modal="true" aria-labelledby="client-edit-title">
    <header><div><p className="eyebrow">CLIENT</p><h2 id="client-edit-title">顧客情報を編集</h2></div><button type="button" className="icon-button" aria-label="閉じる" onClick={onClose} disabled={saving}><X /></button></header>
    <form className="client-create-form" onSubmit={onSubmit}>
      <p className="client-modal-guidance">かなを登録しておくと、顧客一覧の検索でかな入力からも探せます。</p>
      {error ? <p className="client-modal-error" role="alert"><AlertTriangle />{error}</p> : null}
      <div className="form-grid client-create-grid"><ClientFields defaults={household} autoFocus /></div>
      <footer className="client-edit-footer">
        <button type="button" className="text-button danger-text-button" onClick={onRequestDelete} disabled={saving}><Trash2 />この顧客を削除</button>
        <div className="client-edit-footer-actions">
          <button type="button" className="button secondary" onClick={onClose} disabled={saving}>キャンセル</button>
          <button type="submit" className="button primary" disabled={saving}>{saving ? <LoaderCircle className="spin" /> : <Pencil />}保存する</button>
        </div>
      </footer>
    </form>
  </div></div>;
}

export function ClientDeleteModal({ household, snapshotCount, positionCount, error, saving, onClose, onSubmit }: {
  household: Portfolio["household"];
  snapshotCount: number;
  positionCount: number;
  error: string;
  saving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [confirmation, setConfirmation] = useState("");
  const confirmationMatches = confirmation.toUpperCase() === household.clientCode.toUpperCase();

  return <div className="modal-layer" role="presentation"><div className="modal delete-modal snapshot-delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="client-delete-title" aria-describedby="client-delete-description">
    <header><div><p className="eyebrow danger-eyebrow">DELETE CLIENT</p><h2 id="client-delete-title">{household.name}を削除しますか？</h2></div><button type="button" className="icon-button" aria-label="閉じる" onClick={onClose} disabled={saving}><X /></button></header>
    <form onSubmit={onSubmit}>
      <div className="snapshot-delete-warning"><AlertTriangle /><div><strong>この顧客のすべての年度・明細が削除されます</strong><p id="client-delete-description">この操作は取り消せません。必要な場合は、先にバックアップ画面からこの顧客のデータを書き出してください。</p></div></div>
      {error ? <p className="client-modal-error" role="alert"><AlertTriangle />{error}</p> : null}
      <dl className="snapshot-delete-summary"><div><dt>顧客コード</dt><dd>{household.clientCode}</dd></div><div><dt>登録年度</dt><dd>{snapshotCount}年度</dd></div><div><dt>登録明細</dt><dd>{positionCount}件</dd></div></dl>
      <label className="snapshot-delete-confirm">確認のため「{household.clientCode}」と入力してください<input name="confirmationClientCode" autoComplete="off" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} aria-describedby="client-delete-confirm-help" disabled={saving} /><small id="client-delete-confirm-help">入力した顧客コードが一致するまで削除ボタンは有効になりません。</small></label>
      <footer><button type="button" className="button secondary" onClick={onClose} disabled={saving}>キャンセル</button><button type="submit" className="button danger-button" disabled={saving || !confirmationMatches}>{saving ? <LoaderCircle className="spin" /> : <Trash2 />}顧客を削除</button></footer>
    </form>
  </div></div>;
}

export function PrintGuideModal({ section, onClose, onPrint }: { section: Section; onClose: () => void; onPrint: (sections: PrintSection[]) => void }) {
  const options: Array<{ value: PrintSection; label: string }> = [
    { value: "balance", label: "貸借対照表" },
    { value: "details", label: "資産・負債明細" },
    { value: "history", label: "年度比較" },
  ];
  const defaultSection: PrintSection = section === "balance" ? "balance" : section === "positions" ? "details" : "history";
  const [selected, setSelected] = useState<Set<PrintSection>>(() => new Set([defaultSection]));

  function toggleSection(section: PrintSection) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(section)) next.delete(section); else next.add(section);
      return next;
    });
  }

  return <div className="modal-layer" role="presentation"><div className="modal delete-modal print-guide-modal" role="dialog" aria-modal="true" aria-labelledby="print-guide-title" aria-describedby="print-guide-description">
    <header><div><p className="eyebrow">PRINT / PDF</p><h2 id="print-guide-title">印刷・PDF出力</h2></div><button type="button" className="icon-button" aria-label="閉じる" onClick={onClose}><X /></button></header>
    <div className="delete-modal-body">
      <p id="print-guide-description">印刷する資料を選択してください。</p>
      <fieldset className="print-section-options"><legend>印刷対象</legend>{options.map((option) => <label key={option.value}><input type="checkbox" checked={selected.has(option.value)} onChange={() => toggleSection(option.value)} /><span>{option.label}</span></label>)}</fieldset>
      <p className="print-guide-example">「ページ」から、すべて・範囲（1-3）・個別ページ（1,3,5）を選択してください。</p>
      <footer><button type="button" className="button secondary" onClick={onClose}>キャンセル</button><button type="button" className="button primary" disabled={selected.size === 0} onClick={() => onPrint([...selected])}><Printer />選択して印刷</button></footer>
    </div>
  </div></div>;
}

export function YearCreationModal({ snapshots, initialSourceId, onClose, onSubmit, onEditExisting, saving }: {
  snapshots: Snapshot[];
  initialSourceId: number;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onEditExisting: (snapshotId: number) => void;
  saving: boolean;
}) {
  const orderedSnapshots = [...snapshots].sort((a, b) => b.fiscalYear - a.fiscalYear || b.id - a.id);
  const initialSource = snapshots.find((snapshot) => snapshot.id === initialSourceId) ?? orderedSnapshots[0];
  const [creationMode, setCreationMode] = useState<"COPY" | "BLANK">("COPY");
  const [sourceId, setSourceId] = useState(initialSource.id);
  const [fiscalYear, setFiscalYear] = useState(String(initialSource.fiscalYear + 1));
  const source = snapshots.find((snapshot) => snapshot.id === sourceId) ?? initialSource;
  const targetYear = Number(fiscalYear);
  const validTargetYear = Number.isInteger(targetYear) && targetYear >= 1900 && targetYear <= 2200;
  const existingSnapshot = validTargetYear ? snapshots.find((snapshot) => snapshot.fiscalYear === targetYear) : undefined;
  const latestYear = Math.max(...snapshots.map((snapshot) => snapshot.fiscalYear));

  function changeSource(nextSourceId: number) {
    const nextSource = snapshots.find((snapshot) => snapshot.id === nextSourceId);
    if (!nextSource) return;
    setSourceId(nextSource.id);
    setFiscalYear(String(nextSource.fiscalYear + 1));
  }

  return <div className="modal-layer" role="presentation"><div className="modal year-creation-modal" role="dialog" aria-modal="true" aria-labelledby="year-creation-title">
    <header><div><p className="eyebrow">ADD FISCAL YEAR</p><h2 id="year-creation-title">年度を追加</h2></div><button className="icon-button" aria-label="閉じる" onClick={onClose} disabled={saving}><X /></button></header>
    <form onSubmit={onSubmit}>
      <p className="form-intro">作成方法と年度を選択してください。同じ年度は1件だけ登録できます。</p>
      <fieldset className="year-creation-method"><legend>作成方法</legend><div className="year-method-options">
        <label><input type="radio" name="creationMode" value="COPY" checked={creationMode === "COPY"} onChange={() => setCreationMode("COPY")} disabled={saving} /><span><strong>前年度からコピー</strong><small>明細と税金を引き継ぐ</small></span></label>
        <label><input type="radio" name="creationMode" value="BLANK" checked={creationMode === "BLANK"} onChange={() => setCreationMode("BLANK")} disabled={saving} /><span><strong>空の年度を作成</strong><small>明細・税金を0から入力</small></span></label>
      </div></fieldset>
      <div className={`form-grid year-creation-grid ${creationMode === "BLANK" ? "blank-mode" : ""}`}>
        {creationMode === "COPY" ? <label>コピー元年度<select name="sourceSnapshotId" value={sourceId} onChange={(event) => changeSource(Number(event.target.value))} disabled={saving}>{orderedSnapshots.map((snapshot) => <option key={snapshot.id} value={snapshot.id}>{fiscalYearLabel(snapshot)}{snapshot.isCurrent ? "（現在）" : ""}</option>)}</select></label> : <input type="hidden" name="sourceSnapshotId" value={sourceId} />}
        <label>作成年度<input name="fiscalYear" type="number" min="1900" max="2200" step="1" value={fiscalYear} onChange={(event) => setFiscalYear(event.target.value)} required disabled={saving} /></label>
      </div>
      {validTargetYear && creationMode === "COPY" ? <div className="year-copy-preview" aria-label={`${source.fiscalYear}年度から${targetYear}年度へコピー`}><span>{source.fiscalYear}年度</span><ChevronRight /><strong>{targetYear}年度</strong></div> : null}
      {validTargetYear && creationMode === "BLANK" ? <div className="year-blank-preview" aria-label={`${targetYear}年度を空の状態で作成`}><strong>{targetYear}年度</strong><span>資産・負債・偶発債務 0件／税金 0円</span></div> : null}
      {existingSnapshot ? <div className="year-conflict" role="alert"><AlertTriangle /><div><strong>{targetYear}年度は登録済みです</strong><p>1事業年度1件のため、新規作成や上書きは行いません。登録済み年度を修正してください。</p></div></div> : validTargetYear ? <div className="year-create-note"><CircleCheck /><span>{targetYear > latestYear ? "作成後は、この年度が現在年度になります。" : "過年度として追加します。現在年度は変わりません。"}</span></div> : null}
      <footer><button type="button" className="button secondary" onClick={onClose} disabled={saving}>キャンセル</button>{existingSnapshot ? <button type="button" className="button primary" onClick={() => onEditExisting(existingSnapshot.id)}><Pencil />{targetYear}年度を修正</button> : <button type="submit" className="button primary" disabled={saving || !validTargetYear}>{saving ? <LoaderCircle className="spin" /> : <Plus />}{creationMode === "COPY" ? "コピーして作成" : "空の年度を作成"}</button>}</footer>
    </form>
  </div></div>;
}

export function DeleteSnapshotModal({ snapshot, snapshotCount, onClose, onSubmit, saving }: {
  snapshot: Snapshot;
  snapshotCount: number;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  saving: boolean;
}) {
  const [confirmation, setConfirmation] = useState("");
  const canDelete = snapshotCount > 1;
  const confirmationMatches = confirmation === String(snapshot.fiscalYear);
  const values = trendValues(snapshot);
  const assetCount = snapshot.positions.filter((position) => position.side === "ASSET").length;
  const liabilityCount = snapshot.positions.filter((position) => position.side === "LIABILITY").length;

  return <div className="modal-layer" role="presentation"><div className="modal delete-modal snapshot-delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="snapshot-delete-title" aria-describedby="snapshot-delete-description">
    <header><div><p className="eyebrow danger-eyebrow">DELETE FISCAL YEAR</p><h2 id="snapshot-delete-title">{canDelete ? `${snapshot.fiscalYear}年度を削除しますか？` : "この年度は削除できません"}</h2></div><button className="icon-button" aria-label="閉じる" onClick={onClose} disabled={saving}><X /></button></header>
    <form onSubmit={onSubmit}>
      <div className="snapshot-delete-warning"><AlertTriangle /><div><strong>{canDelete ? "年度内のデータがすべて削除されます" : "少なくとも1年度の登録が必要です"}</strong><p id="snapshot-delete-description">{canDelete ? "資産・負債明細と年度別の税金を一括削除します。この操作は取り消せません。" : "先に別の年度を作成してから、もう一度削除してください。"}</p></div></div>
      <dl className="snapshot-delete-summary"><div><dt>対象年度</dt><dd>{fiscalYearLabel(snapshot)}{snapshot.isCurrent ? "（現在）" : ""}</dd></div><div><dt>登録明細</dt><dd>資産 {assetCount}件・負債等 {liabilityCount}件</dd></div><div><dt>資産合計</dt><dd>{compactYen(values.assets)}</dd></div><div><dt>負債合計</dt><dd>{compactYen(values.liabilities)}</dd></div></dl>
      {canDelete ? <label className="snapshot-delete-confirm">確認のため「{snapshot.fiscalYear}」と入力してください<input name="confirmationFiscalYear" inputMode="numeric" autoComplete="off" value={confirmation} onChange={(event) => setConfirmation(event.target.value.replace(/[^0-9]/g, ""))} aria-describedby="snapshot-delete-confirm-help" disabled={saving} /><small id="snapshot-delete-confirm-help">入力した年度が一致するまで削除ボタンは有効になりません。</small></label> : null}
      <footer><button type="button" className="button secondary" onClick={onClose} disabled={saving}>{canDelete ? "キャンセル" : "閉じる"}</button>{canDelete ? <button type="submit" className="button danger-button" disabled={saving || !confirmationMatches}>{saving ? <LoaderCircle className="spin" /> : <Trash2 />}年度データを削除</button> : null}</footer>
    </form>
  </div></div>;
}

export function SnapshotTaxModal({ snapshot, onClose, onSubmit, saving }: { snapshot: Snapshot; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; saving: boolean }) {
  return <div className="modal-layer" role="presentation"><div className="modal snapshot-tax-modal" role="dialog" aria-modal="true" aria-labelledby="snapshot-tax-title"><header><div><p className="eyebrow">TAX EDIT</p><h2 id="snapshot-tax-title">{fiscalYearLabel(snapshot)}の税金を修正</h2></div><button className="icon-button" aria-label="閉じる" onClick={onClose}><X /></button></header><form onSubmit={onSubmit}><p className="form-intro">選択年度の税額だけを修正します。</p><div className="form-grid"><label>相続税<input name="estimatedInheritanceTax" type="number" min="0" step="1" defaultValue={snapshot.estimatedInheritanceTax} required /></label><label>その他税金<input name="otherTaxes" type="number" min="0" step="1" defaultValue={snapshot.otherTaxes} required /></label></div><footer><button type="button" className="button secondary" onClick={onClose}>キャンセル</button><button type="submit" className="button primary" disabled={saving}>{saving ? <LoaderCircle className="spin" /> : <Pencil />}保存する</button></footer></form></div></div>;
}

export function ForecastModal({ planning, onClose, onSubmit, saving }: { planning: Portfolio["planning"]; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; saving: boolean }) {
  const [hasSpouse, setHasSpouse] = useState(planning.hasSpouse);
  const [heirRank, setHeirRank] = useState<Portfolio["planning"]["heirRank"]>(planning.heirRank);

  function changeSpouse(nextHasSpouse: boolean) {
    setHasSpouse(nextHasSpouse);
    if (!nextHasSpouse && heirRank === "none") setHeirRank("rank1");
  }

  return <div className="modal-layer" role="presentation"><div className="modal forecast-modal" role="dialog" aria-modal="true" aria-labelledby="forecast-modal-title"><header><div><p className="eyebrow">INHERITANCE TAX</p><h2 id="forecast-modal-title">相続税計算の家族情報</h2></div><button className="icon-button" aria-label="閉じる" onClick={onClose}><X /></button></header><form onSubmit={onSubmit}><p className="form-intro">概算に必要な最小限の情報です。法定相続分で計算し、代襲相続などの詳細は計算画面で調整できます。</p><div className="family-form-grid"><label>配偶者<select name="hasSpouse" value={String(hasSpouse)} onChange={(event) => changeSpouse(event.target.value === "true")}><option value="false">なし</option><option value="true">あり</option></select></label><label>配偶者以外の相続人<select name="heirRank" value={heirRank} onChange={(event) => setHeirRank(event.target.value as Portfolio["planning"]["heirRank"])}><option value="rank1">子</option><option value="rank2">親・祖父母</option><option value="rank3">兄弟姉妹</option><option value="none" disabled={!hasSpouse}>なし</option></select></label>{heirRank !== "none" ? <label>人数<input name="heirCount" type="number" min="1" max="20" step="1" defaultValue={Math.max(1, planning.heirCount)} required /></label> : <input type="hidden" name="heirCount" value="0" />}</div><details className="advanced-forecast"><summary>金額を手動調整</summary><div className="form-grid"><label>想定相続税<input name="estimatedInheritanceTax" type="number" min="0" step="1" defaultValue={planning.estimatedInheritanceTax} required /></label><label>その他税金<input name="otherTaxes" type="number" min="0" step="1" defaultValue={planning.otherTaxes} required /></label><label>承継関連費用<input name="successionCosts" type="number" min="0" step="1" defaultValue={planning.successionCosts} required /></label></div></details>{planning.inheritanceTaxUpdatedAt ? <p className="sync-status">前回の税額連携：{new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeStyle: "short" }).format(new Date(planning.inheritanceTaxUpdatedAt))}</p> : null}<footer><button type="button" className="button secondary" onClick={onClose}>キャンセル</button><button type="submit" name="action" value="save" className="button secondary" disabled={saving}>保存のみ</button><button type="submit" name="action" value="calculate" className="button primary" disabled={saving}>{saving ? <LoaderCircle className="spin" /> : <Link2 />}保存して相続税を計算</button></footer></form></div></div>;
}
