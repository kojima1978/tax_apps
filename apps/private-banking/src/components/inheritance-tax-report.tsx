import { AlertTriangle, Calculator, ShieldCheck } from "lucide-react";
import { compactYen, dateJa } from "@/lib/format";
import type { InheritanceTaxCalculation } from "@/lib/inheritance-tax-calculation";
import { fiscalYearLabel, totals, type Portfolio, type Snapshot } from "@/lib/portfolio-view";

const rate = new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 1 });

function MoneyRow({
  label,
  value,
  operator,
  emphasis,
}: {
  label: string;
  value: number;
  operator?: "−" | "＋" | "＝";
  emphasis?: "subtotal" | "total";
}) {
  return <div className={`tax-calc-money-row ${emphasis ?? ""}`}>
    <span className="tax-calc-operator">{operator ?? ""}</span>
    <span>{label}</span>
    <strong>{value === 0 ? "0円" : compactYen(value)}</strong>
  </div>;
}

type GroupedHeir = InheritanceTaxCalculation["heirs"][number] & { labels: string[] };

function groupHeirs(heirs: InheritanceTaxCalculation["heirs"]): GroupedHeir[] {
  const groups = new Map<string, GroupedHeir>();
  for (const heir of heirs) {
    const key = [
      heir.type,
      heir.legalShareRatio,
      heir.legalShareAmountJpy,
      heir.taxOnLegalShareJpy,
      heir.acquisitionAmountJpy,
      heir.proportionalTaxJpy,
      heir.surchargeAmountJpy,
      heir.spouseDeductionJpy,
      heir.finalTaxJpy,
    ].join(":");
    const existing = groups.get(key);
    if (existing) {
      existing.labels.push(heir.label);
      existing.legalShareRatio += heir.legalShareRatio;
      existing.legalShareAmountJpy += heir.legalShareAmountJpy;
      existing.taxOnLegalShareJpy += heir.taxOnLegalShareJpy;
      existing.acquisitionAmountJpy += heir.acquisitionAmountJpy;
      existing.proportionalTaxJpy += heir.proportionalTaxJpy;
      existing.surchargeAmountJpy += heir.surchargeAmountJpy;
      existing.taxBeforeDeductionsJpy += heir.taxBeforeDeductionsJpy;
      existing.spouseDeductionJpy += heir.spouseDeductionJpy;
      existing.finalTaxJpy += heir.finalTaxJpy;
    }
    else groups.set(key, { ...heir, labels: [heir.label] });
  }
  return [...groups.values()];
}

function groupedLabel(group: GroupedHeir) {
  if (group.labels.length <= 2) return group.labels.join("・");
  const first = group.labels[0];
  const last = group.labels[group.labels.length - 1];
  const base = first.replace(/\d+$/, "");
  return base && last.startsWith(base)
    ? `${first}〜${last.slice(base.length)}（${group.labels.length}人）`
    : `${first}ほか${group.labels.length - 1}人`;
}

export function InheritanceTaxReport({
  household,
  snapshot,
  planning,
  calculation,
}: {
  household: Portfolio["household"];
  snapshot: Snapshot;
  planning: Portfolio["planning"];
  calculation: InheritanceTaxCalculation;
}) {
  const currentTotals = totals(snapshot.positions);
  const familyChanged = calculation.familyComposition.hasSpouse !== planning.hasSpouse
    || calculation.familyComposition.selectedRank !== planning.heirRank
    || calculation.familyComposition.heirCount !== (planning.heirRank === "none" ? 0 : planning.heirCount);
  const balanceChanged = currentTotals.assets !== calculation.source.totalAssetsJpy
    || currentTotals.liabilities !== calculation.source.deductibleLiabilitiesJpy;
  const isStale = familyChanged || balanceChanged;
  const spouseDeduction = calculation.heirs.reduce((sum, heir) => sum + heir.spouseDeductionJpy, 0);
  const surcharge = calculation.heirs.reduce((sum, heir) => sum + heir.surchargeAmountJpy, 0);
  const groupedHeirs = groupHeirs(calculation.heirs);
  const calculatedAt = new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeStyle: "short" })
    .format(new Date(calculation.calculatedAt));

  return <section className="inheritance-tax-report" aria-labelledby="inheritance-tax-report-title">
    <header className="inheritance-tax-report-heading">
      <div>
        <p className="eyebrow">INHERITANCE TAX ESTIMATE</p>
        <h2 id="inheritance-tax-report-title">相続税の概算</h2>
      </div>
      <dl>
        <div><dt>対象</dt><dd>{household.name}</dd></div>
        <div><dt>年度</dt><dd>{fiscalYearLabel(snapshot)}</dd></div>
        <div><dt>計算日時</dt><dd>{calculatedAt}</dd></div>
        <div><dt>計算ルール</dt><dd>{calculation.calculationVersion}</dd></div>
      </dl>
    </header>

    {isStale ? <p className="tax-calc-stale" role="alert"><AlertTriangle />計算後にB/Sまたは家族情報が変更されています。最新条件で再計算してください。</p> : null}

    <div className="tax-calc-columns">
      <article className="tax-calc-statement">
        <h3><Calculator />概算計算</h3>
        <div className="tax-calc-money-list">
          <MoneyRow label="金融資産" value={calculation.source.financialAssetsJpy} />
          <MoneyRow label="不動産" value={calculation.source.realEstateJpy} />
          <MoneyRow label="事業用資産" value={calculation.source.businessAssetsJpy} />
          <MoneyRow label="その他資産" value={calculation.source.otherAssetsJpy} />
          <MoneyRow label="財産評価額 合計" value={calculation.source.totalAssetsJpy} operator="＝" emphasis="subtotal" />
          <MoneyRow label="債務" value={calculation.source.deductibleLiabilitiesJpy} operator="−" />
          <MoneyRow label="B/S基準の正味財産" value={calculation.source.estimatedNetEstateJpy} operator="＝" emphasis="subtotal" />
          {calculation.insuranceSurrenderValueJpy > 0 ? <MoneyRow label="生命保険の解約返戻金" value={calculation.insuranceSurrenderValueJpy} operator="−" /> : null}
          {calculation.insuranceDeathBenefitJpy > 0 ? <MoneyRow label="死亡保険金" value={calculation.insuranceDeathBenefitJpy} operator="＋" /> : null}
          {calculation.insuranceNonTaxableAmountJpy > 0 ? <MoneyRow label="死亡保険金の非課税額" value={calculation.insuranceNonTaxableAmountJpy} operator="−" /> : null}
          <MoneyRow label="相続税計算上の遺産額" value={calculation.estateValueJpy} operator="＝" emphasis="subtotal" />
          <MoneyRow label="基礎控除額" value={calculation.basicDeductionJpy} operator="−" />
          <MoneyRow label="課税遺産総額" value={calculation.taxableEstateJpy} operator="＝" emphasis="subtotal" />
          <MoneyRow label="相続税の総額" value={calculation.totalTaxBeforeDeductionsJpy} />
          {surcharge > 0 ? <MoneyRow label="相続税額の2割加算" value={surcharge} operator="＋" /> : null}
          {spouseDeduction > 0 ? <MoneyRow label="配偶者の税額軽減" value={spouseDeduction} operator="−" /> : null}
          <MoneyRow label="相続税の納付税額（概算）" value={calculation.totalInheritanceTaxJpy} operator="＝" emphasis="total" />
        </div>
      </article>

      <article className="tax-calc-basis">
        <h3><ShieldCheck />計算根拠</h3>
        <ol>
          <li><strong>財産評価額と債務</strong><p>現在年度のB/S登録額を使用。個人保証などB/S外債務は控除していません。</p></li>
          <li><strong>生命保険金の非課税額</strong><p>500万円 × 法定相続人 {calculation.legalHeirCount}人 ＝ {compactYen(calculation.insuranceNonTaxableLimitJpy)}（対象保険金が上限）。</p></li>
          <li><strong>基礎控除額</strong><p>3,000万円 ＋ 600万円 × {calculation.legalHeirCount}人 ＝ {compactYen(calculation.basicDeductionJpy)}。</p></li>
          <li><strong>相続税の総額</strong><p>課税遺産総額を法定相続分で按分し、各法定取得額に速算税率を適用して合計。</p></li>
          <li><strong>税額の軽減・加算</strong><p>取得額に応じて按分し、配偶者の税額軽減と兄弟姉妹等の2割加算を反映。</p></li>
        </ol>
        <div className="tax-calc-assumptions">
          <strong>概算に含めていない主な項目</strong>
          <p>小規模宅地等の特例、葬式費用、生前贈与加算、未成年者・障害者控除、相次相続控除、外国税額控除</p>
        </div>
      </article>
    </div>

    <article className="tax-calc-heirs">
      <h3>相続人別 税額内訳</h3>
      {groupedHeirs.length === 0 ? <p className="tax-calc-no-tax">基礎控除以下のため、相続税は発生しない概算です。</p> : <table>
        <thead><tr><th>相続人</th><th>法定相続分</th><th>法定取得額</th><th>算出税額</th><th>想定取得額</th><th>按分税額</th><th>加算／軽減</th><th>納付税額</th></tr></thead>
        <tbody>{groupedHeirs.map((heir) => <tr key={`${heir.type}-${heir.legalShareRatio}-${heir.labels[0]}`}>
          <th>{groupedLabel(heir)}</th>
          <td>{rate.format(heir.legalShareRatio * 100)}%</td>
          <td>{compactYen(heir.legalShareAmountJpy)}</td>
          <td>{compactYen(heir.taxOnLegalShareJpy)}</td>
          <td>{compactYen(heir.acquisitionAmountJpy)}</td>
          <td>{compactYen(heir.proportionalTaxJpy)}</td>
          <td>{heir.surchargeAmountJpy > 0 ? `＋${compactYen(heir.surchargeAmountJpy)}` : heir.spouseDeductionJpy > 0 ? `−${compactYen(heir.spouseDeductionJpy)}` : "−"}</td>
          <td><strong>{compactYen(heir.finalTaxJpy)}</strong></td>
        </tr>)}</tbody>
      </table>}
    </article>

    <footer className="tax-calc-notes">
      <p>※ {calculation.warnings.join(" ")}</p>
      <p>適用ルール基準日：{dateJa(calculation.taxRuleAsOf)}／本資料は申告税額を確定するものではありません。</p>
    </footer>
  </section>;
}
