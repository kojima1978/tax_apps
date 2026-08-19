"use client";

import { AlertTriangle, LoaderCircle, Pencil, Plus, ShieldCheck, Trash2, X } from "lucide-react";
import { FormEvent, useState } from "react";
import { BuildingTypeField, CommaNumberInput, LandCategoryField, OwnershipFractionInput } from "@/components/form-fields";
import { fxRateFor, positionCurrencies, type FxRates } from "@/lib/fx-rates";
import { decimalToFraction, valuationNumber, yen } from "@/lib/format";
import {
  type AssetDetails,
  type BenefitAllocation,
  type Position,
  type PositionSection,
  type ValuationFormula,
  assetCategories,
  categoryLabels,
  splitBenefit,
  liabilityCategories,
  middleClassification,
  otherAssetTypeLabels,
  positionSection,
  positionSectionLabels,
} from "@/lib/portfolio-view";

/** 外貨建てで登録しうる科目。これ以外（不動産・自社株・借入金・偶発債務など）は円建てのみなので通貨欄を出さず JPY 固定にする。 */
const foreignCurrencyCategories = ["DEPOSIT", "SECURITIES", "INSURANCE", "BUSINESS_ASSETS"];
/** 評価方法を自由入力させない科目。算式名か「直接入力」を自動で焼き込む。 */
const directEntryCategories = ["PRIVATE_SHARES", "LOAN_RECEIVABLE", "COLLECTIBLES"];
/** 科目を選び直したときの既定の算式。ここに無い科目は金額を直接入力する。 */
const defaultFormulaByCategory: Record<string, ValuationFormula> = {
  SECURITIES: "STOCK", PRIVATE_SHARES: "STOCK", COLLECTIBLES: "UNIT_RATE",
  HOME_REAL_ESTATE: "LAND_ROADSIDE", REAL_ESTATE: "LAND_ROADSIDE", IDLE_REAL_ESTATE: "LAND_ROADSIDE",
};

/**
 * 本人・親族の氏名から select の選択肢を作る。既存データの自由入力値は選択肢に足して保全する。
 * 受取人欄（exemptionNote あり）では、選んだ人が法定相続人かどうかをその場で判定して表示する。
 * 非課税枠の対象かを別途チェックさせると入れ忘れに気づけないため、入力させずに判定結果だけ見せる。
 */
function PersonSelect({ label, name, value, people, legalHeirNames, exemptionNote }: { label: string; name: string; value: string; people: string[]; legalHeirNames?: ReadonlySet<string>; exemptionNote?: string }) {
  const [selected, setSelected] = useState(value);
  const options = people.includes(value) || value === "" ? people : [value, ...people];
  const isLegalHeir = legalHeirNames?.has(selected.trim()) ?? false;
  return <label>{label}<select name={name} value={selected} onChange={(event) => setSelected(event.target.value)}>
    <option value="">未選択</option>
    {options.map((person) => <option key={person} value={person}>{person}</option>)}
  </select>{people.length === 0 ? <small className="asset-detail-hint">親族関係タブに登録すると選択肢に表示されます。</small> : null}
  {exemptionNote && people.length > 0 ? <small className={`asset-detail-hint ${isLegalHeir ? "legal-heir-ok" : "warning"}`}>{selected.trim() === ""
    ? "受取人を選ぶと非課税枠の判定を表示します。"
    : isLegalHeir
      ? `法定相続人のため${exemptionNote}`
      : "法定相続人ではないため非課税枠の対象外です。親族関係タブの続柄と取得原因（相続）をご確認ください。"}</small> : null}</label>;
}

/** 受取人の選択肢。既存データの自由入力値は選択肢に足して保全する。 */
function personOptions(people: string[], value: string) {
  return people.includes(value) || value === "" ? people : [value, ...people];
}

/** 編集中の明細から受取人行の初期値を作る。配列が無ければ従来の受取人へ 1/1。 */
function allocationDefaults(details: AssetDetails, recipientKey: "beneficiary" | "retirementRecipient"): BenefitAllocation[] {
  const allocations = details.benefitAllocations;
  if (allocations && allocations.length > 0) return allocations;
  return [{ recipient: details[recipientKey] ?? "", numerator: 1, denominator: 1 }];
}

const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
/** 分数の合計を通分した整数で返す。1/3 を3人分足しても誤差が出ないようにする。 */
function fractionTotal(rows: Array<{ numerator: string; denominator: string }>) {
  const fractions = rows.map((row) => ({ numerator: Number(row.numerator) || 0, denominator: Number(row.denominator) || 0 }));
  if (fractions.some((fraction) => fraction.denominator <= 0)) return null;
  const denominator = fractions.reduce((lcm, fraction) => lcm / gcd(lcm, fraction.denominator) * fraction.denominator, 1);
  const numerator = fractions.reduce((sum, fraction) => sum + fraction.numerator * (denominator / fraction.denominator), 0);
  return { numerator, denominator };
}

type AllocationRow = { key: number; recipient: string; numerator: string; denominator: string };
/** 全行が同じ取り分か（＝分数を手で触っていない状態か）。均等割りに直してよいかの判断に使う。 */
const evenlySplit = (rows: AllocationRow[]) => rows.every((row) => row.numerator === rows[0].numerator && row.denominator === rows[0].denominator);
const evenRows = (rows: AllocationRow[]) => rows.map((row) => ({ ...row, numerator: "1", denominator: String(rows.length) }));

/**
 * 死亡保険金・死亡退職金の給付金額と、その受取人。受取人が複数のときは分数で割り振る。
 * 受取人1人のときは分数欄を出さず 1/1 として扱い、従来どおりの入力のままにする。
 */
function BenefitRecipientsField({ benefitLabel, benefitName, benefitDefault, recipientName, allocationDefaults, people, legalHeirNames, exemptionNote }: {
  benefitLabel: string; benefitName: string; benefitDefault: string; recipientName: string;
  allocationDefaults: BenefitAllocation[]; people: string[]; legalHeirNames: ReadonlySet<string>; exemptionNote: string;
}) {
  const [benefit, setBenefit] = useState(benefitDefault);
  const [rows, setRows] = useState<AllocationRow[]>(() => allocationDefaults.map((allocation, index) => ({
    key: index, recipient: allocation.recipient, numerator: String(allocation.numerator), denominator: String(allocation.denominator),
  })));
  const multiple = rows.length > 1;
  const total = fractionTotal(rows);
  const totalIsOne = total !== null && total.numerator === total.denominator;
  const benefitAmount = Number(benefit.replace(/,/g, "")) || 0;
  const amounts = splitBenefit(benefitAmount, rows.map((row) => ({ recipient: row.recipient, numerator: Number(row.numerator) || 0, denominator: Number(row.denominator) || 1 })));
  const updateRow = (key: number, patch: Partial<AllocationRow>) => setRows((current) => current.map((row) => row.key === key ? { ...row, ...patch } : row));
  const addRow = () => setRows((current) => {
    const next = [...current, { key: Math.max(...current.map((row) => row.key)) + 1, recipient: "", numerator: "1", denominator: "1" }];
    return evenlySplit(current) ? evenRows(next) : next;
  });
  const removeRow = (key: number) => setRows((current) => {
    const next = current.filter((row) => row.key !== key);
    return evenlySplit(current) ? evenRows(next) : next;
  });
  return <div className="benefit-recipients wide">
    <label>{benefitLabel}<CommaNumberInput name={benefitName} defaultValue="" value={benefit} onValueChange={setBenefit} maxFractionDigits={2} placeholder="" required={false} /></label>
    <div className="benefit-recipient-rows" role="group" aria-label={`${benefitLabel}の受取人`}>
      <div className="benefit-recipient-heading"><span>受取人{multiple ? "と取り分" : ""}</span><button type="button" className="button secondary" onClick={addRow}><Plus />受取人を追加</button></div>
      {rows.map((row, index) => {
        const isLegalHeir = legalHeirNames.has(row.recipient.trim());
        return <div key={row.key} className="benefit-recipient-row">
          <select aria-label={multiple ? `受取人${index + 1}` : "受取人"} name={`assetDetail.benefitAllocation.${index}.recipient`} value={row.recipient} onChange={(event) => updateRow(row.key, { recipient: event.target.value })}>
            <option value="">未選択</option>
            {personOptions(people, row.recipient).map((person) => <option key={person} value={person}>{person}</option>)}
          </select>
          {multiple ? <>
            <span className="benefit-recipient-fraction">
              <input aria-label={`受取人${index + 1}の分子`} name={`assetDetail.benefitAllocation.${index}.numerator`} inputMode="numeric" value={row.numerator} onChange={(event) => updateRow(row.key, { numerator: event.target.value.replace(/[^0-9]/g, "") })} />
              <strong aria-hidden="true">／</strong>
              <input aria-label={`受取人${index + 1}の分母`} name={`assetDetail.benefitAllocation.${index}.denominator`} inputMode="numeric" value={row.denominator} onChange={(event) => updateRow(row.key, { denominator: event.target.value.replace(/[^0-9]/g, "") })} />
            </span>
            <span className="benefit-recipient-amount">{benefitAmount > 0 ? yen.format(amounts[index]) : ""}</span>
            <button type="button" className="icon-button" aria-label={`受取人${index + 1}を削除`} onClick={() => removeRow(row.key)}><Trash2 /></button>
          </> : <>
            <input type="hidden" name={`assetDetail.benefitAllocation.${index}.numerator`} value="1" />
            <input type="hidden" name={`assetDetail.benefitAllocation.${index}.denominator`} value="1" />
          </>}
          <small className={`benefit-recipient-judgement ${row.recipient.trim() === "" ? "" : isLegalHeir ? "legal-heir-ok" : "warning"}`}>{row.recipient.trim() === "" ? "" : isLegalHeir ? "法定相続人" : "非課税枠の対象外"}</small>
        </div>;
      })}
      {/* 受取人が1人のときの互換用。複数受取人に対応する前の明細も同じキーを読むため、先頭の受取人を入れておく。 */}
      <input type="hidden" name={recipientName} value={rows[0]?.recipient ?? ""} />
      {people.length === 0 ? <small className="asset-detail-hint">親族関係タブに登録すると選択肢に表示されます。</small> : null}
      {multiple ? <small className={`asset-detail-hint ${totalIsOne ? "legal-heir-ok" : "warning"}`}>{total === null
        ? "分母には1以上の数を入力してください。"
        : totalIsOne
          ? `分数の合計 ${total.numerator}/${total.denominator}（= 1）`
          : `分数の合計が ${total.numerator}/${total.denominator} です。合計が1になるように入力してください。`}</small> : null}
      {people.length > 0 ? <small className="asset-detail-hint">法定相続人が受け取る分だけ{exemptionNote}</small> : null}
    </div>
  </div>;
}

function AssetSpecificFields({
  category,
  details,
  people,
  legalHeirNames,
  propertyType,
  formula,
  onPropertyTypeChange,
  landArea,
  onLandAreaChange,
  fixedAssetTaxValue,
  onFixedAssetTaxValueChange,
  ownershipNumerator,
  ownershipDenominator,
  onOwnershipNumeratorChange,
  onOwnershipDenominatorChange,
}: {
  category: string;
  details: AssetDetails;
  people: string[];
  legalHeirNames: ReadonlySet<string>;
  propertyType: string;
  formula: ValuationFormula;
  onPropertyTypeChange: (value: string) => void;
  landArea: string;
  onLandAreaChange: (value: string) => void;
  fixedAssetTaxValue: string;
  onFixedAssetTaxValueChange: (value: string) => void;
  ownershipNumerator: string;
  ownershipDenominator: string;
  onOwnershipNumeratorChange: (value: string) => void;
  onOwnershipDenominatorChange: (value: string) => void;
}) {
  if (category === "DEPOSIT") return <fieldset key={category} className="asset-detail-fieldset full"><legend>預金の情報</legend><div className="asset-detail-grid">
    <label>預金種類<select name="assetDetail.accountType" defaultValue={details.accountType ?? "ORDINARY"}><option value="ORDINARY">普通預金</option><option value="TIME">定期預金</option><option value="FOREIGN">外貨預金</option><option value="OTHER">その他</option></select></label>
    <label>支店名<input name="assetDetail.branchName" defaultValue={details.branchName ?? ""} /></label>
    <label>口座識別（下4桁）<input name="assetDetail.accountSuffix" inputMode="numeric" maxLength={4} pattern="[0-9]{0,4}" defaultValue={details.accountSuffix ?? ""} /></label>
    <label>満期日<input name="assetDetail.maturityDate" type="date" defaultValue={details.maturityDate ?? ""} /></label>
  </div></fieldset>;

  if (category === "SECURITIES") return <fieldset key={category} className="asset-detail-fieldset full"><legend>有価証券の情報</legend><div className="asset-detail-grid">
    <label>証券種類<select name="assetDetail.securityType" defaultValue={details.securityType ?? "LISTED_STOCK"}><option value="LISTED_STOCK">上場株式</option><option value="BOND">債券</option><option value="FUND">投資信託</option><option value="ETF">ETF</option><option value="OTHER">その他</option></select></label>
    <label>銘柄コード<input name="assetDetail.securityCode" defaultValue={details.securityCode ?? ""} /></label>
  </div></fieldset>;

  if (["HOME_REAL_ESTATE", "REAL_ESTATE", "IDLE_REAL_ESTATE"].includes(category)) return <fieldset key={category} className="asset-detail-fieldset full"><legend>不動産の基本情報</legend><div className="asset-detail-grid">
    <label>資産区分<select name="assetDetail.propertyType" value={propertyType} onChange={(event) => onPropertyTypeChange(event.target.value)}><option value="LAND">土地</option><option value="BUILDING">建物</option></select></label>
    <label className="wide">所在地<input name="assetDetail.propertyAddress" required defaultValue={details.propertyAddress ?? ""} /></label>
    {propertyType === "LAND" ? <>
      <LandCategoryField defaultValue={details.landCategory ?? ""} />
      <label>面積（㎡）<CommaNumberInput name="landArea" defaultValue="" value={landArea} onValueChange={onLandAreaChange} maxFractionDigits={4} placeholder="" positive required={formula === "LAND_ROADSIDE"} /></label>
      <label className="wide">小規模宅地等の特例（概算）<select name="assetDetail.smallLotType" defaultValue={details.smallLotType ?? ""}><option value="">適用しない</option><option value="RESIDENTIAL">特定居住用宅地（80%・限度330㎡）</option><option value="BUSINESS">特定事業用宅地（80%・限度400㎡）</option><option value="RENTAL">貸付事業用宅地（50%・限度200㎡）</option></select><small className="asset-detail-hint">選択すると相続税の概算計算で減額割合を反映します（限度面積を超える分は按分）。要件充足の可否は別途ご確認ください。</small></label>
    </> : <>
      <BuildingTypeField defaultValue={details.buildingType ?? ""} />
      <label>構造<select name="assetDetail.buildingStructure" defaultValue={details.buildingStructure ?? ""}><option value="">未選択</option><option value="WOOD">木造</option><option value="STEEL">鉄骨造</option><option value="RC">鉄筋コンクリート造</option><option value="SRC">鉄骨鉄筋コンクリート造</option><option value="OTHER">その他</option></select></label>
      <label>床面積（㎡）<CommaNumberInput name="assetDetail.floorArea" defaultValue={details.floorArea ?? ""} maxFractionDigits={4} placeholder="" positive required={false} /></label>
    </>}
    <label>固定資産税評価額<CommaNumberInput name="fixedAssetTaxValue" defaultValue="" value={fixedAssetTaxValue} onValueChange={onFixedAssetTaxValueChange} maxFractionDigits={2} placeholder="" positive required={formula === "LAND_MULTIPLIER" || formula === "BUILDING"} /></label>
    <OwnershipFractionInput numerator={ownershipNumerator} denominator={ownershipDenominator} onNumeratorChange={onOwnershipNumeratorChange} onDenominatorChange={onOwnershipDenominatorChange} />
  </div><p className="asset-detail-note">土地と建物は別明細で登録します。面積・固定資産税評価額・持分は、選択した評価方法へ自動反映されます。</p></fieldset>;

  if (category === "BUSINESS_ASSETS") return <fieldset key={category} className="asset-detail-fieldset full"><legend>事業用資産の情報</legend><div className="asset-detail-grid">
    <label>資産種類<select name="assetDetail.businessAssetType" defaultValue={details.businessAssetType ?? "EQUIPMENT"}><option value="EQUIPMENT">機械・設備</option><option value="VEHICLE">車両</option><option value="GOODWILL">営業権</option><option value="INVENTORY">棚卸資産</option><option value="OTHER">その他</option></select></label>
    <label>事業・屋号<input name="assetDetail.businessName" defaultValue={details.businessName ?? ""} /></label>
    <label>保管・所在場所<input name="assetDetail.storageLocation" defaultValue={details.storageLocation ?? ""} /></label>
  </div></fieldset>;

  if (category === "INSURANCE") return <fieldset key={category} className="asset-detail-fieldset full"><legend>生命保険の情報</legend><div className="asset-detail-grid">
    <label>保険種類<select name="assetDetail.insuranceType" defaultValue={details.insuranceType ?? "WHOLE_LIFE"}><option value="WHOLE_LIFE">終身保険</option><option value="TERM">定期保険</option><option value="ENDOWMENT">養老保険</option><option value="ANNUITY">個人年金保険</option><option value="OTHER">その他</option></select></label>
    <label>証券番号<input name="assetDetail.policyNumber" defaultValue={details.policyNumber ?? ""} placeholder="例：1234567890" /><small className="asset-detail-hint">明細一覧の「所在地・金融機関等」に表示します。</small></label>
    <PersonSelect label="被保険者" name="assetDetail.insuredPerson" value={details.insuredPerson ?? ""} people={people} />
    <BenefitRecipientsField benefitLabel="死亡保険金" benefitName="assetDetail.deathBenefit" benefitDefault={String(details.deathBenefit ?? "")} recipientName="assetDetail.beneficiary" allocationDefaults={allocationDefaults(details, "beneficiary")} people={people} legalHeirNames={legalHeirNames} exemptionNote="非課税枠（500万円 × 法定相続人数）の対象です。" />
  </div></fieldset>;

  if (category === "RETIREMENT_ALLOWANCE") return <fieldset key={category} className="asset-detail-fieldset full"><legend>退職金の情報</legend><div className="asset-detail-grid">
    <label>制度種類<select name="assetDetail.retirementType" defaultValue={details.retirementType ?? "SMALL_ENTERPRISE"}><option value="SMALL_ENTERPRISE">小規模企業共済</option><option value="CORPORATE">中小企業退職金共済</option><option value="OFFICER">役員退職金</option><option value="EMPLOYEE">従業員退職金</option><option value="OTHER">その他</option></select></label>
    <BenefitRecipientsField benefitLabel="死亡退職金" benefitName="assetDetail.retirementAllowance" benefitDefault={String(details.retirementAllowance ?? "")} recipientName="assetDetail.retirementRecipient" allocationDefaults={allocationDefaults(details, "retirementRecipient")} people={people} legalHeirNames={legalHeirNames} exemptionNote="非課税枠（500万円 × 法定相続人数・生命保険金とは別枠）の対象です。" />
  </div><p className="asset-detail-note">円換算時価には、生存中に解約した場合の解約返戻金（解約手当金）を入力します。死亡退職金は相続税の概算にだけ反映し、資産合計には含めません。</p></fieldset>;

  if (category === "COLLECTIBLES") return <fieldset key={category} className="asset-detail-fieldset full"><legend>その他資産の情報</legend><div className="asset-detail-grid">
    <label>資産種類<select name="assetDetail.otherAssetType" defaultValue={details.otherAssetType ?? "PRECIOUS_METAL"}>{Object.entries(otherAssetTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><small className="asset-detail-hint">明細一覧の「所在地・金融機関等」に表示します。</small></label>
  </div></fieldset>;

  return null;
}

export function PositionModal({ position, people, legalHeirNames, fxRates, onClose, onSubmit, saving }: { position: Position | null; people: string[]; legalHeirNames: ReadonlySet<string>; fxRates: FxRates; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; saving: boolean }) {
  const assetDetails = position?.assetDetails ?? {};
  const [fallbackOwnershipNumerator, fallbackOwnershipDenominator] = decimalToFraction(position?.ownershipShare ?? null);
  const [section, setSection] = useState<PositionSection>(position ? positionSection(position) : "ASSET");
  const [category, setCategory] = useState(position?.category ?? "DEPOSIT");
  const [currency, setCurrency] = useState(foreignCurrencyCategories.includes(position?.category ?? "") ? position?.currency ?? "JPY" : "JPY");
  // 自社株も直接入力を選べるので、保存済みの評価方法をそのまま開く。新規追加時の既定は changeCategory 側で決める。
  const [formula, setFormula] = useState<ValuationFormula>(position?.valuationFormula ?? "MANUAL");
  const [quantity, setQuantity] = useState(position?.valuationQuantity === null || position?.valuationQuantity === undefined ? "" : String(position.valuationQuantity));
  const [unitPrice, setUnitPrice] = useState(position?.valuationUnitPrice === null || position?.valuationUnitPrice === undefined ? "" : String(position.valuationUnitPrice));
  const [adjustmentRate, setAdjustmentRate] = useState(position?.adjustmentRate === null || position?.adjustmentRate === undefined ? "1.0" : String(position.adjustmentRate));
  const [landArea, setLandArea] = useState(position?.landArea === null || position?.landArea === undefined ? "" : String(position.landArea));
  const [roadsideValue, setRoadsideValue] = useState(position?.roadsideValue === null || position?.roadsideValue === undefined ? "" : String(position.roadsideValue));
  const [fixedAssetTaxValue, setFixedAssetTaxValue] = useState(position?.fixedAssetTaxValue === null || position?.fixedAssetTaxValue === undefined ? "" : String(position.fixedAssetTaxValue));
  const [valuationMultiplier, setValuationMultiplier] = useState(position?.valuationMultiplier === null || position?.valuationMultiplier === undefined ? "" : String(position.valuationMultiplier));
  const [ownershipNumerator, setOwnershipNumerator] = useState(String(position?.ownershipNumerator ?? fallbackOwnershipNumerator));
  const [ownershipDenominator, setOwnershipDenominator] = useState(String(position?.ownershipDenominator ?? fallbackOwnershipDenominator));
  const [propertyType, setPropertyType] = useState(assetDetails.propertyType ?? (position?.valuationFormula === "BUILDING" ? "BUILDING" : "LAND"));
  // 生命保険は契約名を持たせず、保険会社を明細の名称として使う。
  const [institution, setInstitution] = useState(position?.institution ?? "");

  function changeSection(nextSection: PositionSection) {
    setSection(nextSection);
    setCategory(nextSection === "ASSET" ? "DEPOSIT" : nextSection === "LIABILITY" ? "LOAN_OTHER" : "GUARANTEE");
    setFormula("MANUAL");
  }

  function changeCategory(nextCategory: string) {
    setCategory(nextCategory);
    if (!foreignCurrencyCategories.includes(nextCategory)) setCurrency("JPY");
    if (["HOME_REAL_ESTATE", "REAL_ESTATE", "IDLE_REAL_ESTATE"].includes(nextCategory)) setPropertyType("LAND");
    setFormula(defaultFormulaByCategory[nextCategory] ?? "MANUAL");
  }

  function changePropertyType(nextPropertyType: string) {
    setPropertyType(nextPropertyType);
    setFormula(nextPropertyType === "BUILDING" ? "BUILDING" : "LAND_ROADSIDE");
  }

  const isEditing = position !== null;
  const categories = section === "ASSET" ? assetCategories : section === "LIABILITY" ? liabilityCategories : ["GUARANTEE"];
  const isStockCategory = ["SECURITIES", "PRIVATE_SHARES"].includes(category);
  const isPrivateShares = category === "PRIVATE_SHARES";
  const isJpyOnly = !foreignCurrencyCategories.includes(category);
  const isDirectEntry = directEntryCategories.includes(category);
  const isUnitRateCategory = category === "COLLECTIBLES";
  const isRealEstateCategory = ["HOME_REAL_ESTATE", "REAL_ESTATE", "IDLE_REAL_ESTATE"].includes(category);
  const isInsurance = category === "INSURANCE";
  const nameLabel = category === "SECURITIES" ? "銘柄名" : category === "PRIVATE_SHARES" ? "会社名" : category === "LOAN_RECEIVABLE" ? "貸付金名" : category === "COLLECTIBLES" ? "資産名" : category === "RETIREMENT_ALLOWANCE" ? "制度名・契約名" : "名称";
  const institutionLabel = category === "DEPOSIT" ? "金融機関" : category === "SECURITIES" ? "証券会社・金融機関" : category === "INSURANCE" ? "保険会社" : category === "RETIREMENT_ALLOWANCE" ? "支給元・勤務先" : section === "ASSET" ? null : "金融機関・債権者";
  const amountLabel = section === "LIABILITY" ? "借入残高" : section === "CONTINGENT" ? "保証金額" : category === "DEPOSIT" ? "残高" : category === "INSURANCE" || category === "RETIREMENT_ALLOWANCE" ? "解約返戻金" : category === "LOAN_RECEIVABLE" ? "貸付金残高" : category === "COLLECTIBLES" ? "評価額" : isPrivateShares ? (formula === "STOCK" ? "評価額（自動計算）" : "評価額（直接入力）") : isJpyOnly ? "評価額" : "通貨建て金額";
  const numericValue = (value: string) => Number(value) || 0;
  const ownershipDisplay = `${ownershipNumerator || "—"} / ${ownershipDenominator || "—"}`;
  const ownershipRatio = numericValue(ownershipDenominator) > 0 ? numericValue(ownershipNumerator) / numericValue(ownershipDenominator) : 0;
  let calculatedAmount = 0;
  if (formula === "STOCK") calculatedAmount = numericValue(quantity) * numericValue(unitPrice) * numericValue(adjustmentRate);
  if (formula === "UNIT_RATE") calculatedAmount = numericValue(unitPrice) * numericValue(adjustmentRate);
  if (formula === "LAND_ROADSIDE") calculatedAmount = numericValue(landArea) * numericValue(roadsideValue) * numericValue(adjustmentRate) * ownershipRatio;
  if (formula === "LAND_MULTIPLIER" || formula === "BUILDING") calculatedAmount = numericValue(fixedAssetTaxValue) * numericValue(valuationMultiplier) * numericValue(adjustmentRate) * ownershipRatio;
  calculatedAmount = Math.round(calculatedAmount * 100) / 100;
  const isCalculated = formula !== "MANUAL";
  // 円換算レートは明細ではなく年度設定で持つ。未登録の外貨は登録できないよう保存ボタンを止める。
  const fxRate = fxRateFor(fxRates, currency);
  const calculatedJpy = Math.round(calculatedAmount * (fxRate ?? 0));
  const formulaLabel = formula === "STOCK" ? "株数・口数×単価×調整率" : formula === "UNIT_RATE" ? "単価×調整率" : formula === "LAND_ROADSIDE" ? "土地・路線価方式" : formula === "LAND_MULTIPLIER" ? "土地・倍率方式" : formula === "BUILDING" ? "建物・固定資産税評価額方式" : "手動入力";
  // 算式で計算する場合はその算式名、円建てで直接入力する科目は「直接入力」（一括登録の表と同じ表記）を評価方法として固定する。
  const fixedValuationMethod = isCalculated ? formulaLabel : isDirectEntry ? "直接入力" : null;
  const formulaExpression = formula === "STOCK" ? "株数・口数 × 単価 × 調整率" : formula === "UNIT_RATE" ? "単価 × 調整率" : formula === "LAND_ROADSIDE" ? "面積 × 路線価 × 調整率 × 持分（分子 ÷ 分母）" : formula === "LAND_MULTIPLIER" || formula === "BUILDING" ? "固定資産税評価額 × 倍率 × 調整率 × 持分（分子 ÷ 分母）" : "";

  return <div className="modal-layer" role="presentation"><div className="modal position-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <header><div><p className="eyebrow">{isEditing ? "EDIT POSITION" : "NEW POSITION"}</p><h2 id="modal-title">{isEditing ? "明細を修正" : "明細を追加"}</h2></div><button className="icon-button" aria-label="閉じる" onClick={onClose}><X /></button></header>
    <form onSubmit={onSubmit}>
      <input type="hidden" name="side" value={section === "ASSET" ? "ASSET" : "LIABILITY"} />
      <fieldset className="classification-fieldset"><legend>登録する区分</legend><div className="segment three-segment"><label><input type="radio" name="entrySection" value="ASSET" checked={section === "ASSET"} onChange={() => changeSection("ASSET")} /><span>資産の部</span></label><label><input type="radio" name="entrySection" value="LIABILITY" checked={section === "LIABILITY"} onChange={() => changeSection("LIABILITY")} /><span>負債の部</span></label><label><input type="radio" name="entrySection" value="CONTINGENT" checked={section === "CONTINGENT"} onChange={() => changeSection("CONTINGENT")} /><span>偶発債務の部</span></label></div></fieldset>
      {section === "ASSET" ? <p className="personal-owner-note"><ShieldCheck />オーナー本人が直接所有する個人資産を登録します。</p> : null}
      {section === "CONTINGENT" ? <p className="contingent-form-note"><AlertTriangle />偶発債務はB/S外として登録し、純資産の計算には含めません。</p> : null}
      <div className="form-grid">
        <label>科目<select name="category" value={category} onChange={(event) => changeCategory(event.target.value)} required>{categories.map((key) => <option key={key} value={key}>{categoryLabels[key]}</option>)}</select></label>
        {isInsurance
          ? <input type="hidden" name="name" value={institution} />
          : <label>{nameLabel}<input name="name" required placeholder={category === "SECURITIES" ? "例：○○株式会社" : category === "PRIVATE_SHARES" ? "例：山田産業株式会社" : ""} defaultValue={position?.name ?? ""} /></label>}
        {institutionLabel ? <label>{institutionLabel}{isInsurance ? <span className="required-mark">必須</span> : null}<input name="institution" required={isInsurance} value={institution} onChange={(event) => setInstitution(event.target.value)} placeholder={isInsurance ? "例：日本生命" : ""} />{isInsurance ? <small className="asset-detail-hint">明細の「科目・名称」にはこの保険会社名を表示します。</small> : null}</label> : <input type="hidden" name="institution" value="" />}
        {isJpyOnly
          ? <input type="hidden" name="currency" value="JPY" />
          : <label>通貨<select name="currency" value={currency} onChange={(event) => setCurrency(event.target.value)}>{positionCurrencies.map((code) => <option key={code} value={code}>{code}</option>)}</select>{currency === "JPY" ? null : <small className={fxRate === null ? "asset-detail-hint warning" : "asset-detail-hint"}>{fxRate === null ? "この通貨の円換算レートが年度設定に未登録です。年度設定で登録してください。" : `年度設定の円換算レート 1 ${currency} = ${fxRate.toLocaleString("ja-JP", { maximumFractionDigits: 6 })} 円`}</small>}</label>}
        {section === "ASSET" ? <AssetSpecificFields
          category={category}
          details={assetDetails}
          people={people}
          legalHeirNames={legalHeirNames}
          propertyType={propertyType}
          formula={formula}
          onPropertyTypeChange={changePropertyType}
          landArea={landArea}
          onLandAreaChange={setLandArea}
          fixedAssetTaxValue={fixedAssetTaxValue}
          onFixedAssetTaxValueChange={setFixedAssetTaxValue}
          ownershipNumerator={ownershipNumerator}
          ownershipDenominator={ownershipDenominator}
          onOwnershipNumeratorChange={setOwnershipNumerator}
          onOwnershipDenominatorChange={setOwnershipDenominator}
        /> : null}
        {isStockCategory || isRealEstateCategory || isUnitRateCategory ? <fieldset className="valuation-formula-fieldset full"><legend>{isPrivateShares ? "評価額の自動計算" : "評価額の計算方法"}</legend>{isPrivateShares ? <><input type="hidden" name="valuationFormula" value={formula} /><label className="valuation-formula-check"><input type="checkbox" checked={formula === "STOCK"} onChange={(event) => setFormula(event.target.checked ? "STOCK" : "MANUAL")} /><span><strong>株数・単価から自動計算する</strong><small>外すと「評価額（直接入力）」に金額をそのまま入力できます。</small></span></label></> : <select name="valuationFormula" aria-label="評価額の計算方法" value={formula} onChange={(event) => setFormula(event.target.value as ValuationFormula)}>{isUnitRateCategory ? <option value="UNIT_RATE">単価×調整率</option> : null}<option value="MANUAL">金額を直接入力</option>{isStockCategory ? <option value="STOCK">株数・口数から計算</option> : null}{isRealEstateCategory && propertyType === "LAND" ? <><option value="LAND_ROADSIDE">路線価方式</option><option value="LAND_MULTIPLIER">倍率方式</option></> : null}{isRealEstateCategory && propertyType === "BUILDING" ? <option value="BUILDING">固定資産税評価額方式</option> : null}</select>}{formulaExpression ? <p className="valuation-formula-expression">{formulaExpression}</p> : null}
          {formula === "STOCK" ? <div className="valuation-calculation-grid stock-formula"><label>株数・口数<CommaNumberInput name="valuationQuantity" defaultValue="" value={quantity} onValueChange={setQuantity} maxFractionDigits={6} placeholder="例：10,000" positive /></label><span aria-hidden="true">×</span><label>単価<CommaNumberInput name="valuationUnitPrice" defaultValue="" value={unitPrice} onValueChange={setUnitPrice} maxFractionDigits={2} placeholder="例：2,500" positive /></label><span aria-hidden="true">×</span><label>調整率<CommaNumberInput name="adjustmentRate" defaultValue="" value={adjustmentRate} onValueChange={setAdjustmentRate} maxFractionDigits={2} placeholder="例：1.0" positive /></label></div> : null}
          {formula === "UNIT_RATE" ? <div className="valuation-calculation-grid real-estate-method-inputs"><label>単価<CommaNumberInput name="valuationUnitPrice" defaultValue="" value={unitPrice} onValueChange={setUnitPrice} maxFractionDigits={2} placeholder="例：3,000,000" positive /></label><span aria-hidden="true">×</span><label>調整率<CommaNumberInput name="adjustmentRate" defaultValue="" value={adjustmentRate} onValueChange={setAdjustmentRate} maxFractionDigits={2} placeholder="例：1.0" positive /></label></div> : null}
          {formula === "LAND_ROADSIDE" ? <><div className="valuation-source-summary"><span>基本情報から使用</span><dl><div><dt>面積</dt><dd>{landArea ? `${valuationNumber.format(numericValue(landArea))}㎡` : "未入力"}</dd></div><div><dt>持分</dt><dd>{ownershipDisplay}</dd></div></dl></div><div className="valuation-calculation-grid real-estate-method-inputs"><label>路線価（円/㎡）<CommaNumberInput name="roadsideValue" defaultValue="" value={roadsideValue} onValueChange={setRoadsideValue} maxFractionDigits={2} placeholder="" positive /></label><span aria-hidden="true">×</span><label>調整率<CommaNumberInput name="adjustmentRate" defaultValue="" value={adjustmentRate} onValueChange={setAdjustmentRate} maxFractionDigits={2} placeholder="" positive /></label></div></> : null}
          {formula === "LAND_MULTIPLIER" || formula === "BUILDING" ? <><div className="valuation-source-summary"><span>基本情報から使用</span><dl><div><dt>固定資産税評価額</dt><dd>{fixedAssetTaxValue ? yen.format(numericValue(fixedAssetTaxValue)) : "未入力"}</dd></div><div><dt>持分</dt><dd>{ownershipDisplay}</dd></div></dl></div><div className="valuation-calculation-grid real-estate-method-inputs"><label>倍率<CommaNumberInput name="valuationMultiplier" defaultValue="" value={valuationMultiplier} onValueChange={setValuationMultiplier} maxFractionDigits={6} placeholder="" positive /></label><span aria-hidden="true">×</span><label>調整率<CommaNumberInput name="adjustmentRate" defaultValue="" value={adjustmentRate} onValueChange={setAdjustmentRate} maxFractionDigits={2} placeholder="" positive /></label></div></> : null}
          {/* 円建ての科目は通貨表記と円換算見込を出さずに金額1行だけにする。 */}
          {isCalculated ? <div className="valuation-result" aria-live="polite"><span>算式による評価額</span><strong>{calculatedAmount.toLocaleString("ja-JP", { maximumFractionDigits: 2 })}{currency === "JPY" ? "" : ` ${currency}`}</strong>{currency === "JPY" || fxRate === null ? null : <small>円換算見込 {yen.format(calculatedJpy)}</small>}</div> : null}
        </fieldset> : <input type="hidden" name="valuationFormula" value="MANUAL" />}
        <label>{amountLabel}<CommaNumberInput key={formula} name="originalAmount" defaultValue={isCalculated ? "" : position?.originalAmount ?? ""} value={isCalculated ? String(calculatedAmount) : undefined} maxFractionDigits={2} placeholder="" readOnly={isCalculated} hint={isCalculated ? "上の算式から自動計算されます" : undefined} /></label>
        {fixedValuationMethod !== null ? <input type="hidden" name="valuationMethod" value={fixedValuationMethod} /> : <label>評価方法<input name="valuationMethod" defaultValue={position?.valuationMethod ?? "手動入力"} /></label>}
        <label className="full">メモ<textarea name="note" rows={3} placeholder="評価日、根拠資料など" defaultValue={position?.note ?? ""} /></label>
      </div>
      <footer><button type="button" className="button secondary" onClick={onClose}>キャンセル</button><button type="submit" className="button primary" disabled={saving || fxRate === null}>{saving ? <LoaderCircle className="spin" /> : isEditing ? <Pencil /> : <Plus />}{isEditing ? "保存する" : "登録する"}</button></footer>
    </form>
  </div></div>;
}

export function DeletePositionModal({ position, onClose, onDelete, saving }: { position: Position; onClose: () => void; onDelete: () => void; saving: boolean }) {
  return <div className="modal-layer" role="presentation"><div className="modal delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-modal-title" aria-describedby="delete-modal-description"><header><div><p className="eyebrow danger-eyebrow">DELETE POSITION</p><h2 id="delete-modal-title">この明細を削除しますか？</h2></div><button className="icon-button" aria-label="閉じる" onClick={onClose} disabled={saving}><X /></button></header><div className="delete-modal-body"><div className="delete-warning-icon"><AlertTriangle /></div><p id="delete-modal-description">削除すると、選択年度のB/Sから取り除かれます。この操作は取り消せません。</p><dl><div><dt>名称</dt><dd>{position.name}</dd></div><div><dt>区分</dt><dd>{positionSectionLabels[positionSection(position)]}・{middleClassification(position)}</dd></div><div><dt>円換算時価</dt><dd>{yen.format(position.valueJpy)}</dd></div></dl><footer><button type="button" className="button secondary" onClick={onClose} disabled={saving}>キャンセル</button><button type="button" className="button danger-button" onClick={onDelete} disabled={saving}>{saving ? <LoaderCircle className="spin" /> : <Trash2 />}削除する</button></footer></div></div></div>;
}
