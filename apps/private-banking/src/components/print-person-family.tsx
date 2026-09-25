import { BirthDate } from "@/components/birth-date";
import { PersonName } from "@/components/person-name";
import {
  type FamilyMember,
  ageOnDate,
  relationshipLabels,
  taxAdjustmentsFor,
} from "@/lib/family";
import type { Portfolio } from "@/lib/portfolio-view";

const fraction = (numerator: number | null, denominator: number | null) =>
  numerator === null || denominator === null ? "－" : `${numerator} / ${denominator}`;

/** 税額の加算・控除は該当の有無だけを出す。生年月日が未登録で判定できないときは「－」。 */
const applicability = (applicable: boolean | null) =>
  applicable === null ? "－" : applicable ? "該当あり" : "該当なし";

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
      <div><h2>本人・家族情報</h2></div>
    </header>

    <article className="panel print-profile-panel">
      <header><h3>本人情報</h3></header>
      <dl className="print-profile-grid">
        <div><dt>氏名</dt><dd><PersonName name={household.name} /></dd></div>
        <div><dt>生年月日</dt><dd><BirthDate value={household.birthDate} /></dd></div>
        <div><dt>年齢</dt><dd>{personAge === null ? "－" : `${personAge}歳`}</dd></div>
      </dl>
    </article>

    <article className="panel print-family-panel">
      <header><h3>家族一覧</h3><p>{relatives.length}名</p></header>
      {relatives.length === 0 ? <p className="print-family-empty">家族情報は登録されていません。</p> : <table className="print-family-table">
        <thead><tr>
          <th>氏名</th><th>続柄</th>
          <th>民法上の<br />法定相続分</th><th>税法上の<br />法定相続分</th>
          <th>生年月日</th><th>年齢</th>
          <th>2割加算</th><th>配偶者<br />税額控除</th><th>未成年者<br />控除</th><th>障害者<br />控除</th>
        </tr></thead>
        <tbody>{relatives.map((member) => {
          const age = ageOnDate(member.birthDate, referenceDate);
          const adjustments = taxAdjustmentsFor(member, members, referenceDate);
          return <tr key={member.id}>
            <td><strong><PersonName name={member.name} /></strong></td>
            <td>{relationshipLabels[member.relationship]}</td>
            <td className="numeric">{fraction(member.civilShareNumerator, member.civilShareDenominator)}</td>
            <td className="numeric">{fraction(member.taxShareNumerator, member.taxShareDenominator)}</td>
            <td><BirthDate value={member.birthDate} /></td>
            <td className="numeric">{age === null ? "－" : `${age}歳`}</td>
            <td className="applicability">{applicability(adjustments.specialTaxAddition)}</td>
            <td className="applicability">{applicability(adjustments.spouseCredit)}</td>
            <td className="applicability">{applicability(adjustments.minorCredit)}</td>
            <td className="applicability">{applicability(adjustments.disabilityCredit)}</td>
          </tr>;
        })}</tbody>
      </table>}
      {relatives.length === 0 ? null : <p className="print-family-note">2割加算と配偶者税額控除は概算税額に反映しています。未成年者控除・障害者控除は反映していません。</p>}
    </article>
  </section>;
}
