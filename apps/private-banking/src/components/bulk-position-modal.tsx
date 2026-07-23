"use client";

import { AlertTriangle, CircleCheck, Copy, LoaderCircle, Plus, Table2, Trash2, X } from "lucide-react";
import { ClipboardEvent, useMemo, useState } from "react";
import { compactYen, decimalToFraction, formatCommaNumberInput } from "@/lib/format";
import {
  type BulkModalMode,
  type BulkPositionPayload,
  type Position,
  type Snapshot,
  type ValuationFormula,
  buildingTypeByValue,
  buildingTypeOptions,
  landCategoryByValue,
  landCategoryOptions,
} from "@/lib/portfolio-view";

type BulkEntryType = "SECURITIES" | "PRIVATE_SHARES" | "LAND" | "BUILDING";
type BulkField = "category" | "valuationFormula" | "name" | "institution" | "address" | "landCategory" | "buildingType" | "buildingStructure" | "floorArea" | "quantity" | "unitPrice" | "landArea" | "roadsideValue" | "fixedAssetTaxValue" | "multiplier" | "adjustmentRate" | "ownershipNumerator" | "ownershipDenominator" | "originalAmount" | "note";
type BulkRow = Record<BulkField, string> & { id: number; positionId: number | null; error: string; errorFields: BulkField[] };
type BulkColumn = { key: BulkField; label: string; numeric?: boolean; required?: boolean; conditional?: boolean; kind?: "category" | "formula" | "landCategory" | "buildingType"; width?: string };

const bulkEntryTypeLabels: Record<BulkEntryType, string> = { SECURITIES: "有価証券", PRIVATE_SHARES: "自社株", LAND: "土地", BUILDING: "建物" };
const bulkEntryTypes: BulkEntryType[] = ["SECURITIES", "PRIVATE_SHARES", "LAND", "BUILDING"];

function createBulkRow(id: number, positionId: number | null = null): BulkRow {
  return {
    id, positionId, error: "", errorFields: [], category: "REAL_ESTATE", valuationFormula: "STOCK", name: "", institution: "", address: "", landCategory: "", buildingType: "", buildingStructure: "",
    floorArea: "", quantity: "", unitPrice: "", landArea: "", roadsideValue: "", fixedAssetTaxValue: "", multiplier: "1.0",
    adjustmentRate: "1.0", ownershipNumerator: "1", ownershipDenominator: "1", originalAmount: "", note: "",
  };
}

function bulkEntryTypeForPosition(position: Position): BulkEntryType | null {
  if (position.side !== "ASSET") return null;
  if (position.category === "SECURITIES" && ["STOCK", "MANUAL"].includes(position.valuationFormula)) return "SECURITIES";
  if (position.category === "PRIVATE_SHARES" && ["STOCK", "MANUAL"].includes(position.valuationFormula)) return "PRIVATE_SHARES";
  if (!["HOME_REAL_ESTATE", "REAL_ESTATE", "IDLE_REAL_ESTATE"].includes(position.category)) return null;
  const propertyType = position.assetDetails?.propertyType ?? (position.valuationFormula === "BUILDING" ? "BUILDING" : "LAND");
  if (propertyType === "BUILDING" && !["LAND_ROADSIDE", "LAND_MULTIPLIER"].includes(position.valuationFormula)) return "BUILDING";
  if (propertyType === "LAND" && position.valuationFormula !== "BUILDING") return "LAND";
  return null;
}

function bulkNumber(value: number | null | undefined, maxFractionDigits = 2) {
  return value === null || value === undefined ? "" : formatCommaNumberInput(String(value), maxFractionDigits);
}

function bulkRowFromPosition(position: Position): BulkRow {
  const details = position.assetDetails ?? {};
  const [fallbackNumerator, fallbackDenominator] = decimalToFraction(position.ownershipShare);
  return {
    ...createBulkRow(position.id, position.id),
    category: position.category,
    valuationFormula: position.valuationFormula,
    name: position.name,
    institution: position.category === "PRIVATE_SHARES" ? details.shareClass ?? position.institution : position.institution,
    address: details.propertyAddress ?? "",
    landCategory: details.landCategory ?? "",
    buildingType: details.buildingType ?? "",
    buildingStructure: details.buildingStructure ?? "",
    floorArea: bulkNumber(details.floorArea, 6),
    quantity: bulkNumber(position.valuationQuantity, 6),
    unitPrice: bulkNumber(position.valuationUnitPrice),
    landArea: bulkNumber(position.landArea, 6),
    roadsideValue: bulkNumber(position.roadsideValue === null ? null : position.roadsideValue / 1000),
    fixedAssetTaxValue: bulkNumber(position.fixedAssetTaxValue === null ? null : position.fixedAssetTaxValue / 1000),
    multiplier: bulkNumber(position.valuationMultiplier) || "1.0",
    adjustmentRate: bulkNumber(position.adjustmentRate) || "1.0",
    ownershipNumerator: bulkNumber(position.ownershipNumerator ?? fallbackNumerator, 0),
    ownershipDenominator: bulkNumber(position.ownershipDenominator ?? fallbackDenominator, 0),
    originalAmount: bulkNumber(position.originalAmount),
    note: position.note,
  };
}

function editableBulkPositions(snapshot: Snapshot, entryType: BulkEntryType) {
  return snapshot.positions.filter((position) => bulkEntryTypeForPosition(position) === entryType);
}

export function BulkPositionModal({ mode, snapshot, onClose, onSubmit, saving }: {
  mode: BulkModalMode;
  snapshot: Snapshot;
  onClose: () => void;
  onSubmit: (positions: BulkPositionPayload[]) => Promise<boolean>;
  saving: boolean;
}) {
  const entryCounts = useMemo(() => Object.fromEntries(bulkEntryTypes.map((type) => [type, editableBulkPositions(snapshot, type).length])) as Record<BulkEntryType, number>, [snapshot]);
  const initialEntryType = mode === "edit" ? bulkEntryTypes.find((type) => entryCounts[type] > 0) ?? "SECURITIES" : "SECURITIES";
  const [entryType, setEntryType] = useState<BulkEntryType>(initialEntryType);
  const [rows, setRows] = useState(() => mode === "edit" ? editableBulkPositions(snapshot, initialEntryType).map(bulkRowFromPosition) : Array.from({ length: 5 }, (_, index) => createBulkRow(index + 1)));
  const [formError, setFormError] = useState("");
  const isStock = ["SECURITIES", "PRIVATE_SHARES"].includes(entryType);
  const isLand = entryType === "LAND";
  const isBuilding = entryType === "BUILDING";
  const isRealEstate = isLand || isBuilding;

  const columns = useMemo<BulkColumn[]>(() => {
    if (isStock) return [
      { key: "name", label: entryType === "PRIVATE_SHARES" ? "会社名" : "銘柄名", required: true, width: "190px" },
      { key: "institution", label: entryType === "PRIVATE_SHARES" ? "株式種類" : "証券会社", width: "150px" },
      { key: "valuationFormula", label: "方式", required: true, kind: "formula", width: "56px" },
      { key: "quantity", label: "株数・口数", numeric: true, conditional: true, width: "130px" },
      { key: "unitPrice", label: "単価", numeric: true, conditional: true, width: "130px" },
      { key: "adjustmentRate", label: "調整率", numeric: true, conditional: true, width: "100px" },
      { key: "originalAmount", label: "直接入力額", numeric: true, conditional: true, width: "110px" },
      { key: "note", label: "メモ", width: "170px" },
    ];
    const basic: BulkColumn[] = [
      { key: "category", label: "科目", required: true, kind: "category", width: "84px" },
      { key: "name", label: "名称", required: true, width: "96px" },
      { key: "address", label: "所在地", required: true, width: "184px" },
    ];
    if (isLand) {
      basic.push(
        { key: "landCategory", label: "地目", kind: "landCategory", width: "76px" },
        { key: "landArea", label: "面積㎡", numeric: true, width: "56px" },
        { key: "valuationFormula", label: "方式", required: true, kind: "formula", width: "50px" },
        { key: "roadsideValue", label: "路線価（千円/㎡）", numeric: true, conditional: true, width: "80px" },
        { key: "fixedAssetTaxValue", label: "固定資産税評価（千円）", numeric: true, width: "86px" },
        { key: "multiplier", label: "倍率", numeric: true, conditional: true, width: "44px" },
      );
    } else {
      basic.push(
        { key: "buildingType", label: "用途", kind: "buildingType", width: "76px" },
        { key: "buildingStructure", label: "構造", width: "56px" },
        { key: "floorArea", label: "床面積㎡", numeric: true, width: "56px" },
        { key: "valuationFormula", label: "方式", required: true, kind: "formula", width: "50px" },
        { key: "fixedAssetTaxValue", label: "固定資産税評価（千円）", numeric: true, width: "86px" },
        { key: "multiplier", label: "倍率", numeric: true, conditional: true, width: "44px" },
      );
    }
    basic.push(
      { key: "adjustmentRate", label: "調整率", numeric: true, conditional: true, width: "44px" },
      { key: "ownershipNumerator", label: "持分子", numeric: true, required: true, width: "44px" },
      { key: "ownershipDenominator", label: "持分母", numeric: true, required: true, width: "44px" },
      { key: "originalAmount", label: "直接入力額", numeric: true, conditional: true, width: "82px" },
    );
    return basic;
  }, [entryType, isLand, isStock]);

  function changeEntryType(nextType: BulkEntryType) {
    setEntryType(nextType);
    if (mode === "edit") {
      setRows(editableBulkPositions(snapshot, nextType).map(bulkRowFromPosition));
      setFormError("");
      return;
    }
    const defaultFormula = nextType === "LAND" ? "LAND_ROADSIDE" : nextType === "BUILDING" ? "BUILDING" : "STOCK";
    setRows((currentRows) => currentRows.map((row) => ({
      ...row,
      category: ["LAND", "BUILDING"].includes(nextType) && !["HOME_REAL_ESTATE", "REAL_ESTATE", "IDLE_REAL_ESTATE"].includes(row.category) ? "REAL_ESTATE" : row.category,
      valuationFormula: defaultFormula,
      error: "",
      errorFields: [],
    })));
    setFormError("");
  }

  function updateRow(rowId: number, key: BulkField, rawValue: string, numeric = false) {
    const value = numeric ? formatCommaNumberInput(rawValue, ["quantity", "landArea", "floorArea"].includes(key) ? 6 : 2) : rawValue;
    setRows((currentRows) => currentRows.map((row) => row.id === rowId ? { ...row, [key]: value, error: "", errorFields: row.errorFields.filter((field) => field !== key) } : row));
  }

  function fieldIsDisabled(row: BulkRow, key: BulkField) {
    const rowFormula = row.valuationFormula as ValuationFormula;
    if (isStock) {
      if (key === "originalAmount") return rowFormula !== "MANUAL";
      if (["quantity", "unitPrice", "adjustmentRate"].includes(key)) return rowFormula === "MANUAL";
      return false;
    }
    if (!isRealEstate) return false;
    if (key === "originalAmount") return rowFormula !== "MANUAL";
    if (key === "adjustmentRate") return rowFormula === "MANUAL";
    if (key === "roadsideValue") return rowFormula !== "LAND_ROADSIDE";
    if (key === "multiplier") return !["LAND_MULTIPLIER", "BUILDING"].includes(rowFormula);
    return false;
  }

  function requiredFieldsForRow(row: BulkRow): BulkField[] {
    if (isStock) return row.valuationFormula === "MANUAL" ? ["name", "valuationFormula", "originalAmount"] : ["name", "valuationFormula", "quantity", "unitPrice", "adjustmentRate"];
    const common: BulkField[] = ["category", "name", "address", "valuationFormula", "ownershipNumerator", "ownershipDenominator"];
    if (row.valuationFormula === "LAND_ROADSIDE") return [...common, "landArea", "roadsideValue", "adjustmentRate"];
    if (["LAND_MULTIPLIER", "BUILDING"].includes(row.valuationFormula)) return [...common, "fixedAssetTaxValue", "multiplier", "adjustmentRate"];
    return [...common, "originalAmount"];
  }

  function addRow(afterId?: number, source?: BulkRow) {
    setRows((currentRows) => {
      const nextId = Math.max(0, ...currentRows.map((row) => row.id)) + 1;
      const nextRow = source ? { ...source, id: nextId, error: "", errorFields: [] } : createBulkRow(nextId);
      if (afterId === undefined) return [...currentRows, nextRow];
      const index = currentRows.findIndex((row) => row.id === afterId);
      return [...currentRows.slice(0, index + 1), nextRow, ...currentRows.slice(index + 1)];
    });
  }

  function removeRow(rowId: number) {
    setRows((currentRows) => currentRows.length === 1 ? [createBulkRow(currentRows[0].id)] : currentRows.filter((row) => row.id !== rowId));
  }

  function calculatedRowValue(row: BulkRow) {
    const number = (value: string) => Number(value.replace(/,/g, "")) || 0;
    if (isStock) return row.valuationFormula === "MANUAL" ? number(row.originalAmount) : number(row.quantity) * number(row.unitPrice) * number(row.adjustmentRate);
    const share = number(row.ownershipDenominator) > 0 ? number(row.ownershipNumerator) / number(row.ownershipDenominator) : 0;
    if (row.valuationFormula === "LAND_ROADSIDE") return number(row.landArea) * number(row.roadsideValue) * 1000 * number(row.adjustmentRate) * share;
    if (["LAND_MULTIPLIER", "BUILDING"].includes(row.valuationFormula)) return number(row.fixedAssetTaxValue) * 1000 * number(row.multiplier) * number(row.adjustmentRate) * share;
    return number(row.originalAmount);
  }

  function normalizedPastedValue(key: BulkField, value: string) {
    const trimmed = value.trim();
    if (key === "category") {
      const categories: Record<string, string> = { 自宅: "HOME_REAL_ESTATE", 収益不動産: "REAL_ESTATE", 遊休不動産: "IDLE_REAL_ESTATE" };
      return categories[trimmed] ?? trimmed;
    }
    if (key === "valuationFormula") {
      const formulas: Record<string, string> = {
        路線価: "LAND_ROADSIDE", 路線価方式: "LAND_ROADSIDE", 倍率: "LAND_MULTIPLIER", 倍率方式: "LAND_MULTIPLIER",
        固定資産税評価額: "BUILDING", 固定資産税評価額方式: "BUILDING", 直接入力: "MANUAL",
      };
      return formulas[trimmed] ?? trimmed;
    }
    if (key === "landCategory") {
      const labelWithoutReading = trimmed.replace(/（[^）]*）/g, "");
      const matched = landCategoryOptions.find((option) => option.label === labelWithoutReading);
      return matched?.value ?? trimmed;
    }
    if (key === "buildingType") {
      const labelWithoutReading = trimmed.replace(/（[^）]*）/g, "");
      const matched = buildingTypeOptions.find((option) => option.label === labelWithoutReading);
      return matched?.value ?? trimmed;
    }
    return trimmed;
  }

  function handlePaste(event: ClipboardEvent<HTMLTableSectionElement>) {
    const input = event.target as HTMLInputElement;
    const rowId = Number(input.dataset.rowId);
    const startKey = input.dataset.columnKey as BulkField | undefined;
    const text = event.clipboardData.getData("text/plain");
    if (!rowId || !startKey || (!text.includes("\t") && !text.includes("\n"))) return;
    event.preventDefault();
    const pastedRows = text.replace(/\r/g, "").trimEnd().split("\n").map((line) => line.split("\t"));
    setRows((currentRows) => {
      const startRowIndex = currentRows.findIndex((row) => row.id === rowId);
      const startColumnIndex = columns.findIndex((column) => column.key === startKey);
      const nextRows = [...currentRows];
      while (mode === "add" && nextRows.length < startRowIndex + pastedRows.length) nextRows.push(createBulkRow(Math.max(0, ...nextRows.map((row) => row.id)) + 1));
      pastedRows.forEach((cells, rowOffset) => {
        const original = nextRows[startRowIndex + rowOffset];
        if (!original) return;
        const next = { ...original, error: "", errorFields: [] };
        cells.forEach((cell, columnOffset) => {
          const column = columns[startColumnIndex + columnOffset];
          if (!column) return;
          next[column.key] = column.numeric ? formatCommaNumberInput(cell, ["quantity", "landArea", "floorArea"].includes(column.key) ? 6 : 2) : normalizedPastedValue(column.key, cell);
        });
        nextRows[startRowIndex + rowOffset] = next;
      });
      return nextRows;
    });
  }

  async function submitBulk() {
    setFormError("");
    const activeRows = mode === "edit" ? rows : rows.filter((row) => row.name.trim() || row.address.trim() || row.quantity || row.fixedAssetTaxValue || row.roadsideValue || row.originalAmount);
    if (activeRows.length === 0) {
      setFormError(mode === "edit" ? "この種類には一括編集できる登録済み明細がありません。" : "登録する明細を1行以上入力してください。");
      return;
    }
    let invalid = false;
    const checkedRows = rows.map((row) => {
      if (!activeRows.includes(row)) return { ...row, error: "", errorFields: [] };
      const requiredFields = requiredFieldsForRow(row);
      const columnLabels = new Map(columns.map((column) => [column.key, column.label]));
      const missingFields = requiredFields.filter((field) => !row[field].trim());
      const missing = missingFields.map((field) => columnLabels.get(field) ?? field);
      const number = (value: string) => Number(value.replace(/,/g, "")) || 0;
      const numericFields = new Set(columns.filter((column) => column.numeric).map((column) => column.key));
      const invalidNumberFields = requiredFields.filter((field) => numericFields.has(field) && row[field].trim() && number(row[field]) <= 0);
      if (invalidNumberFields.length > 0) {
        invalid = true;
        return { ...row, error: "必須の数値は0より大きい値で入力してください。", errorFields: [...missingFields, ...invalidNumberFields] };
      }
      if (missing.length > 0) {
        invalid = true;
        return { ...row, error: `${missing.join("・")}を入力してください。`, errorFields: missingFields };
      }
      return { ...row, error: "", errorFields: [] };
    });
    setRows(checkedRows);
    if (invalid) {
      setFormError("入力エラーのある行を確認してください。");
      return;
    }
    const numberOrNull = (value: string) => value ? Number(value.replace(/,/g, "")) : null;
    const thousandYenOrNull = (value: string) => {
      const amount = numberOrNull(value);
      return amount === null ? null : amount * 1000;
    };
    const payloads = activeRows.map((row) => {
      const rowFormula = row.valuationFormula as ValuationFormula;
      const data = {
        side: "ASSET",
        category: isStock ? entryType : row.category,
        name: row.name.trim(),
        institution: isStock ? row.institution.trim() : "",
        currency: "JPY",
        originalAmount: calculatedRowValue(row),
        fxRate: 1,
        valuationMethod: rowFormula === "STOCK" ? "株数・口数×単価×調整率" : rowFormula === "LAND_ROADSIDE" ? "路線価方式" : rowFormula === "LAND_MULTIPLIER" ? "倍率方式" : rowFormula === "BUILDING" ? "建物・固定資産税評価額方式" : "直接入力",
        valuationFormula: rowFormula,
        valuationQuantity: isStock ? numberOrNull(row.quantity) : null,
        valuationUnitPrice: isStock ? numberOrNull(row.unitPrice) : null,
        adjustmentRate: rowFormula === "MANUAL" ? null : numberOrNull(row.adjustmentRate),
        landArea: isLand ? numberOrNull(row.landArea) : null,
        roadsideValue: rowFormula === "LAND_ROADSIDE" ? (numberOrNull(row.roadsideValue) ?? 0) * 1000 : null,
        fixedAssetTaxValue: isRealEstate ? thousandYenOrNull(row.fixedAssetTaxValue) : null,
        valuationMultiplier: ["LAND_MULTIPLIER", "BUILDING"].includes(rowFormula) ? numberOrNull(row.multiplier) : null,
        ownershipNumerator: isRealEstate ? numberOrNull(row.ownershipNumerator) : null,
        ownershipDenominator: isRealEstate ? numberOrNull(row.ownershipDenominator) : null,
        assetDetails: isStock
          ? entryType === "SECURITIES" ? { securityType: "STOCK" } : { shareClass: row.institution.trim() }
          : {
            propertyType: isLand ? "LAND" : "BUILDING",
            propertyAddress: row.address.trim(),
            ...(isLand ? { landCategory: row.landCategory.trim() } : { buildingType: row.buildingType.trim(), buildingStructure: row.buildingStructure.trim(), floorArea: numberOrNull(row.floorArea) }),
          },
        note: row.note.trim(),
      };
      return mode === "edit" ? { id: row.positionId, data } : data;
    });
    await onSubmit(payloads);
  }

  return <div className="modal-layer" role="presentation"><div className="modal bulk-position-modal" role="dialog" aria-modal="true" aria-labelledby="bulk-modal-title">
    <header><div><p className="eyebrow">{mode === "edit" ? "BULK EDIT" : "BULK ENTRY"}</p><h2 id="bulk-modal-title">{mode === "edit" ? "登録済み明細を表で編集" : "表形式で一括追加"}</h2><p>{snapshot.fiscalYear}年度・資産の部</p></div><button className="icon-button" aria-label="閉じる" onClick={onClose} disabled={saving}><X /></button></header>
    <div className="bulk-modal-body">
      <section className="bulk-common-settings" aria-label="共通条件">
        <label>{mode === "edit" ? "編集対象" : "入力対象"}<select value={entryType} onChange={(event) => changeEntryType(event.target.value as BulkEntryType)}>{bulkEntryTypes.map((type) => <option key={type} value={type}>{bulkEntryTypeLabels[type]}{mode === "edit" ? `（${entryCounts[type]}件）` : ""}</option>)}</select></label>
        <div className="bulk-help"><Table2 /><span>{isRealEstate ? "面積・固定資産税評価額は任意入力でき、評価方式にかかわらず基本情報として保存されます。金額は千円単位です。" : mode === "edit" ? "登録済み明細を種類ごとに表示します。表示中の行をまとめて保存できます。" : "Excelの複数セルをコピーし、表の開始セルへ貼り付けられます。"}</span></div>
      </section>
      {formError ? <p className="bulk-form-error" role="alert"><AlertTriangle />{formError}</p> : null}
      {mode === "edit" && rows.length === 0 ? <div className="bulk-empty-state"><Table2 /><strong>{bulkEntryTypeLabels[entryType]}の登録済み明細はありません</strong><span>別の編集対象を選択してください。</span></div> : <div className="bulk-table-scroll">
        <table className="bulk-entry-table">
          <thead><tr><th className="bulk-row-number">行</th>{columns.map((column) => <th key={column.key} style={{ width: column.width }}><span>{column.label}</span>{column.required ? <em>必須</em> : column.conditional ? <em className="conditional">方式別</em> : null}</th>)}<th className="bulk-calculated-value">評価額</th><th className="bulk-row-actions">{mode === "edit" ? "状態" : "操作"}</th></tr></thead>
          <tbody onPaste={handlePaste}>{rows.map((row, rowIndex) => <tr key={row.id} className={row.error ? "has-error" : ""}>
            <th scope="row" className="bulk-row-number">{rowIndex + 1}{row.error ? <span className="sr-only">入力エラー</span> : null}</th>
            {columns.map((column) => {
              const disabled = fieldIsDisabled(row, column.key);
              const commonProps = {
                value: row[column.key],
                "data-row-id": row.id,
                "data-column-key": column.key,
                "aria-label": `${rowIndex + 1}行目 ${column.label}`,
                "aria-invalid": row.errorFields.includes(column.key),
              };
              return <td key={column.key} className={disabled ? "is-disabled" : ""}>
                {column.kind === "category" ? <select {...commonProps} onChange={(event) => updateRow(row.id, column.key, event.target.value)}><option value="HOME_REAL_ESTATE">自宅</option><option value="REAL_ESTATE">収益不動産</option><option value="IDLE_REAL_ESTATE">遊休不動産</option></select>
                  : column.kind === "formula" ? <select {...commonProps} title={row.valuationFormula === "STOCK" ? "株数・口数から計算" : row.valuationFormula === "LAND_ROADSIDE" ? "路線価方式" : row.valuationFormula === "MANUAL" ? "直接入力" : "倍率方式"} onChange={(event) => updateRow(row.id, column.key, event.target.value)}>{isStock ? <option value="STOCK">算</option> : isLand ? <><option value="LAND_ROADSIDE">路</option><option value="LAND_MULTIPLIER">倍</option></> : <option value="BUILDING">倍</option>}<option value="MANUAL">直</option></select>
                    : column.kind === "landCategory" ? <><select {...commonProps} title={landCategoryByValue.get(row.landCategory as typeof landCategoryOptions[number]["value"])?.definition ?? "地目を選択"} aria-describedby={row.landCategory ? `bulk-land-category-${row.id}` : undefined} onChange={(event) => updateRow(row.id, column.key, event.target.value)}><option value="">未選択</option>{landCategoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>{row.landCategory ? <span id={`bulk-land-category-${row.id}`} className="sr-only">{landCategoryByValue.get(row.landCategory as typeof landCategoryOptions[number]["value"])?.definition}</span> : null}</>
                      : column.kind === "buildingType" ? <><select {...commonProps} title={buildingTypeByValue.get(row.buildingType as typeof buildingTypeOptions[number]["value"])?.definition ?? "建物種類を選択"} aria-describedby={row.buildingType ? `bulk-building-type-${row.id}` : undefined} onChange={(event) => updateRow(row.id, column.key, event.target.value)}><option value="">未選択</option>{buildingTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>{row.buildingType ? <span id={`bulk-building-type-${row.id}`} className="sr-only">{buildingTypeByValue.get(row.buildingType as typeof buildingTypeOptions[number]["value"])?.definition}</span> : null}</>
                    : <input {...commonProps} type="text" inputMode={column.numeric ? "decimal" : undefined} disabled={disabled} onChange={(event) => updateRow(row.id, column.key, event.target.value, column.numeric)} />}
              </td>;
            })}
            <td className="bulk-calculated-value"><strong>{compactYen(calculatedRowValue(row))}</strong>{row.error ? <small>{row.error}</small> : null}</td>
            <td className="bulk-row-actions">{mode === "edit" ? <span className="bulk-existing-badge"><CircleCheck />登録済</span> : <><button type="button" className="icon-button" aria-label={`${rowIndex + 1}行目を複製`} title="行を複製" onClick={() => addRow(row.id, row)}><Copy /></button><button type="button" className="icon-button danger" aria-label={`${rowIndex + 1}行目を削除`} title="行を削除" onClick={() => removeRow(row.id)}><Trash2 /></button></>}</td>
          </tr>)}</tbody>
        </table>
      </div>}
      {mode === "add" ? <button type="button" className="button secondary bulk-add-row" onClick={() => addRow()}><Plus />空の行を追加</button> : null}
      <footer><span>{mode === "edit" ? `${rows.length}件を編集中` : `${rows.filter((row) => row.name.trim()).length}件入力中`}</span><div><button type="button" className="button secondary" onClick={onClose} disabled={saving}>キャンセル</button><button type="button" className="button primary" onClick={() => void submitBulk()} disabled={saving || rows.length === 0}>{saving ? <LoaderCircle className="spin" /> : mode === "edit" ? <CircleCheck /> : <Table2 />}{mode === "edit" ? "まとめて保存" : "まとめて登録"}</button></div></footer>
    </div>
  </div></div>;
}
