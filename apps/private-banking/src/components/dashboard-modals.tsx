"use client";

import { AlertTriangle, ChevronRight, CircleCheck, LoaderCircle, Pencil, Plus, Printer, Trash2, X } from "lucide-react";
import { FormEvent, useState } from "react";
import { DateInput } from "@/components/date-input";
import { PRINT_SECTION_META } from "@/components/print-front-matter";
import { compactYen } from "@/lib/format";
import { foreignCurrencies } from "@/lib/fx-rates";
import { type Portfolio, type PrintSection, type Section, type Snapshot, fiscalYearLabel, printSectionForSection, trendValues } from "@/lib/portfolio-view";
import { defaultAsOfDate } from "@/lib/snapshot-date";

/** ダッシュボード全体で使うモーダル群（顧客・年度・印刷・相続税）。 */

export function PrintGuideModal({ section, unavailable, onClose, onPrint }: { section: Section; unavailable: Partial<Record<PrintSection, string>>; onClose: () => void; onPrint: (sections: PrintSection[]) => void }) {
  // 並びは目次と同じ（PRINT_SECTION_META）。選べない理由は呼び出し側から受け取る。
  const options = PRINT_SECTION_META.map(({ key, title }) => ({ value: key, label: title, disabledNote: unavailable[key] }));
  // 開いている画面に対応する様式を既定にする。それが選べないときだけ貸借対照表にする。
  const natural = printSectionForSection(section);
  const defaultSection: PrintSection = natural && !unavailable[natural] ? natural : "balance";
  const [selected, setSelected] = useState<Set<PrintSection>>(() => new Set([defaultSection]));
  const selectable = options.filter((option) => !option.disabledNote).map((option) => option.value);
  const allSelected = selectable.every((value) => selected.has(value));

  function toggleSection(section: PrintSection) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(section)) next.delete(section); else next.add(section);
      return next;
    });
  }

  return <div className="modal-layer" role="presentation"><div className="modal delete-modal print-guide-modal" role="dialog" aria-modal="true" aria-labelledby="print-guide-title" aria-describedby="print-guide-description">
    <header><div><h2 id="print-guide-title">印刷・PDF出力</h2></div><button type="button" className="icon-button" aria-label="閉じる" onClick={onClose}><X /></button></header>
    <div className="delete-modal-body">
      <p id="print-guide-description">印刷する資料を選択してください。</p>
      <fieldset className="print-section-options">
        <legend>印刷対象</legend>
        {options.map((option) => <label key={option.value} aria-disabled={Boolean(option.disabledNote)}><input type="checkbox" checked={selected.has(option.value)} disabled={Boolean(option.disabledNote)} onChange={() => toggleSection(option.value)} /><span>{option.label}{option.disabledNote ? `（${option.disabledNote}）` : ""}</span></label>)}
        <button type="button" className="text-button compact print-select-all" onClick={() => setSelected(allSelected ? new Set() : new Set(selectable))}>{allSelected ? "すべて外す" : "すべて選ぶ"}</button>
      </fieldset>
      {/* 表紙と目次は選んだ様式だけを載せて必ず付く。PDF はブラウザの印刷画面から作る。 */}
      <p className="print-guide-example">表紙と目次を付けて、選んだ順に印刷します。PDFにするときは、このあと開くブラウザの印刷画面で「送信先」に「PDFに保存」を選んでください。</p>
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
  const [asOfDate, setAsOfDate] = useState(defaultAsOfDate(initialSource.fiscalYear + 1));
  const source = snapshots.find((snapshot) => snapshot.id === sourceId) ?? initialSource;
  const targetYear = Number(fiscalYear);
  const validTargetYear = Number.isInteger(targetYear) && targetYear >= 1900 && targetYear <= 2200;
  const existingSnapshot = validTargetYear ? snapshots.find((snapshot) => snapshot.fiscalYear === targetYear) : undefined;
  const latestYear = Math.max(...snapshots.map((snapshot) => snapshot.fiscalYear));

  function changeSource(nextSourceId: number) {
    const nextSource = snapshots.find((snapshot) => snapshot.id === nextSourceId);
    if (!nextSource) return;
    setSourceId(nextSource.id);
    const nextFiscalYear = nextSource.fiscalYear + 1;
    setFiscalYear(String(nextFiscalYear));
    setAsOfDate(defaultAsOfDate(nextFiscalYear));
  }

  function changeFiscalYear(value: string) {
    setFiscalYear(value);
    const year = Number(value);
    if (Number.isInteger(year) && year >= 1900 && year <= 2200) setAsOfDate(defaultAsOfDate(year));
  }

  return <div className="modal-layer" role="presentation"><div className="modal year-creation-modal" role="dialog" aria-modal="true" aria-labelledby="year-creation-title">
    <header><div><h2 id="year-creation-title">年度を追加</h2></div><button className="icon-button" aria-label="閉じる" onClick={onClose} disabled={saving}><X /></button></header>
    <form onSubmit={onSubmit}>
      <p className="form-intro">作成方法と年度を選択してください。同じ年度は1件だけ登録できます。</p>
      <fieldset className="year-creation-method"><legend>作成方法</legend><div className="year-method-options">
        <label><input type="radio" name="creationMode" value="COPY" checked={creationMode === "COPY"} onChange={() => setCreationMode("COPY")} disabled={saving} /><span><strong>前年度からコピー</strong><small>明細と税金を引き継ぐ</small></span></label>
        <label><input type="radio" name="creationMode" value="BLANK" checked={creationMode === "BLANK"} onChange={() => setCreationMode("BLANK")} disabled={saving} /><span><strong>空の年度を作成</strong><small>明細・税金を0から入力</small></span></label>
      </div></fieldset>
      <div className={`form-grid year-creation-grid ${creationMode === "BLANK" ? "blank-mode" : ""}`}>
        {creationMode === "COPY" ? <label>コピー元年度<select name="sourceSnapshotId" value={sourceId} onChange={(event) => changeSource(Number(event.target.value))} disabled={saving}>{orderedSnapshots.map((snapshot) => <option key={snapshot.id} value={snapshot.id}>{fiscalYearLabel(snapshot)}{snapshot.isCurrent ? "（現在）" : ""}</option>)}</select></label> : <input type="hidden" name="sourceSnapshotId" value={sourceId} />}
        <label>作成年度<input name="fiscalYear" type="number" min="1900" max="2200" step="1" value={fiscalYear} onChange={(event) => changeFiscalYear(event.target.value)} required disabled={saving} /></label>
        <div className="date-field">
          <label htmlFor="year-as-of-date">B/S基準日</label>
          <DateInput id="year-as-of-date" name="asOfDate" label="B/S基準日" min={validTargetYear ? `${targetYear}-01-01` : undefined} max={validTargetYear ? `${targetYear}-12-31` : undefined} value={asOfDate} onChange={setAsOfDate} describedBy="year-as-of-date-help" required disabled={saving} />
          <small id="year-as-of-date-help" className="field-help">初期値は年度の1月1日です。</small>
        </div>
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
    <header><div><h2 id="snapshot-delete-title">{canDelete ? `${snapshot.fiscalYear}年度を削除しますか？` : "この年度は削除できません"}</h2></div><button className="icon-button" aria-label="閉じる" onClick={onClose} disabled={saving}><X /></button></header>
    <form onSubmit={onSubmit}>
      <div className="snapshot-delete-warning"><AlertTriangle /><div><strong>{canDelete ? "年度内のデータがすべて削除されます" : "少なくとも1年度の登録が必要です"}</strong><p id="snapshot-delete-description">{canDelete ? "資産・負債明細と年度別の税金を一括削除します。この操作は取り消せません。" : "先に別の年度を作成してから、もう一度削除してください。"}</p></div></div>
      <dl className="snapshot-delete-summary"><div><dt>対象年度</dt><dd>{fiscalYearLabel(snapshot)}{snapshot.isCurrent ? "（現在）" : ""}</dd></div><div><dt>登録明細</dt><dd>資産 {assetCount}件・負債等 {liabilityCount}件</dd></div><div><dt>資産合計</dt><dd>{compactYen(values.assets)}</dd></div><div><dt>負債合計</dt><dd>{compactYen(values.liabilities)}</dd></div></dl>
      {canDelete ? <label className="snapshot-delete-confirm">確認のため「{snapshot.fiscalYear}」と入力してください<input name="confirmationFiscalYear" inputMode="numeric" autoComplete="off" value={confirmation} onChange={(event) => setConfirmation(event.target.value.replace(/[^0-9]/g, ""))} aria-describedby="snapshot-delete-confirm-help" disabled={saving} /><small id="snapshot-delete-confirm-help">入力した年度が一致するまで削除ボタンは有効になりません。</small></label> : null}
      <footer><button type="button" className="button secondary" onClick={onClose} disabled={saving}>{canDelete ? "キャンセル" : "閉じる"}</button>{canDelete ? <button type="submit" className="button danger-button" disabled={saving || !confirmationMatches}>{saving ? <LoaderCircle className="spin" /> : <Trash2 />}年度データを削除</button> : null}</footer>
    </form>
  </div></div>;
}

export function SnapshotSettingsModal({ snapshot, onClose, onSubmit, saving }: { snapshot: Snapshot; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; saving: boolean }) {
  return <div className="modal-layer" role="presentation"><div className="modal snapshot-tax-modal" role="dialog" aria-modal="true" aria-labelledby="snapshot-settings-title"><header><div><h2 id="snapshot-settings-title">{fiscalYearLabel(snapshot)}の年度設定</h2></div><button type="button" className="icon-button" aria-label="閉じる" onClick={onClose} disabled={saving}><X /></button></header><form onSubmit={onSubmit}><p className="form-intro">B/S基準日と、この年度の税額を修正します。</p><div className="form-grid snapshot-settings-grid"><label className="snapshot-date-field">B/S基準日<input name="asOfDate" type="date" min={`${snapshot.fiscalYear}-01-01`} max={`${snapshot.fiscalYear}-12-31`} defaultValue={snapshot.asOfDate} aria-describedby="snapshot-as-of-date-help" required /><small id="snapshot-as-of-date-help" className="field-help">対象年度内の日付を指定してください。</small></label><label>相続税<input name="estimatedInheritanceTax" type="number" min="0" step="1" defaultValue={snapshot.estimatedInheritanceTax} required /></label><label>その他税金<input name="otherTaxes" type="number" min="0" step="1" defaultValue={snapshot.otherTaxes} required /></label></div><fieldset className="fx-rate-fieldset"><legend>円換算レート（1通貨あたりの円）</legend><p className="field-help">この年度の外貨建て明細は、ここで登録したレートで円換算します。使わない通貨は空欄のままで構いません。</p><div className="fx-rate-grid">{foreignCurrencies.map((code) => <label key={code}>{code}<input name={`fxRate.${code}`} type="number" min="0" step="0.000001" defaultValue={snapshot.fxRates[code] ?? ""} placeholder="例：150.25" /></label>)}</div></fieldset><footer><button type="button" className="button secondary" onClick={onClose} disabled={saving}>キャンセル</button><button type="submit" className="button primary" disabled={saving}>{saving ? <LoaderCircle className="spin" /> : <Pencil />}保存する</button></footer></form></div></div>;
}

/** 税金あり貸借対照表で使う金額を手入力する。相続人の構成は親族関係タブが唯一の入力先なのでここでは扱わない。 */
export function ForecastModal({ planning, onClose, onSubmit, saving }: { planning: Portfolio["planning"]; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; saving: boolean }) {
  return <div className="modal-layer" role="presentation"><div className="modal forecast-modal" role="dialog" aria-modal="true" aria-labelledby="forecast-modal-title"><header><div><h2 id="forecast-modal-title">税金・費用の入力</h2></div><button className="icon-button" aria-label="閉じる" onClick={onClose}><X /></button></header><form onSubmit={onSubmit}><p className="form-intro">「税金あり」の貸借対照表で差し引く金額です。ここで入力した金額は、次に相続税を計算するまで保持されます。</p><div className="form-grid"><label>想定相続税<input name="estimatedInheritanceTax" type="number" min="0" step="1" defaultValue={planning.estimatedInheritanceTax} required /></label><label>その他税金<input name="otherTaxes" type="number" min="0" step="1" defaultValue={planning.otherTaxes} required /></label><label>承継関連費用<input name="successionCosts" type="number" min="0" step="1" defaultValue={planning.successionCosts} required /></label></div>{planning.inheritanceTaxUpdatedAt ? <p className="sync-status">前回の計算：{new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeStyle: "short" }).format(new Date(planning.inheritanceTaxUpdatedAt))}</p> : null}<footer><button type="button" className="button secondary" onClick={onClose}>キャンセル</button><button type="submit" className="button primary" disabled={saving}>{saving ? <LoaderCircle className="spin" /> : <Pencil />}保存する</button></footer></form></div></div>;
}
