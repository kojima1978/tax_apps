"use client";

import { ArrowDown, ArrowUp, Calculator, LoaderCircle, Pencil, Plus, Trash2, UsersRound, X } from "lucide-react";
import { FormEvent, useState } from "react";
import {
  type FamilyMember,
  type FamilyMemberDraft,
  acquisitionReasonLabels,
  acquisitionReasonOptions,
  ageOnDate,
  disabilityLabels,
  disabilityOptions,
  legalShareFor,
  relativeRelationshipOptions,
  relationshipLabels,
} from "@/lib/family";

type EditRow = FamilyMemberDraft & { key: string };

const emptyRow = (sortOrder: number): EditRow => ({
  key: `new-${Date.now()}-${sortOrder}`,
  name: "",
  nameKana: "",
  relationship: "CHILD",
  acquisitionReason: "INHERITANCE",
  civilShareNumerator: null,
  civilShareDenominator: null,
  taxShareNumerator: null,
  taxShareDenominator: null,
  specialTaxAddition: false,
  disabilityCategory: "NONE",
  birthDate: null,
  note: "",
  sortOrder,
});

const fraction = (numerator: number | null, denominator: number | null) =>
  numerator === null || denominator === null ? "－" : `${numerator} / ${denominator}`;

const birthDateJa = (value: string | null) => value
  ? new Intl.DateTimeFormat("ja-JP", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`))
  : "－";

function normalizeRows(members: FamilyMember[]): EditRow[] {
  const rows: EditRow[] = members
    .filter((member) => member.relationship !== "SELF")
    .map((member) => ({ ...member, key: `member-${member.id}` }));
  return rows.map((row, index) => ({ ...row, sortOrder: index }));
}

export function FamilyView({
  members,
  referenceDate,
  saving,
  onSave,
}: {
  members: FamilyMember[];
  referenceDate: string;
  saving: boolean;
  onSave: (members: FamilyMemberDraft[]) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [rows, setRows] = useState<EditRow[]>([]);
  const [submitError, setSubmitError] = useState("");
  const relatives = members.filter((member) => member.relationship !== "SELF");

  const openEditor = () => {
    setRows(normalizeRows(members));
    setSubmitError("");
    setEditing(true);
  };

  const updateRow = (key: string, patch: Partial<EditRow>) => {
    setRows((current) => current.map((row) => row.key === key ? { ...row, ...patch } : row));
  };

  const moveRow = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    setRows((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((row, sortOrder) => ({ ...row, sortOrder }));
    });
  };

  const calculateShares = () => {
    setRows((current) => current.map((row) => {
      const calculated = row.acquisitionReason === "INHERITANCE" ? legalShareFor(row, current) : null;
      return {
        ...row,
        civilShareNumerator: calculated?.numerator ?? null,
        civilShareDenominator: calculated?.denominator ?? null,
        taxShareNumerator: calculated?.numerator ?? null,
        taxShareDenominator: calculated?.denominator ?? null,
      };
    }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError("");
    try {
      await onSave(rows.map((editableRow, sortOrder) => {
        const { key, ...row } = editableRow;
        void key;
        return { ...row, note: "", sortOrder };
      }));
      setEditing(false);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "家族情報を保存できませんでした。");
    }
  };

  return <>
    <section className="page-heading detail-page-heading">
      <div>
        <p className="eyebrow">FAMILY RELATIONSHIP</p>
        <h2>親族関係</h2>
        <p>相続人の構成と法定相続分を管理します。年齢はB/S基準日時点です。</p>
      </div>
      <div className="page-heading-actions">
        <button type="button" className="button primary" onClick={openEditor}><Pencil />家族情報を編集</button>
      </div>
    </section>

    <section className="panel family-panel" aria-labelledby="family-list-title">
      <header className="panel-header">
        <div><h3 id="family-list-title">家族一覧</h3><p>{relatives.length > 0 ? `${relatives.length}名を登録済み` : "家族情報はまだ登録されていません"}</p></div>
        <UsersRound aria-hidden="true" />
      </header>
      {relatives.length === 0 ? (
        <div className="family-empty">
          <UsersRound />
          <strong>家族情報を登録してください</strong>
          <p>配偶者・子などを登録すると、相続税計算の家族構成にも反映されます。</p>
          <button type="button" className="button secondary" onClick={openEditor}><Plus />登録を始める</button>
        </div>
      ) : (
        <div className="family-table-scroll">
          <table className="family-table">
            <thead><tr>
              <th>氏名</th><th>フリガナ</th><th>続柄</th><th>取得原因</th>
              <th>民法上の<br />法定相続分</th><th>税法上の<br />法定相続分</th>
              <th>2割加算</th><th>障害者</th><th>生年月日</th><th>年齢</th>
            </tr></thead>
            <tbody>{relatives.map((member) => {
              const age = ageOnDate(member.birthDate, referenceDate);
              return <tr key={member.id}>
                <td data-label="氏名"><strong>{member.name}</strong></td>
                <td data-label="フリガナ">{member.nameKana || "－"}</td>
                <td data-label="続柄"><span className="family-relation">{relationshipLabels[member.relationship]}</span></td>
                <td data-label="取得原因">{acquisitionReasonLabels[member.acquisitionReason]}</td>
                <td data-label="民法上の法定相続分" className="family-fraction">{fraction(member.civilShareNumerator, member.civilShareDenominator)}</td>
                <td data-label="税法上の法定相続分" className="family-fraction">{fraction(member.taxShareNumerator, member.taxShareDenominator)}</td>
                <td data-label="2割加算">{member.specialTaxAddition ? "対象" : "－"}</td>
                <td data-label="障害者">{disabilityLabels[member.disabilityCategory]}</td>
                <td data-label="生年月日">{birthDateJa(member.birthDate)}</td>
                <td data-label="年齢">{age === null ? "－" : `${age}歳`}</td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      )}
    </section>

    {editing ? (
      <div className="modal-layer" role="presentation">
        <div className="modal family-editor-modal" role="dialog" aria-modal="true" aria-labelledby="family-editor-title">
          <header>
            <div><p className="eyebrow">FAMILY INFORMATION</p><h2 id="family-editor-title">家族情報の入力</h2></div>
            <button type="button" className="icon-button" aria-label="閉じる" onClick={() => setEditing(false)} disabled={saving}><X /></button>
          </header>
          <form onSubmit={submit}>
            <div className="family-editor-toolbar">
              <p>法定相続分は手入力できます。自動計算後も必要に応じて修正してください。</p>
              <button type="button" className="button secondary" onClick={calculateShares}><Calculator />法定相続分を自動計算</button>
            </div>
            {submitError ? <p className="family-editor-error" role="alert">{submitError}</p> : null}
            <div className="family-editor-table-scroll">
              <table className="family-editor-table">
                <thead><tr>
                  <th>行</th>
                  <th>氏名<span className="required-mark">必須</span></th>
                  <th>フリガナ</th>
                  <th>続柄<span className="required-mark">必須</span></th>
                  <th>取得原因<span className="required-mark">必須</span></th>
                  <th>民法上の<br />法定相続分</th>
                  <th>税法上の<br />法定相続分</th>
                  <th>2割加算</th>
                  <th>障害者</th>
                  <th>生年月日</th>
                  <th>削除</th>
                </tr></thead>
                <tbody>{rows.map((row, index) => <tr key={row.key}>
                  <td data-label="行・並び順">
                    <div className="family-order-cell">
                      <strong>{index + 1}</strong>
                      <button type="button" className="row-action order-action" title="上へ移動" aria-label={`${index + 1}行目を上へ`} disabled={index === 0} onClick={() => moveRow(index, -1)}><ArrowUp /></button>
                      <button type="button" className="row-action order-action" title="下へ移動" aria-label={`${index + 1}行目を下へ`} disabled={index === rows.length - 1} onClick={() => moveRow(index, 1)}><ArrowDown /></button>
                    </div>
                  </td>
                  <td data-label="氏名（必須）"><label><span className="sr-only">{index + 1}行目の氏名</span><input required maxLength={100} value={row.name} placeholder="氏名" onChange={(event) => updateRow(row.key, { name: event.target.value })} /></label></td>
                  <td data-label="フリガナ"><label><span className="sr-only">{index + 1}行目のフリガナ</span><input maxLength={100} value={row.nameKana} placeholder="フリガナ" onChange={(event) => updateRow(row.key, { nameKana: event.target.value })} /></label></td>
                  <td data-label="続柄（必須）"><label><span className="sr-only">{index + 1}行目の続柄</span><select required value={row.relationship} onChange={(event) => updateRow(row.key, { relationship: event.target.value as EditRow["relationship"] })}>{relativeRelationshipOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label></td>
                  <td data-label="取得原因（必須）"><label><span className="sr-only">{index + 1}行目の取得原因</span><select required value={row.acquisitionReason} onChange={(event) => updateRow(row.key, { acquisitionReason: event.target.value as EditRow["acquisitionReason"] })}>{acquisitionReasonOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label></td>
                  <td data-label="民法上の法定相続分">
                    <div className="family-fraction-input">
                      <label><span className="sr-only">{index + 1}行目の民法上の法定相続分の分子</span><input type="number" min="0" step="1" inputMode="numeric" value={row.civilShareNumerator ?? ""} onChange={(event) => updateRow(row.key, { civilShareNumerator: event.target.value === "" ? null : Number(event.target.value) })} /></label>
                      <b aria-hidden="true">/</b>
                      <label><span className="sr-only">{index + 1}行目の民法上の法定相続分の分母</span><input type="number" min="1" step="1" inputMode="numeric" value={row.civilShareDenominator ?? ""} onChange={(event) => updateRow(row.key, { civilShareDenominator: event.target.value === "" ? null : Number(event.target.value) })} /></label>
                    </div>
                  </td>
                  <td data-label="税法上の法定相続分">
                    <div className="family-fraction-input">
                      <label><span className="sr-only">{index + 1}行目の税法上の法定相続分の分子</span><input type="number" min="0" step="1" inputMode="numeric" value={row.taxShareNumerator ?? ""} onChange={(event) => updateRow(row.key, { taxShareNumerator: event.target.value === "" ? null : Number(event.target.value) })} /></label>
                      <b aria-hidden="true">/</b>
                      <label><span className="sr-only">{index + 1}行目の税法上の法定相続分の分母</span><input type="number" min="1" step="1" inputMode="numeric" value={row.taxShareDenominator ?? ""} onChange={(event) => updateRow(row.key, { taxShareDenominator: event.target.value === "" ? null : Number(event.target.value) })} /></label>
                    </div>
                  </td>
                  <td data-label="2割加算"><label><span className="sr-only">{index + 1}行目の2割加算</span><select value={String(row.specialTaxAddition)} onChange={(event) => updateRow(row.key, { specialTaxAddition: event.target.value === "true" })}><option value="false">対象外</option><option value="true">対象</option></select></label></td>
                  <td data-label="障害者"><label><span className="sr-only">{index + 1}行目の障害者区分</span><select value={row.disabilityCategory} onChange={(event) => updateRow(row.key, { disabilityCategory: event.target.value as EditRow["disabilityCategory"] })}>{disabilityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label></td>
                  <td data-label="生年月日"><label><span className="sr-only">{index + 1}行目の生年月日</span><input type="date" value={row.birthDate ?? ""} onChange={(event) => updateRow(row.key, { birthDate: event.target.value || null })} /></label></td>
                  <td data-label="削除"><button type="button" className="row-action danger" title="削除" aria-label={`${index + 1}行目を削除`} onClick={() => setRows((current) => current.filter((item) => item.key !== row.key).map((item, sortOrder) => ({ ...item, sortOrder })))}><Trash2 /></button></td>
                </tr>)}</tbody>
              </table>
            </div>
            <button type="button" className="family-add-button" disabled={rows.length >= 20} onClick={() => setRows((current) => [...current, emptyRow(current.length)])}><Plus />家族を追加</button>
            <footer>
              <button type="button" className="button secondary" onClick={() => setEditing(false)} disabled={saving}>キャンセル</button>
              <button type="submit" className="button primary" disabled={saving}>{saving ? <LoaderCircle className="spin" /> : <Pencil />}{saving ? "保存中" : "保存する"}</button>
            </footer>
          </form>
        </div>
      </div>
    ) : null}
  </>;
}
