import { describe, expect, it } from "vitest";
import { exportFileName, warekiStamp } from "./exportFileName";
import { formatInputValue, formatYen, parseFormattedNumber, parseIntInput } from "./utils";

describe("金額の入力", () => {
    it("全角数字・カンマ・数字以外の文字を整えてカンマ区切りにする", () => {
        expect(formatInputValue("３０００００００")).toBe("30,000,000");
        expect(formatInputValue("1,2345")).toBe("12,345");
        expect(formatInputValue("12万")).toBe("12");
        expect(formatInputValue("")).toBe("");
        expect(formatInputValue(null)).toBe("");
    });

    it("カンマ区切りを数値に戻す", () => {
        expect(parseFormattedNumber("30,000,000")).toBe(30_000_000);
        expect(parseFormattedNumber("３,０００")).toBe(3_000);
        expect(parseFormattedNumber("")).toBe(0);
        expect(parseFormattedNumber("abc")).toBe(0);
    });

    it("年数は 0 以上の整数", () => {
        expect(parseIntInput("22")).toBe(22);
        expect(parseIntInput("-3")).toBe(0);
        expect(parseIntInput("")).toBe(0);
    });

    it("formatYen", () => {
        expect(formatYen(2_932_123)).toBe("2,932,123円");
    });
});

describe("exportFileName", () => {
    it("和暦の日付印は日本時間で、元号年を2桁に揃える", () => {
        expect(warekiStamp(new Date("2026-10-04T15:30:00Z"))).toBe("R081005");
        expect(warekiStamp(new Date("2019-05-01T00:00:00+09:00"))).toBe("R010501");
    });

    it("名前が無ければ日付印とアプリ名だけ", () => {
        expect(exportFileName([], "pdf", new Date("2026-10-20T12:00:00+09:00"))).toBe("R081020_退職金税額計算.pdf");
    });

    it("ファイル名に使えない文字を落とし、_ は空白へ寄せる", () => {
        expect(exportFileName("山田/太郎_様", ".pdf", new Date("2026-10-20T12:00:00+09:00"))).toBe("R081020_山田太郎 様_退職金税額計算.pdf");
    });
});
