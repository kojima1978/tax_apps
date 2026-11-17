import { z } from "zod";
import { isCurrencyCode, positionCurrencies } from "@/lib/fx-rates";

/** 標準の選択肢（DB には持たない）。これ以外の通貨は共通設定（/settings）で足す（AppCurrency）。 */
export const standardCurrencies = [{ code: "JPY", name: "日本円" }, { code: "USD", name: "米ドル" }, { code: "EUR", name: "ユーロ" }];

/** 共通設定で足す通貨1件。画面からの登録と JSON バックアップの読み込みで同じ規則を使う。 */
export const appCurrencySchema = z.object({
  code: z.string().trim().toUpperCase().refine(isCurrencyCode, "有効な通貨コード（例：CAD）を入力してください。"),
  name: z.string().trim().min(1, "通貨名を入力してください。").max(100),
});

export type AppCurrencyInput = z.infer<typeof appCurrencySchema>;

/**
 * バックアップから足す通貨。標準通貨と、同じファイルの中で重なったコード（先の方を使う）は除く。
 * 既に登録してある通貨は呼び出し側の `skipDuplicates` で何もしない（名前も書き換えない）。
 */
export function addableAppCurrencies(rows: readonly AppCurrencyInput[]): AppCurrencyInput[] {
  const seen = new Set<string>(positionCurrencies);
  return rows.filter((row) => !seen.has(row.code) && seen.add(row.code));
}
