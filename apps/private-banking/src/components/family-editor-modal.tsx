"use client";

import { ArrowDown, ArrowUp, Calculator, LoaderCircle, Pencil, Plus, Trash2, X } from "lucide-react";
import { type CSSProperties, FormEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { ToastRegion, useToast } from "@/components/use-toast";
import { type FamilyEditRow, MAX_FAMILY_ROWS, familyDraftsFromRows, useFamilyEditor } from "@/components/use-family-editor";
import {
  type FamilyMember,
  type FamilyMemberDraft,
  acquisitionReasonOptions,
  ageOnDate,
  disabilityOptions,
  relationshipLabels,
  relativeRelationshipOptions,
} from "@/lib/family";

/** 「1/2」形式。全角の数字・スラッシュも受け付ける（最終的な判定は parseShareText）。 */
const SHARE_PATTERN = String.raw`\s*[0-9０-９]+\s*(?:[\/／]\s*[0-9０-９]+\s*)?`;

type FieldProps = { id: string; label: string; index: number; required?: boolean; hint?: ReactNode; children: ReactNode };

/** 見出しの下に入力欄を置く1項目。読み上げでは「1人目の氏名」のように何人目かを添える。 */
function Field({ id, label, index, required, hint, children }: FieldProps) {
  return <div className="family-field">
    <label htmlFor={id}><span className="sr-only">{index + 1}人目の</span>{label}{required ? <span className="required-mark" aria-hidden="true">必須</span> : null}</label>
    {children}
    {hint ? <small className="family-field-hint">{hint}</small> : null}
  </div>;
}

/** カードの中の項目のまとまり。項目数に応じて横幅を配分し、狭い画面では折り返す。 */
function Section({ title, fieldCount, children }: { title: string; fieldCount: number; children: ReactNode }) {
  return <div className="family-card-section" role="group" aria-label={title} style={{ "--field-count": fieldCount } as CSSProperties}>
    <p className="family-card-section-title" aria-hidden="true">{title}</p>
    <div className="family-card-fields">{children}</div>
  </div>;
}

function FamilyCard({ row, index, total, referenceDate, onUpdate, onMove, onRemove }: {
  row: FamilyEditRow;
  index: number;
  total: number;
  referenceDate: string;
  onUpdate: (patch: Partial<FamilyEditRow>) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  const id = (field: string) => `family-${row.key}-${field}`;
  const age = ageOnDate(row.birthDate, referenceDate);
  const name = row.name.trim();

  return <article className="family-card" id={id("card")} aria-labelledby={id("title")}>
    <header className="family-card-header">
      <h3 id={id("title")}>
        <span className="family-card-index">{index + 1}人目</span>
        <span className={`family-card-name ${name ? "" : "empty"}`}>{name || "氏名未入力"}</span>
        <span className="family-card-relation">{relationshipLabels[row.relationship]}</span>
      </h3>
      <div className="family-card-actions">
        <button type="button" className="row-action" title="上へ移動" aria-label={`${index + 1}人目を上へ`} disabled={index === 0} onClick={() => onMove(-1)}><ArrowUp /></button>
        <button type="button" className="row-action" title="下へ移動" aria-label={`${index + 1}人目を下へ`} disabled={index === total - 1} onClick={() => onMove(1)}><ArrowDown /></button>
        <button type="button" className="row-action danger" title="削除" aria-label={`${index + 1}人目を削除`} onClick={onRemove}><Trash2 /></button>
      </div>
    </header>
    <div className="family-card-body">
      <Section title="基本" fieldCount={4}>
        <Field id={id("name")} label="氏名" index={index} required>
          <input id={id("name")} required maxLength={100} value={row.name} autoComplete="off" onChange={(event) => onUpdate({ name: event.target.value })} />
        </Field>
        <Field id={id("kana")} label="フリガナ" index={index}>
          <input id={id("kana")} maxLength={100} value={row.nameKana} autoComplete="off" onChange={(event) => onUpdate({ nameKana: event.target.value })} />
        </Field>
        <Field id={id("relationship")} label="続柄" index={index} required>
          <select id={id("relationship")} required value={row.relationship} onChange={(event) => onUpdate({ relationship: event.target.value as FamilyEditRow["relationship"] })}>
            {relativeRelationshipOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </Field>
        <Field id={id("birth")} label="生年月日" index={index} hint={age === null ? undefined : `基準日時点 ${age}歳`}>
          <input id={id("birth")} type="date" value={row.birthDate ?? ""} onChange={(event) => onUpdate({ birthDate: event.target.value || null })} />
        </Field>
      </Section>
      <Section title="相続" fieldCount={3}>
        <Field id={id("reason")} label="取得原因" index={index} required>
          <select id={id("reason")} required value={row.acquisitionReason} onChange={(event) => onUpdate({ acquisitionReason: event.target.value as FamilyEditRow["acquisitionReason"] })}>
            {acquisitionReasonOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </Field>
        <Field id={id("civil")} label="民法上の法定相続分" index={index}>
          <input id={id("civil")} inputMode="numeric" autoComplete="off" placeholder="例 1/2" pattern={SHARE_PATTERN} title="「1/2」の形で入力してください" value={row.civilShare} onChange={(event) => onUpdate({ civilShare: event.target.value })} />
        </Field>
        <Field id={id("tax")} label="税法上の法定相続分" index={index} hint={
          <label className="family-check">
            <input type="checkbox" checked={row.taxSameAsCivil} onChange={(event) => onUpdate(event.target.checked
              ? { taxSameAsCivil: true }
              : { taxSameAsCivil: false, taxShare: row.taxShare || row.civilShare })} />
            民法上と同じ
          </label>
        }>
          {row.taxSameAsCivil
            ? <input id={id("tax")} readOnly value={row.civilShare} placeholder="－" aria-describedby={id("tax-same")} />
            : <input id={id("tax")} inputMode="numeric" autoComplete="off" placeholder="例 1/2" pattern={SHARE_PATTERN} title="「1/2」の形で入力してください" value={row.taxShare} onChange={(event) => onUpdate({ taxShare: event.target.value })} />}
          {row.taxSameAsCivil ? <span id={id("tax-same")} className="sr-only">民法上と同じ値を使います</span> : null}
        </Field>
      </Section>
      <Section title="税額の加算・控除" fieldCount={2}>
        <Field id={id("addition")} label="2割加算" index={index}>
          <select id={id("addition")} value={String(row.specialTaxAddition)} onChange={(event) => onUpdate({ specialTaxAddition: event.target.value === "true" })}>
            <option value="false">対象外</option>
            <option value="true">対象</option>
          </select>
        </Field>
        <Field id={id("disability")} label="障害者" index={index}>
          <select id={id("disability")} value={row.disabilityCategory} onChange={(event) => onUpdate({ disabilityCategory: event.target.value as FamilyEditRow["disabilityCategory"] })}>
            {disabilityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </Field>
      </Section>
    </div>
  </article>;
}

/**
 * 家族情報の入力ダイアログ。1人1枚のカードで、ダイアログ全体を1つのスクロールにして保存ボタンは下端に固定する。
 * 削除は「元に戻す」で取り消せ、変更したまま閉じようとしたときは確認する。
 */
export function FamilyEditorModal({ members, referenceDate, saving, onSave, onClose }: {
  members: FamilyMember[];
  referenceDate: string;
  saving: boolean;
  onSave: (members: FamilyMemberDraft[]) => Promise<void>;
  onClose: () => void;
}) {
  const editor = useFamilyEditor(members);
  const { toast, showToast, dismissToast } = useToast();
  const [submitError, setSubmitError] = useState("");
  const [confirmingClose, setConfirmingClose] = useState(false);
  const keepEditingRef = useRef<HTMLButtonElement>(null);
  const confirmCalculationRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const { focusKey, clearFocusKey } = editor;

  // 追加したカード・元に戻したカードまで画面を動かし、氏名欄から入力を始められるようにする。
  useEffect(() => {
    if (!focusKey) return;
    const input = document.getElementById(`family-${focusKey}-name`);
    document.getElementById(`family-${focusKey}-card`)?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
    input?.focus({ preventScroll: true });
    clearFocusKey();
  }, [focusKey, clearFocusKey]);

  useEffect(() => { if (confirmingClose) keepEditingRef.current?.focus(); }, [confirmingClose]);
  useEffect(() => { if (editor.pendingOverwrite !== null) confirmCalculationRef.current?.focus(); }, [editor.pendingOverwrite]);

  const requestClose = () => {
    if (saving) return;
    if (editor.dirty) setConfirmingClose(true);
    else onClose();
  };

  const removeRow = (row: FamilyEditRow) => {
    const removed = editor.remove(row.key);
    if (!removed) return;
    const label = row.name.trim() ? `「${row.name.trim()}」` : `${removed.index + 1}人目`;
    // 押した削除ボタンが消えてフォーカスがダイアログの外へ抜けると Escape も効かなくなるので、ダイアログへ戻す。
    dialogRef.current?.focus({ preventScroll: true });
    showToast(`${label}を削除しました`, { durationMs: 6_000, action: { label: "元に戻す", onClick: () => editor.restore(removed) } });
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError("");
    setConfirmingClose(false);
    try {
      await onSave(familyDraftsFromRows(editor.rows));
      dismissToast();
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "家族情報を保存できませんでした。");
    }
  };

  const addButton = (className: string) => <button type="button" className={className} disabled={editor.rows.length >= MAX_FAMILY_ROWS} onClick={editor.add}><Plus />家族を追加</button>;

  return <div className="modal-layer" role="presentation" onKeyDown={(event) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    if (confirmingClose) setConfirmingClose(false);
    else requestClose();
  }}>
    <div ref={dialogRef} tabIndex={-1} className="modal family-editor-modal" role="dialog" aria-modal="true" aria-labelledby="family-editor-title">
      <header>
        <div><h2 id="family-editor-title">家族情報の入力</h2></div>
        <button type="button" className="icon-button" aria-label="閉じる" onClick={requestClose} disabled={saving}><X /></button>
      </header>
      <form onSubmit={submit}>
        <div className="family-editor-toolbar">
          <p>法定相続分は「1/2」の形で入力します。自動計算した後も修正できます。</p>
          <div className="family-editor-toolbar-actions">
            {addButton("button secondary")}
            <button type="button" className="button secondary" onClick={editor.requestCalculation}><Calculator />法定相続分を自動計算</button>
          </div>
        </div>
        {editor.pendingOverwrite !== null ? <div className="family-editor-confirm" role="alert">
          <p>入力済みの法定相続分 {editor.pendingOverwrite}件 が自動計算の結果で書き換わります。</p>
          <button type="button" className="button secondary" onClick={editor.cancelCalculation}>やめる</button>
          <button type="button" className="button primary" ref={confirmCalculationRef} onClick={editor.confirmCalculation}>上書きする</button>
        </div> : null}
        <div className="family-card-list">
          {editor.rows.length === 0 ? <p className="family-editor-empty">家族が登録されていません。「家族を追加」から入力してください。</p> : null}
          {editor.rows.map((row, index) => <FamilyCard
            key={row.key}
            row={row}
            index={index}
            total={editor.rows.length}
            referenceDate={referenceDate}
            onUpdate={(patch) => editor.update(row.key, patch)}
            onMove={(direction) => editor.move(index, direction)}
            onRemove={() => removeRow(row)}
          />)}
        </div>
        {addButton("family-add-button")}
        <footer>
          {submitError ? <p className="family-editor-error" role="alert">{submitError}</p> : null}
          {confirmingClose ? <>
            <p className="family-editor-footer-message" role="alert">変更を保存せずに閉じますか？</p>
            <button type="button" className="button secondary" ref={keepEditingRef} onClick={() => setConfirmingClose(false)}>編集に戻る</button>
            <button type="button" className="button danger-button" onClick={() => { dismissToast(); onClose(); }}>変更を破棄して閉じる</button>
          </> : <>
            <button type="button" className="button secondary" onClick={requestClose} disabled={saving}>キャンセル</button>
            <button type="submit" className="button primary" disabled={saving}>{saving ? <LoaderCircle className="spin" /> : <Pencil />}{saving ? "保存中" : "保存する"}</button>
          </>}
        </footer>
      </form>
    </div>
    <ToastRegion toast={toast} onDismissToast={dismissToast} />
  </div>;
}
