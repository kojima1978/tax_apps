import { fileTimestamp } from "@/lib/format";
import { matchesSearchTerms } from "@/lib/clients";
import {
  type Position,
  type PropertyType,
  buildingTypeByValue,
  categoryLabels,
  categoryRank,
  institutionOrPropertyAddress,
  landCategoryByValue,
  ownershipFraction,
  propertyTypeLabels,
  propertyTypeOf,
  valuationBreakdown,
} from "@/lib/portfolio-view";

/** 不動産1件に添える顧客・年度の情報（API 側で明細に付ける）。 */
export type PropertyOwner = {
  householdId: number;
  clientCode: string;
  clientName: string;
  clientNameKana: string;
  assignedStaff: string;
  fiscalYear: number;
  asOfDate: string;
};

/** 不動産一覧の1行。全顧客の現在年度のB/Sにある不動産の明細を、表とCSVで同じ形にして扱う。 */
export type PropertyRow = PropertyOwner & {
  positionId: number;
  category: string;
  categoryLabel: string;
  propertyType: PropertyType;
  propertyTypeLabel: string;
  name: string;
  address: string;
  useLabel: string;
  area: number | null;
  ownership: string;
  valueJpy: number;
  valuationMethod: string;
  valuationDetail: string;
  note: string;
};

/** 検索対象になる項目。表示側のハイライトもこの項目に対して行う。 */
export const PROPERTY_SEARCH_FIELDS = [
  "clientName", "clientNameKana", "clientCode", "assignedStaff",
  "categoryLabel", "propertyTypeLabel", "name", "address", "useLabel",
] as const satisfies readonly (keyof PropertyRow)[];

/** 土地は地目、建物は建物用途を「地目・用途」欄に出す。 */
const propertyUseLabel = (position: Position, propertyType: PropertyType) => propertyType === "LAND"
  ? landCategoryByValue.get(position.assetDetails?.landCategory ?? "")?.label ?? ""
  : buildingTypeByValue.get(position.assetDetails?.buildingType ?? "")?.label ?? "";

/** 土地は地積、建物は床面積。どちらも未入力なら null（0㎡と区別する）。 */
const areaOf = (position: Position, propertyType: PropertyType) => propertyType === "LAND"
  ? position.landArea
  : position.assetDetails?.floorArea ?? null;

export function toPropertyRow(position: Position, owner: PropertyOwner): PropertyRow {
  const propertyType = propertyTypeOf(position) ?? "LAND";
  return {
    ...owner,
    positionId: position.id,
    category: position.category,
    categoryLabel: categoryLabels[position.category] ?? position.category,
    propertyType,
    propertyTypeLabel: propertyTypeLabels[propertyType],
    name: position.name,
    address: institutionOrPropertyAddress(position),
    useLabel: propertyUseLabel(position, propertyType),
    area: areaOf(position, propertyType),
    ownership: ownershipFraction(position),
    valueJpy: position.valueJpy,
    valuationMethod: position.valuationMethod,
    valuationDetail: valuationBreakdown(position),
    note: position.note,
  };
}

/**
 * 顧客ごとにまとめ、顧客の中では科目→土地・建物→名称の順に並べる。
 * 顧客の並びは渡された順（DB 側で顧客名の昇順にしている）をそのまま保つ。
 */
export function propertyRows(items: Array<{ position: Position; owner: PropertyOwner }>): PropertyRow[] {
  const ownerOrder = new Map<number, number>();
  for (const { owner } of items) if (!ownerOrder.has(owner.householdId)) ownerOrder.set(owner.householdId, ownerOrder.size);
  const rank = (row: PropertyRow) => [
    ownerOrder.get(row.householdId) ?? 0,
    categoryRank.get(row.category) ?? 99,
    row.propertyType === "LAND" ? 0 : 1,
  ];
  return items
    .map(({ position, owner }) => toPropertyRow(position, owner))
    .sort((left, right) => {
      const [leftRank, rightRank] = [rank(left), rank(right)];
      for (let index = 0; index < leftRank.length; index += 1) {
        if (leftRank[index] !== rightRank[index]) return leftRank[index] - rightRank[index];
      }
      return left.name.localeCompare(right.name, "ja-JP");
    });
}

export type PropertyFilters = { category: string; propertyType: string };
export const PROPERTY_FILTER_ALL = "ALL";

export function matchesProperty(row: PropertyRow, terms: string[]) {
  return matchesSearchTerms(PROPERTY_SEARCH_FIELDS.map((field) => String(row[field])), terms);
}

export function filterProperties(rows: PropertyRow[], terms: string[], filters: PropertyFilters) {
  return rows.filter((row) =>
    (filters.category === PROPERTY_FILTER_ALL || row.category === filters.category)
    && (filters.propertyType === PROPERTY_FILTER_ALL || row.propertyType === filters.propertyType)
    && matchesProperty(row, terms));
}

/** CSVの列。見出しと値をここだけで決め、列を足すときに片方を直し忘れないようにする。 */
export const PROPERTY_CSV_COLUMNS: ReadonlyArray<{ header: string; value: (row: PropertyRow) => string }> = [
  { header: "顧客コード", value: (row) => row.clientCode },
  { header: "顧客名", value: (row) => row.clientName },
  { header: "顧客名カナ", value: (row) => row.clientNameKana },
  { header: "担当者", value: (row) => row.assignedStaff },
  { header: "年度", value: (row) => String(row.fiscalYear) },
  { header: "B/S基準日", value: (row) => row.asOfDate },
  { header: "科目", value: (row) => row.categoryLabel },
  { header: "区分", value: (row) => row.propertyTypeLabel },
  { header: "名称", value: (row) => row.name },
  { header: "所在地", value: (row) => row.address },
  { header: "地目・用途", value: (row) => row.useLabel },
  { header: "面積（㎡）", value: (row) => row.area === null ? "" : String(row.area) },
  { header: "持分", value: (row) => row.ownership },
  { header: "評価額（円）", value: (row) => String(row.valueJpy) },
  { header: "評価方法", value: (row) => row.valuationMethod },
  { header: "算式", value: (row) => row.valuationDetail },
  { header: "備考", value: (row) => row.note },
];

/**
 * Excel で開く前提のCSV。先頭にBOMを付け（付けないと日本語が文字化けする）、
 * 改行はCRLF、値はすべて引用符で囲む（所在地や備考にカンマ・改行が入っても列がずれない）。
 */
export function propertiesCsv(rows: PropertyRow[]) {
  const quote = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const lines = [
    PROPERTY_CSV_COLUMNS.map((column) => quote(column.header)),
    ...rows.map((row) => PROPERTY_CSV_COLUMNS.map((column) => quote(column.value(row)))),
  ];
  return `﻿${lines.map((cells) => cells.join(",")).join("\r\n")}\r\n`;
}

/** 書き出したCSVのファイル名。バックアップのJSONと同じ日時の付け方に揃える。 */
export const propertiesCsvFileName = (now: Date = new Date()) => `private-banking-properties-${fileTimestamp(now)}.csv`;
