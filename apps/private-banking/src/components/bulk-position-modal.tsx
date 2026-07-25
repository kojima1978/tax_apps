"use client";

import { AlertTriangle, CircleCheck, Copy, LoaderCircle, Plus, Table2, Trash2, X } from "lucide-react";
import { ClipboardEvent, KeyboardEvent as ReactKeyboardEvent, useMemo, useState } from "react";
import { compactYen, decimalToFraction, formatCommaNumberInput } from "@/lib/format";
import {
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

function createEmptyRow(id: number, entryType: BulkEntryType) {
  return {
    ...createBulkRow(id),
    valuationFormula: entryType === "LAND" ? "LAND_ROADSIDE" : entryType === "BUILDING" ? "BUILDING" : "STOCK",
  };
}

function initialRows(snapshot: Snapshot, entryType: BulkEntryType) {
  const existingRows = editableBulkPositions(snapshot, entryType).map(bulkRowFromPosition);
  const nextId = Math.max(0, ...existingRows.map((row) => row.id)) + 1;
  return [...existingRows, createEmptyRow(nextId, entryType)];
}

export function BulkPositionModal({ snapshot, onClose, onSubmit, saving }: {
  snapshot: Snapshot;
  onClose: () => void;
  onSubmit: (positions: BulkPositionPayload[]) => Promise<boolean>;
  saving: boolean;
}) {
  const entryCounts = useMemo(() => Object.fromEntries(bulkEntryTypes.map((type) => [type, editableBulkPositions(snapshot, type).length])) as Record<BulkEntryType, number>, [snapshot]);
  const initialEntryType = bulkEntryTypes.find((type) => entryCounts[type] > 0) ?? "SECURITIES";
  const [entryType, setEntryType] = useState<BulkEntryType>(initialEntryType);
  const [rowsByType, setRowsByType] = useState<Record<BulkEntryType, BulkRow[]>>(() => Object.fromEntries(
    bulkEntryTypes.map((type) => [type, initialRows(snapshot, type)]),
  ) as Record<BulkEntryType, BulkRow[]>);
  const [formError, setFormError] = useState("");
  const rows = rowsByType[entryType];
  const isStock = ["SECURITIES", "PRIVATE_SHARES"].includes(entryType);
  const isLand = entryType === "LAND";
  const isBuilding = entryType === "BUILDING";
  const isRealEstate = isLand || isBuilding;
  const totalExistingCount = bulkEntryTypes.reduce((count, type) => count + entryCounts[type], 0);
  const activeNewRowCount = bulkEntryTypes.reduce(
    (count, type) => count + rowsByType[type].filter((row) => row.positionId === null && (row.name.trim() || row.address.trim())).length,
    0,
  );

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
    setFormError("");
  }

  function setRows(updater: (currentRows: BulkRow[]) => BulkRow[]) {
    setRowsByType((current) => ({ ...current, [entryType]: updater(current[entryType]) }));
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

  function requiredFieldsForRow(row: BulkRow, targetType: BulkEntryType = entryType): BulkField[] {
    const targetIsStock = ["SECURITIES", "PRIVATE_SHARES"].includes(targetType);
    if (targetIsStock) return row.valuationFormula === "MANUAL" ? ["name", "valuationFormula", "originalAmount"] : ["name", "valuationFormula", "quantity", "unitPrice", "adjustmentRate"];
    const common: BulkField[] = ["category", "name", "address", "valuationFormula", "ownershipNumerator", "ownershipDenominator"];
    if (row.valuationFormula === "LAND_ROADSIDE") return [...common, "landArea", "roadsideValue", "adjustmentRate"];
    if (["LAND_MULTIPLIER", "BUILDING"].includes(row.valuationFormula)) return [...common, "fixedAssetTaxValue", "multiplier", "adjustmentRate"];
    return [...common, "originalAmount"];
  }

  function addRow(afterId?: number, source?: BulkRow) {
    setRows((currentRows) => {
      const nextId = Math.max(0, ...currentRows.map((row) => row.id)) + 1;
      const nextRow = source
        ? { ...source, id: nextId, positionId: null, error: "", errorFields: [] }
        : createEmptyRow(nextId, entryType);
      if (afterId === undefined) return [...currentRows, nextRow];
      const index = currentRows.findIndex((row) => row.id === afterId);
      return [...currentRows.slice(0, index + 1), nextRow, ...currentRows.slice(index + 1)];
    });
  }

  function removeRow(rowId: number) {
    setRows((currentRows) => {
      const remaining = currentRows.filter((row) => row.id !== rowId);
      return remaining.length > 0 ? remaining : [createEmptyRow(rowId, entryType)];
    });
  }

  function calculatedRowValue(row: BulkRow, targetType: BulkEntryType = entryType) {
    const number = (value: string) => Number(value.replace(/,/g, "")) || 0;
    if (["SECURITIES", "PRIVATE_SHARES"].includes(targetType)) return row.valuationFormula === "MANUAL" ? number(row.originalAmount) : number(row.quantity) * number(row.unitPrice) * number(row.adjustmentRate);
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
      while (nextRows.length < startRowIndex + pastedRows.length) nextRows.push(createEmptyRow(Math.max(0, ...nextRows.map((row) => row.id)) + 1, entryType));
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

  function handleTableKeyDown(event: ReactKeyboardEvent<HTMLTableSectionElement>) {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input:not(:disabled), select:not(:disabled)"));
    const currentIndex = controls.indexOf(target);
    const nextIndex = currentIndex + (event.shiftKey ? -1 : 1);
    const nextControl = controls[nextIndex];
    if (!nextControl) return;
    event.preventDefault();
    nextControl.focus();
    if (nextControl instanceof HTMLInputElement) nextControl.select();
  }

  async function submitBulk() {
    setFormError("");
    const activeRowsByType = Object.fromEntries(bulkEntryTypes.map((type) => [
      type,
      rowsByType[type].filter((row) => row.positionId !== null || row.name.trim() || row.address.trim() || row.quantity || row.fixedAssetTaxValue || row.roadsideValue || row.originalAmount),
    ])) as Record<BulkEntryType, BulkRow[]>;
    const activeRowCount = bulkEntryTypes.reduce((count, type) => count + activeRowsByType[type].length, 0);
    if (activeRowCount === 0) {
      setFormError("編集または追加する明細を1行以上入力してください。");
      return;
    }
    let invalid = false;
    const fieldLabels: Partial<Record<BulkField, string>> = {
      category: "科目", valuationFormula: "方式", name: "名称", institution: "金融機関等", address: "所在地",
      quantity: "株数・口数", unitPrice: "単価", landArea: "面積", roadsideValue: "路線価",
      fixedAssetTaxValue: "固定資産税評価", multiplier: "倍率", adjustmentRate: "調整率",
      ownershipNumerator: "持分子", ownershipDenominator: "持分母", originalAmount: "直接入力額",
    };
    const numericFields = new Set<BulkField>(["quantity", "unitPrice", "landArea", "roadsideValue", "fixedAssetTaxValue", "multiplier", "adjustmentRate", "ownershipNumerator", "ownershipDenominator", "originalAmount"]);
    const checkedRowsByType = Object.fromEntries(bulkEntryTypes.map((type) => [type, rowsByType[type].map((row) => {
      if (!activeRowsByType[type].includes(row)) return { ...row, error: "", errorFields: [] };
      const requiredFields = requiredFieldsForRow(row, type);
      const missingFields = requiredFields.filter((field) => !row[field].trim());
      const missing = missingFields.map((field) => fieldLabels[field] ?? field);
      const number = (value: string) => Number(value.replace(/,/g, "")) || 0;
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
    })])) as Record<BulkEntryType, BulkRow[]>;
    setRowsByType(checkedRowsByType);
    if (invalid) {
      const firstInvalidType = bulkEntryTypes.find((type) => checkedRowsByType[type].some((row) => row.error));
      if (firstInvalidType) setEntryType(firstInvalidType);
      setFormError("入力エラーのある行を確認してください。");
      return;
    }
    const numberOrNull = (value: string) => value ? Number(value.replace(/,/g, "")) : null;
    const thousandYenOrNull = (value: string) => {
      const amount = numberOrNull(value);
      return amount === null ? null : amount * 1000;
    };
    const payloads = bulkEntryTypes.flatMap((type) => activeRowsByType[type].map((row) => {
      const rowIsStock = ["SECURITIES", "PRIVATE_SHARES"].includes(type);
      const rowIsLand = type === "LAND";
      const rowIsRealEstate = ["LAND", "BUILDING"].includes(type);
      const rowFormula = row.valuationFormula as ValuationFormula;
      const data = {
        side: "ASSET",
        category: rowIsStock ? type : row.category,
        name: row.name.trim(),
        institution: rowIsStock ? row.institution.trim() : "",
        currency: "JPY",
        originalAmount: calculatedRowValue(row, type),
        fxRate: 1,
        valuationMethod: rowFormula === "STOCK" ? "株数・口数×単価×調整率" : rowFormula === "LAND_ROADSIDE" ? "路線価方式" : rowFormula === "LAND_MULTIPLIER" ? "倍率方式" : rowFormula === "BUILDING" ? "建物・固定資産税評価額方式" : "直接入力",
        valuationFormula: rowFormula,
        valuationQuantity: rowIsStock ? numberOrNull(row.quantity) : null,
        valuationUnitPrice: rowIsStock ? numberOrNull(row.unitPrice) : null,
        adjustmentRate: rowFormula === "MANUAL" ? null : numberOrNull(row.adjustmentRate),
        landArea: rowIsLand ? numberOrNull(row.landArea) : null,
        roadsideValue: rowFormula === "LAND_ROADSIDE" ? (numberOrNull(row.roadsideValue) ?? 0) * 1000 : null,
        fixedAssetTaxValue: rowIsRealEstate ? thousandYenOrNull(row.fixedAssetTaxValue) : null,
        valuationMultiplier: ["LAND_MULTIPLIER", "BUILDING"].includes(rowFormula) ? numberOrNull(row.multiplier) : null,
        ownershipNumerator: rowIsRealEstate ? numberOrNull(row.ownershipNumerator) : null,
        ownershipDenominator: rowIsRealEstate ? numberOrNull(row.ownershipDenominator) : null,
        assetDetails: rowIsStock
          ? type === "SECURITIES" ? { securityType: "STOCK" } : { shareClass: row.institution.trim() }
          : {
            propertyType: rowIsLand ? "LAND" : "BUILDING",
            propertyAddress: row.address.trim(),
            ...(rowIsLand ? { landCategory: row.landCategory.trim() } : { buildingType: row.buildingType.trim(), buildingStructure: row.buildingStructure.trim(), floorArea: numberOrNull(row.floorArea) }),
          },
        note: row.note.trim(),
      };
      return { id: row.positionId, data };
    }));
    await onSubmit(payloads);
  }

  return <div className="modal-layer" role="presentation"><div className="modal bulk-position-modal" role="dialog" aria-modal="true" aria-labelledby="bulk-modal-title">
    <header><div><p className="eyebrow">BULK MANAGE</p><h2 id="bulk-modal-title">明細を表で編集・追加</h2><p>{snapshot.fiscalYear}年度・資産の部</p></div><button className="icon-button" aria-label="閉じる" onClick={onClose} disabled={saving}><X /></button></header>
    <div className="bulk-modal-body">
      <section className="bulk-common-settings" aria-label="共通条件">
        <label>編集・追加する種類<select value={entryType} onChange={(event) => changeEntryType(event.target.value as BulkEntryType)}>{bulkEntryTypes.map((type) => <option key={type} value={type}>{bulkEntryTypeLabels[type]}（登録済み{entryCounts[type]}件）</option>)}</select></label>
        <div className="bulk-help"><Table2 /><span>{isRealEstate ? "登録済み行の修正と新規行の追加を同じ表で行えます。金額は千円単位です。" : "登録済み行の修正と新規行の追加を同じ表で行えます。Excelから複数セルを貼り付けることもできます。"} Enterで次のセル、Shift+Enterで前のセルへ移動します。</span></div>
      </section>
      {formError ? <p className="bulk-form-error" role="alert"><AlertTriangle />{formError}</p> : null}
      <div className="bulk-table-scroll">
        <table className="bulk-entry-table">
          <thead><tr><th className="bulk-row-number">行</th>{columns.map((column) => <th key={column.key} style={{ width: column.width }}><span>{column.label}</span>{column.required ? <em>必須</em> : column.conditional ? <em className="conditional">方式別</em> : null}</th>)}<th className="bulk-calculated-value">評価額</th><th className="bulk-row-actions">状態・操作</th></tr></thead>
          <tbody onPaste={handlePaste} onKeyDown={handleTableKeyDown}>{rows.map((row, rowIndex) => <tr key={row.id} className={row.error ? "has-error" : ""}>
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
            <td className="bulk-row-actions"><span className={row.positionId === null ? "bulk-new-badge" : "bulk-existing-badge"}>{row.positionId === null ? <Plus /> : <CircleCheck />}{row.positionId === null ? "新規" : "登録済"}</span><button type="button" className="icon-button" aria-label={`${rowIndex + 1}行目を複製`} title="行を複製" onClick={() => addRow(row.id, row)}><Copy /></button>{row.positionId === null ? <button type="button" className="icon-button danger" aria-label={`${rowIndex + 1}行目を削除`} title="新規行を削除" onClick={() => removeRow(row.id)}><Trash2 /></button> : null}</td>
          </tr>)}</tbody>
        </table>
      </div>
      <button type="button" className="button secondary bulk-add-row" onClick={() => addRow()}><Plus />新しい行を追加</button>
      <footer><span>保存対象：登録済み {totalExistingCount}件・新規 {activeNewRowCount}件</span><div><button type="button" className="button secondary" onClick={onClose} disabled={saving}>キャンセル</button><button type="button" className="button primary" onClick={() => void submitBulk()} disabled={saving || rows.length === 0}>{saving ? <LoaderCircle className="spin" /> : <CircleCheck />}変更をまとめて保存</button></div></footer>
    </div>
  </div></div>;
}
