import {
  type FamilyMember,
  ageOnDate,
  disabilityLabels,
  relationshipLabels,
} from "@/lib/family";
import { dateJa } from "@/lib/format";
import type { Portfolio } from "@/lib/portfolio-view";

const fraction = (numerator: number | null, denominator: number | null) =>
  numerator === null || denominator === null ? "－" : `${numerator} / ${denominator}`;

export function PersonFamilyPrintView({
  household,
  members,
  referenceDate,
}: {
  household: Portfolio["household"];
  members: FamilyMember[];
  referenceDate: string;
}) {
  const personAge = ageOnDate(household.birthDate, referenceDate);
  const relatives = members.filter((member) => member.relationship !== "SELF");

  return <section className="print-person-family-section">
    <header className="detail-page-heading">
      <div><p className="eyebrow">PERSONAL &amp; FAMILY INFORMATION</p><h2>本人・家族情報</h2></div>
    </header>

    <article className="panel print-profile-panel">
      <header><h3>本人情報</h3></header>
      <dl className="print-profile-grid">
        <div><dt>氏名</dt><dd>{household.name}</dd></div>
        <div><dt>生年月日</dt><dd>{household.birthDate ? dateJa(household.birthDate) : "－"}</dd></div>
        <div><dt>年齢</dt><dd>{personAge === null ? "－" : `${personAge}歳`}</dd></div>
      </dl>
    </article>

    <article className="panel print-family-panel">
      <header><h3>家族一覧</h3><p>{relatives.length}名</p></header>
      {relatives.length === 0 ? <p className="print-family-empty">家族情報は登録されていません。</p> : <table className="print-family-table">
        <thead><tr>
          <th>氏名</th><th>続柄</th>
          <th>民法上の<br />法定相続分</th><th>税法上の<br />法定相続分</th>
          <th>2割加算</th><th>障害者</th><th>生年月日</th><th>年齢</th>
        </tr></thead>
        <tbody>{relatives.map((member) => {
          const age = ageOnDate(member.birthDate, referenceDate);
          return <tr key={member.id}>
            <td><strong>{member.name}</strong></td>
            <td>{relationshipLabels[member.relationship]}</td>
            <td className="numeric">{fraction(member.civilShareNumerator, member.civilShareDenominator)}</td>
            <td className="numeric">{fraction(member.taxShareNumerator, member.taxShareDenominator)}</td>
            <td>{member.specialTaxAddition ? "対象" : "－"}</td>
            <td>{disabilityLabels[member.disabilityCategory]}</td>
            <td>{member.birthDate ? dateJa(member.birthDate) : "－"}</td>
            <td>{age === null ? "－" : `${age}歳`}</td>
          </tr>;
        })}</tbody>
      </table>}
    </article>
  </section>;
}
