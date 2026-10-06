import { exportFileName } from "@/lib/export-filename";
import { matchesSearchTerms, normalizeSearchText } from "@/lib/clients";
import {
  type Position,
  type PropertyType,
  buildingTypeByValue,
  categoryLabels,
  categoryRank,
  institutionOrPropertyAddress,
  landCategoryByValue,
  ownershipFraction,
  propertyArea,
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
  fixedAssetTaxValue: number | null;
  valueJpy: number;
  valuationMethod: string;
  valuationDetail: string;
  note: string;
};

/**
 * その明細を開くためのURL。一覧に載るのは各顧客の現在年度の明細だけなので、
 * 年度（?snapshot=）は付けない（付けなければ明細画面は現在年度を開く）。
 */
export const propertyPositionHref = (row: PropertyRow) => `/customers/${row.householdId}/positions?position=${row.positionId}`;

/** 検索対象になる項目。表示側のハイライトもこの項目に対して行う。 */
export const PROPERTY_SEARCH_FIELDS = [
  "clientName", "clientNameKana", "clientCode", "assignedStaff",
  "categoryLabel", "propertyTypeLabel", "name", "address", "useLabel",
] as const satisfies readonly (keyof PropertyRow)[];

/** 土地は地目、建物は建物用途を「地目・用途」欄に出す。 */
const propertyUseLabel = (position: Position, propertyType: PropertyType) => propertyType === "LAND"
  ? landCategoryByValue.get(position.assetDetails?.landCategory ?? "")?.label ?? ""
  : buildingTypeByValue.get(position.assetDetails?.buildingType ?? "")?.label ?? "";

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
    area: propertyArea(position, propertyType),
    ownership: ownershipFraction(position),
    fixedAssetTaxValue: position.fixedAssetTaxValue,
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

/** 不動産一覧の並び替え。選択肢と並べ方をここだけに置く（表示側は value を渡すだけ）。 */
export const PROPERTY_SORT_MODES = [
  { value: "client", label: "顧客順（カナ）" },
  { value: "value-desc", label: "評価額の大きい順" },
  { value: "value-asc", label: "評価額の小さい順" },
] as const;

export type PropertySortMode = typeof PROPERTY_SORT_MODES[number]["value"];

/**
 * 既定は顧客順。APIの `orderBy` は顧客名の昇順＝漢字のコードポイント順で、
 * 顧客一覧と同じく人間には無意味な並びなので、画面側でカナ順へ並べ直す。
 */
export const PROPERTY_SORT_DEFAULT: PropertySortMode = "client";

/** 比較器は1つだけ作る（行数×比較回数で呼ばれるため、比較のたびに new しない）。 */
const collator = new Intl.Collator("ja", { numeric: true });

/** カナは任意入力なので、空のときは漢字名で代替する（顧客一覧の kanaSortKey と同じ規則）。 */
const ownerSortKey = (row: PropertyRow) => normalizeSearchText(row.clientNameKana || row.clientName);

/**
 * 同じ顧客・同じ金額の行は 0 を返して元の順（APIの `sortOrder`＝明細画面の並び）のまま残す。
 * 配列の並び替えは安定なので、これで並びがぶれることはない。
 */
export function sortProperties(rows: PropertyRow[], mode: PropertySortMode) {
  const sorted = [...rows];
  if (mode === "value-desc") sorted.sort((left, right) => right.valueJpy - left.valueJpy);
  else if (mode === "value-asc") sorted.sort((left, right) => left.valueJpy - right.valueJpy);
  else sorted.sort((left, right) => collator.compare(ownerSortKey(left), ownerSortKey(right)));
  return sorted;
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
  { header: "固定資産税評価額（円）", value: (row) => row.fixedAssetTaxValue === null ? "" : String(row.fixedAssetTaxValue) },
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

/** 書き出したCSVのファイル名。バックアップのJSONと同じ付け方に揃える。 */
export const propertiesCsvFileName = (now?: Date) => exportFileName("不動産一覧", "csv", now);
