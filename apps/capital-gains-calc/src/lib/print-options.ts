/**
 * 印刷に含める内容の選択肢。
 * 本紙（入力・計算結果）は常に印刷するので選択肢には出さない。
 */
export const PRINT_OPTIONS = [
    {
        key: "reference",
        label: "参考資料を含める",
        hint: "税率一覧・償却率表・ミニマムタックスの概要を2枚目に印刷します",
    },
] as const;

export type PrintOptionKey = (typeof PRINT_OPTIONS)[number]["key"];
export type PrintOptions = Record<PrintOptionKey, boolean>;

export const INITIAL_PRINT_OPTIONS: PrintOptions = { reference: false };
