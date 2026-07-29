"use client";

import { AlertTriangle, LoaderCircle, Pencil, Plus, ShieldCheck, Trash2, X } from "lucide-react";
import { FormEvent, useState } from "react";
import { BuildingTypeField, CommaNumberInput, LandCategoryField, OwnershipFractionInput } from "@/components/form-fields";
import { decimalToFraction, valuationNumber, yen } from "@/lib/format";
import {
  type AssetDetails,
  type Position,
  type PositionSection,
  type ValuationFormula,
  assetCategories,
  categoryLabels,
  liabilityCategories,
  middleClassification,
  positionSection,
  positionSectionLabels,
} from "@/lib/portfolio-view";

/** 本人・親族の氏名から select の選択肢を作る。既存データの自由入力値は選択肢に足して保全する。 */
function PersonSelect({ label, name, value, people }: { label: string; name: string; value: string; people: string[] }) {
  const options = people.includes(value) || value === "" ? people : [value, ...people];
  return <label>{label}<select name={name} defaultValue={value}>
    <option value="">未選択</option>
    {options.map((person) => <option key={person} value={person}>{person}</option>)}
  </select>{people.length === 0 ? <small className="asset-detail-hint">親族関係タブに登録すると選択肢に表示されます。</small> : null}</label>;
}

function AssetSpecificFields({
  category,
  details,
  people,
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
    <label>評価日<input name="assetDetail.valuationDate" type="date" defaultValue={details.valuationDate ?? ""} /></label>
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
    <label>評価日<input name="assetDetail.valuationDate" type="date" defaultValue={details.valuationDate ?? ""} /></label>
  </div><p className="asset-detail-note">土地と建物は別明細で登録します。面積・固定資産税評価額・持分は、選択した評価方法へ自動反映されます。</p></fieldset>;

  if (category === "BUSINESS_ASSETS") return <fieldset key={category} className="asset-detail-fieldset full"><legend>事業用資産の情報</legend><div className="asset-detail-grid">
    <label>資産種類<select name="assetDetail.businessAssetType" defaultValue={details.businessAssetType ?? "EQUIPMENT"}><option value="EQUIPMENT">機械・設備</option><option value="VEHICLE">車両</option><option value="GOODWILL">営業権</option><option value="INVENTORY">棚卸資産</option><option value="OTHER">その他</option></select></label>
    <label>事業・屋号<input name="assetDetail.businessName" defaultValue={details.businessName ?? ""} /></label>
    <label>保管・所在場所<input name="assetDetail.storageLocation" defaultValue={details.storageLocation ?? ""} /></label>
    <label>評価日<input name="assetDetail.valuationDate" type="date" defaultValue={details.valuationDate ?? ""} /></label>
  </div></fieldset>;

  if (category === "LOAN_RECEIVABLE") return <fieldset key={category} className="asset-detail-fieldset full"><legend>貸付金の情報</legend><div className="asset-detail-grid">
    <label>借主<input name="assetDetail.borrower" required defaultValue={details.borrower ?? ""} /></label>
    <label>貸付日<input name="assetDetail.loanDate" type="date" defaultValue={details.loanDate ?? ""} /></label>
    <label>返済期限<input name="assetDetail.dueDate" type="date" defaultValue={details.dueDate ?? ""} /></label>
    <label>金利（%）<CommaNumberInput name="assetDetail.interestRate" defaultValue={details.interestRate ?? ""} maxFractionDigits={3} placeholder="" required={false} /></label>
    <label>回収可能性<select name="assetDetail.collectibility" defaultValue={details.collectibility ?? "NORMAL"}><option value="NORMAL">正常</option><option value="CAUTION">要注意</option><option value="DIFFICULT">回収困難</option></select></label>
  </div></fieldset>;

  if (category === "INSURANCE") return <fieldset key={category} className="asset-detail-fieldset full"><legend>生命保険の情報</legend><div className="asset-detail-grid">
    <label>保険種類<select name="assetDetail.insuranceType" defaultValue={details.insuranceType ?? "WHOLE_LIFE"}><option value="WHOLE_LIFE">終身保険</option><option value="TERM">定期保険</option><option value="ENDOWMENT">養老保険</option><option value="ANNUITY">個人年金保険</option><option value="OTHER">その他</option></select></label>
    <PersonSelect label="被保険者" name="assetDetail.insuredPerson" value={details.insuredPerson ?? ""} people={people} />
    <PersonSelect label="受取人" name="assetDetail.beneficiary" value={details.beneficiary ?? ""} people={people} />
    <label>死亡保険金<CommaNumberInput name="assetDetail.deathBenefit" defaultValue={details.deathBenefit ?? ""} maxFractionDigits={2} placeholder="" required={false} /></label>
    <label className="insurance-exemption-check wide">
      <input name="assetDetail.beneficiaryIsLegalHeir" type="checkbox" value="true" defaultChecked={details.beneficiaryIsLegalHeir === true} />
      <span><strong>非課税枠の対象</strong><small>受取人が法定相続人の場合に選択してください。死亡保険金の非課税限度額は「500万円 × 法定相続人数」です。</small></span>
    </label>
    <label>評価日<input name="assetDetail.valuationDate" type="date" defaultValue={details.valuationDate ?? ""} /></label>
  </div></fieldset>;

  if (category === "COLLECTIBLES") return <fieldset key={category} className="asset-detail-fieldset full"><legend>その他資産の情報</legend><div className="asset-detail-grid">
    <label>資産種類<select name="assetDetail.otherAssetType" defaultValue={details.otherAssetType ?? "PRECIOUS_METAL"}><option value="PRECIOUS_METAL">金・貴金属</option><option value="ART">美術品</option><option value="WATCH">時計</option><option value="VEHICLE">車両</option><option value="MEMBERSHIP">会員権</option><option value="CRYPTO">暗号資産</option><option value="OTHER">その他</option></select></label>
    <label>保管場所<input name="assetDetail.storageLocation" defaultValue={details.storageLocation ?? ""} /></label>
    <label>評価日<input name="assetDetail.valuationDate" type="date" defaultValue={details.valuationDate ?? ""} /></label>
  </div></fieldset>;

  return null;
}

export function PositionModal({ position, people, onClose, onSubmit, saving }: { position: Position | null; people: string[]; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; saving: boolean }) {
  const assetDetails = position?.assetDetails ?? {};
  const [fallbackOwnershipNumerator, fallbackOwnershipDenominator] = decimalToFraction(position?.ownershipShare ?? null);
  const [section, setSection] = useState<PositionSection>(position ? positionSection(position) : "ASSET");
  const [category, setCategory] = useState(position?.category ?? "DEPOSIT");
  const [currency, setCurrency] = useState(position?.category === "PRIVATE_SHARES" ? "JPY" : position?.currency ?? "JPY");
  const [formula, setFormula] = useState<ValuationFormula>(position?.category === "PRIVATE_SHARES" ? "STOCK" : position?.valuationFormula ?? "MANUAL");
  const [quantity, setQuantity] = useState(position?.valuationQuantity === null || position?.valuationQuantity === undefined ? "" : String(position.valuationQuantity));
  const [unitPrice, setUnitPrice] = useState(position?.valuationUnitPrice === null || position?.valuationUnitPrice === undefined ? "" : String(position.valuationUnitPrice));
  const [adjustmentRate, setAdjustmentRate] = useState(position?.adjustmentRate === null || position?.adjustmentRate === undefined ? "1.0" : String(position.adjustmentRate));
  const [landArea, setLandArea] = useState(position?.landArea === null || position?.landArea === undefined ? "" : String(position.landArea));
  const [roadsideValue, setRoadsideValue] = useState(position?.roadsideValue === null || position?.roadsideValue === undefined ? "" : String(position.roadsideValue));
  const [fixedAssetTaxValue, setFixedAssetTaxValue] = useState(position?.fixedAssetTaxValue === null || position?.fixedAssetTaxValue === undefined ? "" : String(position.fixedAssetTaxValue));
  const [valuationMultiplier, setValuationMultiplier] = useState(position?.valuationMultiplier === null || position?.valuationMultiplier === undefined ? "" : String(position.valuationMultiplier));
  const [ownershipNumerator, setOwnershipNumerator] = useState(String(position?.ownershipNumerator ?? fallbackOwnershipNumerator));
  const [ownershipDenominator, setOwnershipDenominator] = useState(String(position?.ownershipDenominator ?? fallbackOwnershipDenominator));
  const [fxRate, setFxRate] = useState(String(position?.fxRate ?? 1));
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
    if (nextCategory === "PRIVATE_SHARES") {
      setCurrency("JPY");
      setFxRate("1");
      setFormula("STOCK");
    }
    else if (nextCategory === "SECURITIES") setFormula("STOCK");
    else if (["HOME_REAL_ESTATE", "REAL_ESTATE", "IDLE_REAL_ESTATE"].includes(nextCategory)) {
      setPropertyType("LAND");
      setFormula("LAND_ROADSIDE");
    }
    else setFormula("MANUAL");
  }

  function changePropertyType(nextPropertyType: string) {
    setPropertyType(nextPropertyType);
    setFormula(nextPropertyType === "BUILDING" ? "BUILDING" : "LAND_ROADSIDE");
  }

  const isEditing = position !== null;
  const categories = section === "ASSET" ? assetCategories : section === "LIABILITY" ? liabilityCategories : ["GUARANTEE"];
  const isStockCategory = ["SECURITIES", "PRIVATE_SHARES"].includes(category);
  const isPrivateShares = category === "PRIVATE_SHARES";
  const isRealEstateCategory = ["HOME_REAL_ESTATE", "REAL_ESTATE", "IDLE_REAL_ESTATE"].includes(category);
  const isInsurance = category === "INSURANCE";
  const nameLabel = category === "SECURITIES" ? "銘柄名" : category === "PRIVATE_SHARES" ? "会社名" : category === "LOAN_RECEIVABLE" ? "貸付金名" : category === "COLLECTIBLES" ? "資産名" : "名称";
  const institutionLabel = category === "DEPOSIT" ? "金融機関" : category === "SECURITIES" ? "証券会社・金融機関" : category === "INSURANCE" ? "保険会社" : section === "ASSET" ? null : "金融機関・債権者";
  const amountLabel = category === "DEPOSIT" ? "残高" : category === "INSURANCE" ? "解約返戻金" : category === "LOAN_RECEIVABLE" ? "貸付金残高" : isPrivateShares ? "評価額" : "通貨建て金額";
  const numericValue = (value: string) => Number(value) || 0;
  const ownershipDisplay = `${ownershipNumerator || "—"} / ${ownershipDenominator || "—"}`;
  const ownershipRatio = numericValue(ownershipDenominator) > 0 ? numericValue(ownershipNumerator) / numericValue(ownershipDenominator) : 0;
  let calculatedAmount = 0;
  if (formula === "STOCK") calculatedAmount = numericValue(quantity) * numericValue(unitPrice) * numericValue(adjustmentRate);
  if (formula === "LAND_ROADSIDE") calculatedAmount = numericValue(landArea) * numericValue(roadsideValue) * numericValue(adjustmentRate) * ownershipRatio;
  if (formula === "LAND_MULTIPLIER" || formula === "BUILDING") calculatedAmount = numericValue(fixedAssetTaxValue) * numericValue(valuationMultiplier) * numericValue(adjustmentRate) * ownershipRatio;
  calculatedAmount = Math.round(calculatedAmount * 100) / 100;
  const isCalculated = formula !== "MANUAL";
  const calculatedJpy = Math.round(calculatedAmount * numericValue(fxRate));
  const formulaLabel = formula === "STOCK" ? "株数・口数×単価×調整率" : formula === "LAND_ROADSIDE" ? "土地・路線価方式" : formula === "LAND_MULTIPLIER" ? "土地・倍率方式" : formula === "BUILDING" ? "建物・固定資産税評価額方式" : "手動入力";
  const formulaExpression = formula === "STOCK" ? "株数・口数 × 単価 × 調整率" : formula === "LAND_ROADSIDE" ? "面積 × 路線価 × 調整率 × 持分（分子 ÷ 分母）" : formula === "LAND_MULTIPLIER" || formula === "BUILDING" ? "固定資産税評価額 × 倍率 × 調整率 × 持分（分子 ÷ 分母）" : "";

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
        {isPrivateShares
          ? <input type="hidden" name="currency" value="JPY" />
          : <label>通貨<select name="currency" value={currency} onChange={(event) => setCurrency(event.target.value)}><option>JPY</option><option>USD</option><option>EUR</option><option>GBP</option><option>AUD</option><option>CHF</option></select></label>}
        {section === "ASSET" ? <AssetSpecificFields
          category={category}
          details={assetDetails}
          people={people}
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
        {isStockCategory || isRealEstateCategory ? <fieldset className="valuation-formula-fieldset full"><legend>{isPrivateShares ? "評価額の自動計算" : "評価額の計算方法"}</legend>{isPrivateShares ? <input type="hidden" name="valuationFormula" value="STOCK" /> : <select name="valuationFormula" aria-label="評価額の計算方法" value={formula} onChange={(event) => setFormula(event.target.value as ValuationFormula)}><option value="MANUAL">金額を直接入力</option>{isStockCategory ? <option value="STOCK">株数・口数から計算</option> : null}{isRealEstateCategory && propertyType === "LAND" ? <><option value="LAND_ROADSIDE">路線価方式</option><option value="LAND_MULTIPLIER">倍率方式</option></> : null}{isRealEstateCategory && propertyType === "BUILDING" ? <option value="BUILDING">固定資産税評価額方式</option> : null}</select>}{formulaExpression ? <p className="valuation-formula-expression">{formulaExpression}</p> : null}
          {formula === "STOCK" ? <div className="valuation-calculation-grid stock-formula"><label>株数・口数<CommaNumberInput name="valuationQuantity" defaultValue="" value={quantity} onValueChange={setQuantity} maxFractionDigits={6} placeholder="例：10,000" positive /></label><span aria-hidden="true">×</span><label>単価<CommaNumberInput name="valuationUnitPrice" defaultValue="" value={unitPrice} onValueChange={setUnitPrice} maxFractionDigits={2} placeholder="例：2,500" positive /></label><span aria-hidden="true">×</span><label>調整率<CommaNumberInput name="adjustmentRate" defaultValue="" value={adjustmentRate} onValueChange={setAdjustmentRate} maxFractionDigits={2} placeholder="例：1.0" positive /></label></div> : null}
          {formula === "LAND_ROADSIDE" ? <><div className="valuation-source-summary"><span>基本情報から使用</span><dl><div><dt>面積</dt><dd>{landArea ? `${valuationNumber.format(numericValue(landArea))}㎡` : "未入力"}</dd></div><div><dt>持分</dt><dd>{ownershipDisplay}</dd></div></dl></div><div className="valuation-calculation-grid real-estate-method-inputs"><label>路線価（円/㎡）<CommaNumberInput name="roadsideValue" defaultValue="" value={roadsideValue} onValueChange={setRoadsideValue} maxFractionDigits={2} placeholder="" positive /></label><span aria-hidden="true">×</span><label>調整率<CommaNumberInput name="adjustmentRate" defaultValue="" value={adjustmentRate} onValueChange={setAdjustmentRate} maxFractionDigits={2} placeholder="" positive /></label></div></> : null}
          {formula === "LAND_MULTIPLIER" || formula === "BUILDING" ? <><div className="valuation-source-summary"><span>基本情報から使用</span><dl><div><dt>固定資産税評価額</dt><dd>{fixedAssetTaxValue ? yen.format(numericValue(fixedAssetTaxValue)) : "未入力"}</dd></div><div><dt>持分</dt><dd>{ownershipDisplay}</dd></div></dl></div><div className="valuation-calculation-grid real-estate-method-inputs"><label>倍率<CommaNumberInput name="valuationMultiplier" defaultValue="" value={valuationMultiplier} onValueChange={setValuationMultiplier} maxFractionDigits={6} placeholder="" positive /></label><span aria-hidden="true">×</span><label>調整率<CommaNumberInput name="adjustmentRate" defaultValue="" value={adjustmentRate} onValueChange={setAdjustmentRate} maxFractionDigits={2} placeholder="" positive /></label></div></> : null}
          {isCalculated ? <div className="valuation-result" aria-live="polite"><span>算式による評価額</span><strong>{calculatedAmount.toLocaleString("ja-JP", { maximumFractionDigits: 2 })} {currency}</strong><small>円換算見込 {yen.format(calculatedJpy)}</small></div> : null}
        </fieldset> : <input type="hidden" name="valuationFormula" value="MANUAL" />}
        <label>{amountLabel}<CommaNumberInput key={formula} name="originalAmount" defaultValue={isCalculated ? "" : position?.originalAmount ?? ""} value={isCalculated ? String(calculatedAmount) : undefined} maxFractionDigits={2} placeholder="" readOnly={isCalculated} hint={isCalculated ? "上の算式から自動計算されます" : undefined} /></label>
        {isPrivateShares
          ? <input type="hidden" name="fxRate" value="1" />
          : <label>円換算レート<CommaNumberInput name="fxRate" defaultValue={position?.fxRate ?? 1} value={fxRate} onValueChange={setFxRate} maxFractionDigits={6} placeholder="例：150.25" positive /></label>}
        {isCalculated ? <input type="hidden" name="valuationMethod" value={formulaLabel} /> : <label>評価方法<input name="valuationMethod" defaultValue={position?.valuationMethod ?? "手動入力"} /></label>}
        <label className="full">メモ<textarea name="note" rows={3} placeholder="評価日、根拠資料など" defaultValue={position?.note ?? ""} /></label>
      </div>
      <footer><button type="button" className="button secondary" onClick={onClose}>キャンセル</button><button type="submit" className="button primary" disabled={saving}>{saving ? <LoaderCircle className="spin" /> : isEditing ? <Pencil /> : <Plus />}{isEditing ? "保存する" : "登録する"}</button></footer>
    </form>
  </div></div>;
}

export function DeletePositionModal({ position, onClose, onDelete, saving }: { position: Position; onClose: () => void; onDelete: () => void; saving: boolean }) {
  return <div className="modal-layer" role="presentation"><div className="modal delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-modal-title" aria-describedby="delete-modal-description"><header><div><p className="eyebrow danger-eyebrow">DELETE POSITION</p><h2 id="delete-modal-title">この明細を削除しますか？</h2></div><button className="icon-button" aria-label="閉じる" onClick={onClose} disabled={saving}><X /></button></header><div className="delete-modal-body"><div className="delete-warning-icon"><AlertTriangle /></div><p id="delete-modal-description">削除すると、選択年度のB/Sから取り除かれます。この操作は取り消せません。</p><dl><div><dt>名称</dt><dd>{position.name}</dd></div><div><dt>区分</dt><dd>{positionSectionLabels[positionSection(position)]}・{middleClassification(position)}</dd></div><div><dt>円換算時価</dt><dd>{yen.format(position.valueJpy)}</dd></div></dl><footer><button type="button" className="button secondary" onClick={onClose} disabled={saving}>キャンセル</button><button type="button" className="button danger-button" onClick={onDelete} disabled={saving}>{saving ? <LoaderCircle className="spin" /> : <Trash2 />}削除する</button></footer></div></div></div>;
}
