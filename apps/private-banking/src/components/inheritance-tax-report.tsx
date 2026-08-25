import { AlertTriangle, Calculator, LoaderCircle, RefreshCw, ShieldCheck, Users } from "lucide-react";
import { legalHeirRoster } from "@/lib/family";
import { compactYen, dateJa } from "@/lib/format";
import type { InheritanceTaxCalculation } from "@/lib/inheritance-tax-calculation";
import { fiscalYearLabel, totals, type Portfolio, type Snapshot } from "@/lib/portfolio-view";

type HeirCalculation = InheritanceTaxCalculation["heirs"][number];

const yen = (value: number) => (value === 0 ? "0円" : compactYen(value));

// 受取人別内訳の列。2割加算・配偶者の税額軽減・みなし相続財産は使わない構成も多く、
// 常に出すと横幅だけ食うので optional にして「誰かに金額がある列」だけ表示する。
const heirColumns: Array<{
  key: string;
  label: string;
  optional?: boolean;
  emphasis?: boolean;
  value: (heir: HeirCalculation) => number;
}> = [
  { key: "acquisition", label: "取得額", value: (heir) => heir.acquisitionAmountJpy },
  { key: "deemed", label: "うち保険金・退職金", optional: true, value: (heir) => heir.deemedTaxableJpy },
  { key: "proportional", label: "按分税額", value: (heir) => heir.proportionalTaxJpy },
  { key: "surcharge", label: "2割加算", optional: true, value: (heir) => heir.surchargeAmountJpy },
  { key: "spouseDeduction", label: "配偶者の税額軽減", optional: true, value: (heir) => heir.spouseDeductionJpy },
  { key: "final", label: "納付税額", emphasis: true, value: (heir) => heir.finalTaxJpy },
];

function MoneyRow({
  label,
  value,
  operator,
  emphasis,
  note,
}: {
  label: string;
  value: number;
  operator?: "−" | "＋" | "＝";
  emphasis?: "subtotal" | "total";
  note?: string;
}) {
  return <div className={`tax-calc-money-row ${emphasis ?? ""}`}>
    <span className="tax-calc-operator">{operator ?? ""}</span>
    <span>{label}{note ? <small className="tax-calc-row-note">{note}</small> : null}</span>
    <strong>{value === 0 ? "0円" : compactYen(value)}</strong>
  </div>;
}

/**
 * 誰がいくら取得し、いくら納めるかの内訳。
 * 死亡保険金・死亡退職金は遺産分割の対象ではなく受取人固有の権利なので受取人へ帰属させ、
 * 残りの財産を法定相続分で按分している。取得割合が変わると配偶者の税額軽減も変わるため、
 * 相続税の総額が同じでも納付税額はこの表でしか読み取れない。
 */
function HeirBreakdownTable({
  heirs,
  familyMembers,
}: {
  heirs: HeirCalculation[];
  familyMembers: Portfolio["familyMembers"];
}) {
  // 相続税APIは相続人を人数でしか持たないので、heirId の連番を親族関係タブの並びへ戻して氏名を出す。
  const roster = legalHeirRoster(familyMembers ?? []);
  const nameOf = (id: string | null) => {
    if (id === "spouse") return roster.spouseNames[0] ?? null;
    const order = Number(id?.split("-").pop());
    return Number.isInteger(order) ? roster.heirNames[order - 1] ?? null : null;
  };
  const columns = heirColumns.filter((column) => !column.optional || heirs.some((heir) => column.value(heir) > 0));
  const cell = (column: typeof heirColumns[number], value: number) =>
    <td key={column.key}>{column.emphasis ? <strong>{yen(value)}</strong> : yen(value)}</td>;

  return <article className="tax-calc-heirs">
    <h3><Users />受取人別の内訳</h3>
    <table>
      <thead>
        <tr><th scope="col">相続人</th>{columns.map((column) => <th key={column.key} scope="col">{column.label}</th>)}</tr>
      </thead>
      <tbody>
        {heirs.map((heir, index) => {
          const name = nameOf(heir.id);
          return <tr key={heir.id ?? index}>
            <th scope="row">{name ?? heir.label}{name ? <small>{heir.label}</small> : null}</th>
            {columns.map((column) => cell(column, column.value(heir)))}
          </tr>;
        })}
        {/* 取得額は各人を1万円単位で切り捨てて按分するため、合計すると課税価格の合計額に
            数万円届かないことがある。誤解を招くので、合計は納付税額の列だけ出す（計算ページと同じ扱い）。 */}
        <tr className="tax-calc-heirs-total">
          <th scope="row">合計</th>
          {columns.map((column) => (column.emphasis
            ? cell(column, heirs.reduce((sum, heir) => sum + column.value(heir), 0))
            : <td key={column.key} />))}
        </tr>
      </tbody>
    </table>
  </article>;
}

export function InheritanceTaxReport({
  household,
  snapshot,
  planning,
  familyMembers,
  calculation,
  onRecalculate,
  recalculating,
}: {
  household: Portfolio["household"];
  snapshot: Snapshot;
  planning: Portfolio["planning"];
  familyMembers: Portfolio["familyMembers"];
  calculation: InheritanceTaxCalculation;
  onRecalculate?: () => void;
  recalculating?: boolean;
}) {
  const currentTotals = totals(snapshot.positions);
  const familyChanged = calculation.familyComposition.hasSpouse !== planning.hasSpouse
    || calculation.familyComposition.selectedRank !== planning.heirRank
    || calculation.familyComposition.heirCount !== (planning.heirRank === "none" ? 0 : planning.heirCount);
  const balanceChanged = currentTotals.assets !== calculation.source.totalAssetsJpy
    || currentTotals.liabilities !== calculation.source.deductibleLiabilitiesJpy;
  const isStale = familyChanged || balanceChanged;
  const smallLotReduction = calculation.source.smallLotReductionJpy ?? 0;
  const spouseDeduction = calculation.heirs.reduce((sum, heir) => sum + heir.spouseDeductionJpy, 0);
  const surcharge = calculation.heirs.reduce((sum, heir) => sum + heir.surchargeAmountJpy, 0);
  // 受取人へ帰属させた課税対象のみなし相続財産。0なら全額が法定相続分の按分対象なので、按分の内訳行は出さない。
  const deemedAttributed = calculation.heirs.reduce((sum, heir) => sum + heir.deemedTaxableJpy, 0);
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

    {isStale ? <p className="tax-calc-stale" role="alert"><AlertTriangle /><span>計算後にB/Sまたは家族情報が変更されています。最新条件で再計算してください。</span>{onRecalculate ? <button type="button" className="tax-calc-recalc" onClick={onRecalculate} disabled={recalculating}>{recalculating ? <LoaderCircle className="spin" /> : <RefreshCw />}{recalculating ? "再計算中" : "再計算"}</button> : null}</p> : null}

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
          {smallLotReduction > 0 ? <MoneyRow label="小規模宅地等の特例（概算）" value={smallLotReduction} operator="−" /> : null}
          {calculation.insuranceSurrenderValueJpy > 0 ? <MoneyRow label="生命保険の解約返戻金" value={calculation.insuranceSurrenderValueJpy} operator="−" /> : null}
          {calculation.insuranceDeathBenefitJpy > 0 ? <MoneyRow label="死亡保険金" value={calculation.insuranceDeathBenefitJpy} operator="＋" /> : null}
          {calculation.insuranceNonTaxableAmountJpy > 0 ? <MoneyRow label="死亡保険金の非課税額" value={calculation.insuranceNonTaxableAmountJpy} operator="−" /> : null}
          {calculation.retirementSurrenderValueJpy > 0 ? <MoneyRow label="退職金の解約返戻金" value={calculation.retirementSurrenderValueJpy} operator="−" /> : null}
          {calculation.retirementDeathBenefitJpy > 0 ? <MoneyRow label="死亡退職金" value={calculation.retirementDeathBenefitJpy} operator="＋" /> : null}
          {calculation.retirementNonTaxableAmountJpy > 0 ? <MoneyRow label="死亡退職金の非課税額" value={calculation.retirementNonTaxableAmountJpy} operator="−" /> : null}
          <MoneyRow label="相続税計算上の遺産額" value={calculation.estateValueJpy} operator="＝" emphasis="subtotal" />
          {deemedAttributed > 0 ? <MoneyRow label="うち法定相続分で按分する財産" value={calculation.divisibleEstateJpy} note="残りは受取人へ帰属" /> : null}
          <MoneyRow label="基礎控除額" value={calculation.basicDeductionJpy} operator="−" />
          <MoneyRow label="課税遺産総額" value={calculation.taxableEstateJpy} operator="＝" emphasis="subtotal" />
          <MoneyRow label="相続税の総額" value={calculation.totalTaxBeforeDeductionsJpy} note={`実効税率 ${calculation.effectiveTaxRateBeforeDeductions.toFixed(1)}%`} />
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
          {calculation.retirementDeathBenefitJpy > 0 ? <li><strong>死亡退職金の非課税額</strong><p>500万円 × 法定相続人 {calculation.legalHeirCount}人 ＝ {compactYen(calculation.retirementNonTaxableLimitJpy)}（対象退職金が上限）。生命保険金とは別枠で適用します。</p></li> : null}
          <li><strong>基礎控除額</strong><p>3,000万円 ＋ 600万円 × {calculation.legalHeirCount}人 ＝ {compactYen(calculation.basicDeductionJpy)}。</p></li>
          <li><strong>相続税の総額</strong><p>課税遺産総額を法定相続分で按分し、各法定取得額に速算税率を適用して合計。</p></li>
          <li><strong>税額の軽減・加算</strong><p>取得額に応じて按分し、配偶者の税額軽減と兄弟姉妹等の2割加算を反映。</p></li>
        </ol>
        <div className="tax-calc-assumptions">
          <strong>概算に含めていない主な項目</strong>
          <p>{smallLotReduction > 0 ? "葬式費用、生前贈与加算、未成年者・障害者控除、相次相続控除、外国税額控除（小規模宅地等の特例は選択宅地に概算適用）" : "小規模宅地等の特例、葬式費用、生前贈与加算、未成年者・障害者控除、相次相続控除、外国税額控除"}</p>
        </div>
      </article>
    </div>

    {calculation.heirs.length > 0 ? <HeirBreakdownTable heirs={calculation.heirs} familyMembers={familyMembers} /> : null}

    <footer className="tax-calc-notes">
      <p>※ {calculation.warnings.join(" ")}</p>
      <p>適用ルール基準日：{dateJa(calculation.taxRuleAsOf)}／本資料は申告税額を確定するものではありません。</p>
    </footer>
  </section>;
}
