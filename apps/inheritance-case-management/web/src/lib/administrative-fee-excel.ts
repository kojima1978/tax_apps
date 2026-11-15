import type { AdministrativeFeeItem } from "@/types/shared";

/**
 * 行政書士業務の料金表を Excel と行き来させる。
 *
 * 書き出した表をそのまま直して取り込めるように、列の並びは画面と同じ4つに固定する。
 * 取込は「分類＋手続き内容」をキーに単価・備考を上書きするので、
 * 表に無い行は消えない（消すのは画面から）。
 */
export const ADMINISTRATIVE_FEE_EXCEL_HEADERS = ["手続き分類", "手続き内容", "料金", "備考"] as const;

export const ADMINISTRATIVE_FEE_EXCEL_SHEET_NAME = "料金表";

export interface ParsedAdministrativeFeeRow {
  category: string;
  name: string;
  unitPrice: number;
  note: string | null;
}

export interface ParseAdministrativeFeeSheetResult {
  items: ParsedAdministrativeFeeRow[];
  /** 読めなかった行の説明（行番号つき）。1行でもあれば取込を止める */
  errors: string[];
}

/** 書き出し用の二次元配列（1行目は見出し） */
export function administrativeFeeItemsToSheetRows(
  items: Pick<AdministrativeFeeItem, "category" | "name" | "unitPrice" | "note">[],
): (string | number)[][] {
  return [
    [...ADMINISTRATIVE_FEE_EXCEL_HEADERS],
    ...items.map(item => [item.category, item.name, item.unitPrice, item.note ?? ""]),
  ];
}

function toText(value: unknown): string {
  if (value === null || value === undefined) return "";
  // 全角スペースも落とす（Excel の表では見分けが付かない）
  return String(value).replace(/　/g, " ").trim();
}

/** `1,100円` `¥1,100` `１１００` のどれでも拾う。小数・マイナスは受けない */
function parsePrice(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isInteger(value) && value >= 0 ? value : null;
  }
  const text = toText(value)
    .replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[,，\s]/g, "")
    .replace(/^[¥￥]/, "")
    .replace(/円$/, "");
  if (text === "") return 0;
  if (!/^\d+$/.test(text)) return null;
  return Number(text);
}

function isHeaderRow(row: unknown[]): boolean {
  const first = toText(row[0]);
  const second = toText(row[1]);
  return (
    first === ADMINISTRATIVE_FEE_EXCEL_HEADERS[0] ||
    (first.includes("分類") && second.includes("手続")) ||
    (first.includes("区分") && second.includes("内容"))
  );
}

/**
 * Excel の二次元配列を取込用の行へ。
 *
 * 見出し行・空行は読み飛ばす。分類が空の行は、直前の行の分類を引き継ぐ
 * （Excel で分類をまとめて1回だけ書く書き方に合わせる）。
 */
export function parseAdministrativeFeeSheetRows(rows: unknown[][]): ParseAdministrativeFeeSheetResult {
  const items: ParsedAdministrativeFeeRow[] = [];
  const errors: string[] = [];
  let lastCategory = "";

  rows.forEach((row, index) => {
    if (!Array.isArray(row)) return;
    const cells = row.map(toText);
    if (cells.every(cell => cell === "")) return;
    if (isHeaderRow(row)) return;

    const lineNo = index + 1;
    const category = cells[0] || lastCategory;
    const name = cells[1] || "";
    if (!category) {
      errors.push(`${lineNo}行目: 手続き分類がありません`);
      return;
    }
    if (!name) {
      errors.push(`${lineNo}行目: 手続き内容がありません`);
      return;
    }
    const unitPrice = parsePrice(row[2]);
    if (unitPrice === null) {
      errors.push(`${lineNo}行目: 料金「${cells[2]}」を数字として読めません`);
      return;
    }
    lastCategory = category;
    items.push({
      category: category.slice(0, 40),
      name: name.slice(0, 120),
      unitPrice,
      note: cells[3] ? cells[3].slice(0, 200) : null,
    });
  });

  // 同じ分類＋手続き内容が表の中で重複していたら、後に書かれた行を採る
  const byKey = new Map<string, ParsedAdministrativeFeeRow>();
  for (const item of items) byKey.set(`${item.category}\u0000${item.name}`, item);

  return { items: [...byKey.values()], errors };
}
