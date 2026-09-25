import { describe, expect, it } from "vitest";
import { dateJaWithWareki, dateWareki } from "@/lib/format";
import { type EraCode, eraMaxYear, eras, isoToWareki, warekiToIso } from "@/lib/wareki";

describe("dateJaWithWareki", () => {
  it("西暦に和暦の年だけを添える（月日は繰り返さない）", () => {
    expect(dateJaWithWareki("1978-12-22")).toBe("1978（昭和53）年12月22日");
    expect(dateJaWithWareki("2026-01-01")).toBe("2026（令和8）年1月1日");
  });

  it("改元の年は「元」になる", () => {
    expect(dateJaWithWareki("1989-01-08")).toBe("1989（平成元）年1月8日");
    expect(dateJaWithWareki("2019-05-01")).toBe("2019（令和元）年5月1日");
  });

  it("改元日の前日はまだ前の元号", () => {
    expect(dateJaWithWareki("1989-01-07")).toBe("1989（昭和64）年1月7日");
    expect(dateJaWithWareki("2019-04-30")).toBe("2019（平成31）年4月30日");
  });
});

describe("eras", () => {
  // 表示は Intl、入力はこの表と、元号の知識が2箇所にある。改元日がずれていれば
  // 「入力した元号と、その下に出る和暦が違う」形で表に出るので、ここで突き合わせる。
  it("各元号の開始日は Intl でも元年の同じ日になる", () => {
    for (const era of eras) {
      expect(dateWareki(era.startDate)).toBe(`${era.label}元年${Number(era.startDate.slice(5, 7))}月${Number(era.startDate.slice(8, 10))}日`);
    }
  });

  it("各元号の終了日は Intl でも同じ元号の最終年になる", () => {
    for (const era of eras) {
      if (!("endDate" in era) || !era.endDate) continue;
      expect(dateWareki(era.endDate)).toBe(`${era.label}${eraMaxYear(era.code)}年${Number(era.endDate.slice(5, 7))}月${Number(era.endDate.slice(8, 10))}日`);
    }
  });

  it("元号年の上限は改元の年まで（昭和64年・平成31年）", () => {
    expect(eraMaxYear("SHOWA")).toBe(64);
    expect(eraMaxYear("HEISEI")).toBe(31);
    expect(eraMaxYear("TAISHO")).toBe(15);
    expect(eraMaxYear("MEIJI")).toBe(45);
  });
});

describe("warekiToIso", () => {
  it("元号・年・月・日を西暦に組み立てる", () => {
    expect(warekiToIso("SHOWA", 62, 3, 21)).toBe("1987-03-21");
    expect(warekiToIso("HEISEI", 1, 1, 8)).toBe("1989-01-08");
    expect(warekiToIso("REIWA", 8, 9, 25)).toBe("2026-09-25");
    expect(warekiToIso("MEIJI", 45, 7, 29)).toBe("1912-07-29");
  });

  it("選んだ元号の期間外は受け付けない（黙って隣の元号として保存しない）", () => {
    // 1989-01-08 は平成元年。昭和64年は1月7日まで
    expect(warekiToIso("SHOWA", 64, 1, 7)).toBe("1989-01-07");
    expect(warekiToIso("SHOWA", 64, 1, 8)).toBeNull();
    // 2019-05-01 は令和元年。平成31年は4月30日まで
    expect(warekiToIso("HEISEI", 31, 4, 30)).toBe("2019-04-30");
    expect(warekiToIso("HEISEI", 31, 5, 1)).toBeNull();
    // 改元年の改元前も同じ扱い（昭和元年は12月25日から）
    expect(warekiToIso("SHOWA", 1, 3, 21)).toBeNull();
    expect(warekiToIso("SHOWA", 1, 12, 25)).toBe("1926-12-25");
  });

  it("実在しない日付は受け付けない", () => {
    expect(warekiToIso("HEISEI", 15, 2, 30)).toBeNull();
    expect(warekiToIso("SHOWA", 62, 13, 1)).toBeNull();
    expect(warekiToIso("SHOWA", 62, 3, 0)).toBeNull();
    expect(warekiToIso("SHOWA", 0, 3, 21)).toBeNull();
    expect(warekiToIso("SHOWA", 65, 3, 21)).toBeNull();
    expect(warekiToIso("SHOWA", 62.5, 3, 21)).toBeNull();
    expect(warekiToIso("UNKNOWN" as EraCode, 1, 1, 1)).toBeNull();
  });

  it("うるう日は西暦の暦どおりに判定する", () => {
    expect(warekiToIso("HEISEI", 12, 2, 29)).toBe("2000-02-29");
    expect(warekiToIso("HEISEI", 13, 2, 29)).toBeNull();
  });
});

describe("isoToWareki", () => {
  it("西暦から元号・年・月・日に戻す", () => {
    expect(isoToWareki("1987-03-21")).toEqual({ code: "SHOWA", eraYear: 62, month: 3, day: 21 });
    expect(isoToWareki("1989-01-07")).toEqual({ code: "SHOWA", eraYear: 64, month: 1, day: 7 });
    expect(isoToWareki("1989-01-08")).toEqual({ code: "HEISEI", eraYear: 1, month: 1, day: 8 });
    expect(isoToWareki("2019-04-30")).toEqual({ code: "HEISEI", eraYear: 31, month: 4, day: 30 });
    expect(isoToWareki("2019-05-01")).toEqual({ code: "REIWA", eraYear: 1, month: 5, day: 1 });
  });

  it("組み立てと逆変換は往復する", () => {
    for (const [code, eraYear, month, day] of [["MEIJI", 45, 7, 29], ["TAISHO", 15, 12, 24], ["SHOWA", 62, 3, 21], ["HEISEI", 31, 4, 30], ["REIWA", 8, 9, 25]] as const) {
      const iso = warekiToIso(code, eraYear, month, day);
      expect(iso).not.toBeNull();
      expect(isoToWareki(iso as string)).toEqual({ code, eraYear, month, day });
    }
  });

  it("明治より前と不正な形式は null", () => {
    expect(isoToWareki("1868-10-22")).toBeNull();
    expect(isoToWareki("")).toBeNull();
    expect(isoToWareki("1987-3-21")).toBeNull();
  });
});
