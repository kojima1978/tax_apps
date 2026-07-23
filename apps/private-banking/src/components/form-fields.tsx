"use client";

import { useState } from "react";
import { formatCommaNumberInput } from "@/lib/format";
import { buildingTypeByValue, buildingTypeOptions, landCategoryByValue, landCategoryOptions } from "@/lib/portfolio-view";

/** 明細フォームで共通に使う入力部品。 */

export function CommaNumberInput({ name, defaultValue, maxFractionDigits, placeholder, positive = false, required = true, value, onValueChange, readOnly = false, hint = "", ariaLabel }: { name: string; defaultValue: number | ""; maxFractionDigits: number; placeholder: string; positive?: boolean; required?: boolean; value?: string; onValueChange?: (value: string) => void; readOnly?: boolean; hint?: string; ariaLabel?: string }) {
  const [displayValue, setDisplayValue] = useState(() => formatCommaNumberInput(String(defaultValue), maxFractionDigits));
  const shownValue = value === undefined ? displayValue : formatCommaNumberInput(value, maxFractionDigits);
  return <><input
    name={name}
    type="text"
    inputMode="decimal"
    autoComplete="off"
    required={required}
    placeholder={placeholder}
    value={shownValue}
    readOnly={readOnly}
    aria-label={ariaLabel}
    aria-describedby={hint ? `${name}-input-hint` : undefined}
    onChange={(event) => {
      const nextValue = formatCommaNumberInput(event.target.value, maxFractionDigits);
      event.target.setCustomValidity(positive && nextValue !== "" && Number(nextValue.replace(/,/g, "")) <= 0 ? "0より大きい数値を入力してください。" : "");
      setDisplayValue(nextValue);
      onValueChange?.(nextValue.replace(/,/g, ""));
    }}
    onBlur={(event) => {
      if (positive && event.currentTarget.value !== "" && Number(event.currentTarget.value.replace(/,/g, "")) <= 0) event.currentTarget.setCustomValidity("0より大きい数値を入力してください。");
    }}
  />{hint ? <small id={`${name}-input-hint`} className="number-input-hint">{hint}</small> : null}</>;
}

export function OwnershipFractionInput({ numerator, denominator, onNumeratorChange, onDenominatorChange }: { numerator: string; denominator: string; onNumeratorChange: (value: string) => void; onDenominatorChange: (value: string) => void }) {
  return <div className="ownership-fraction-field" role="group" aria-label="持分">
    <span className="ownership-fraction-title">持分</span>
    <div className="ownership-fraction-inputs">
      <label><span className="sr-only">持分の分子</span><CommaNumberInput name="ownershipNumerator" defaultValue="" value={numerator} onValueChange={onNumeratorChange} maxFractionDigits={0} placeholder="1" positive ariaLabel="持分の分子" /></label>
      <strong aria-hidden="true">／</strong>
      <label><span className="sr-only">持分の分母</span><CommaNumberInput name="ownershipDenominator" defaultValue="" value={denominator} onValueChange={onDenominatorChange} maxFractionDigits={0} placeholder="2" positive ariaLabel="持分の分母" /></label>
    </div>
  </div>;
}

export function LandCategoryField({ defaultValue }: { defaultValue: string }) {
  const [value, setValue] = useState(defaultValue);
  const selected = landCategoryByValue.get(value as typeof landCategoryOptions[number]["value"]);
  const legacyValue = value && !selected ? value : "";
  return <label className="land-category-field">地目
    <select name="assetDetail.landCategory" value={value} title={selected?.definition ?? ""} onChange={(event) => setValue(event.target.value)}>
      <option value="">未選択</option>
      {legacyValue ? <option value={legacyValue}>{legacyValue === "OTHER" ? "その他（既存データ）" : legacyValue}</option> : null}
      {landCategoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
    {selected ? <small className="land-category-definition" aria-live="polite">{selected.definition}</small> : null}
  </label>;
}

export function BuildingTypeField({ defaultValue }: { defaultValue: string }) {
  const [value, setValue] = useState(defaultValue);
  const selected = buildingTypeByValue.get(value as typeof buildingTypeOptions[number]["value"]);
  const legacyValue = value && !selected ? value : "";
  return <label className="building-type-field">建物種類
    <select name="assetDetail.buildingType" value={value} title={selected?.definition ?? ""} onChange={(event) => setValue(event.target.value)}>
      <option value="">未選択</option>
      {legacyValue ? <option value={legacyValue}>{legacyValue}</option> : null}
      {buildingTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
    {selected ? <small className="building-type-definition" aria-live="polite">{selected.definition}</small> : null}
  </label>;
}
