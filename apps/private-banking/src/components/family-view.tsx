"use client";

import { Pencil, Plus, UsersRound } from "lucide-react";
import { useState } from "react";
import { FamilyEditorModal } from "@/components/family-editor-modal";
import { dateJa, dateWareki } from "@/lib/format";
import {
  type FamilyMember,
  type FamilyMemberDraft,
  acquisitionReasonLabels,
  ageOnDate,
  disabilityLabels,
  relationshipLabels,
} from "@/lib/family";

const fraction = (numerator: number | null, denominator: number | null) =>
  numerator === null || denominator === null ? "－" : `${numerator} / ${denominator}`;

/** 生年月日と年齢のセル。列幅が限られるので、和暦は西暦の下に小さく添える。 */
function BirthDateCell({ value, age }: { value: string | null; age: number | null }) {
  if (!value) return <>－</>;
  return <div className="family-cell-stack"><span className="birth-date-gregorian">{dateJa(value)}{age === null ? "" : `（${age}歳）`}</span><small className="birth-date-wareki">{dateWareki(value)}</small></div>;
}

/** 税額の加算・控除に関わる区分。該当するものだけを並べる。 */
const taxAdjustmentLabel = (member: FamilyMember) =>
  [member.specialTaxAddition ? "2割加算" : "", member.disabilityCategory === "NONE" ? "" : disabilityLabels[member.disabilityCategory]].filter(Boolean).join("・") || "－";

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
  const relatives = members.filter((member) => member.relationship !== "SELF");
  const openEditor = () => setEditing(true);

  return <>
    <section className="page-heading detail-page-heading">
      <div>
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
            {/* 横スクロールを出さないよう、関係の深い項目は1つのセルにまとめて7列にしている。 */}
            <thead><tr>
              <th>氏名</th><th>続柄</th><th>取得原因</th>
              <th>民法上の<br />法定相続分</th><th>税法上の<br />法定相続分</th>
              <th>税額の<br />加算・控除</th><th>生年月日・年齢</th>
            </tr></thead>
            <tbody>{relatives.map((member) => {
              const age = ageOnDate(member.birthDate, referenceDate);
              return <tr key={member.id}>
                <td data-label="氏名"><div className="family-cell-stack">{member.nameKana ? <small className="family-kana">{member.nameKana}</small> : null}<strong>{member.name}</strong></div></td>
                <td data-label="続柄"><span className="family-relation">{relationshipLabels[member.relationship]}</span></td>
                <td data-label="取得原因">{acquisitionReasonLabels[member.acquisitionReason]}</td>
                <td data-label="民法上の法定相続分" className="family-fraction">{fraction(member.civilShareNumerator, member.civilShareDenominator)}</td>
                <td data-label="税法上の法定相続分" className="family-fraction">{fraction(member.taxShareNumerator, member.taxShareDenominator)}</td>
                <td data-label="税額の加算・控除">{taxAdjustmentLabel(member)}</td>
                <td data-label="生年月日・年齢"><BirthDateCell value={member.birthDate} age={age} /></td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      )}
    </section>

    {editing ? <FamilyEditorModal members={members} referenceDate={referenceDate} saving={saving} onSave={onSave} onClose={() => setEditing(false)} /> : null}
  </>;
}
