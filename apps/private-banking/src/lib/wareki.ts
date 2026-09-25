/**
 * 和暦入力のための元号表と相互変換。
 *
 * 表示側（`dateWareki` / `dateJaWithWareki`）は Intl の `ja-JP-u-ca-japanese` に任せているので、
 * ここが持つのは「入力された元号・年・月・日を西暦へ組み立てる」ぶんだけにする。
 * 元号の知識が2箇所になるため、各元号の開始日・終了日が Intl の出力と一致することを
 * テストで縛っている（`__tests__/wareki.test.ts`）。
 */

/** 明治以降の元号。開始日・終了日は改元日そのもの（改元は年の途中に起きる）。 */
export const eras = [
  { code: "REIWA", label: "令和", startDate: "2019-05-01" },
  { code: "HEISEI", label: "平成", startDate: "1989-01-08", endDate: "2019-04-30" },
  { code: "SHOWA", label: "昭和", startDate: "1926-12-25", endDate: "1989-01-07" },
  { code: "TAISHO", label: "大正", startDate: "1912-07-30", endDate: "1926-12-24" },
  { code: "MEIJI", label: "明治", startDate: "1868-10-23", endDate: "1912-07-29" },
] as const satisfies ReadonlyArray<{ code: string; label: string; startDate: string; endDate?: string }>;

export type EraCode = typeof eras[number]["code"];
export type Era = typeof eras[number];

/** 現行元号で受け付ける元号年の上限。入力欄の max に使うだけなので広めに取る。 */
const CURRENT_ERA_MAX_YEAR = 99;

const yearOf = (date: string) => Number(date.slice(0, 4));

export const eraOf = (code: EraCode) => eras.find((era) => era.code === code) as Era;

/** その元号の元年（西暦）。改元年は前の元号と重なる。 */
export const eraStartYear = (code: EraCode) => yearOf(eraOf(code).startDate);

/** その元号に存在する元号年の上限（昭和なら64）。現行元号は決まらないので広めの既定値。 */
export const eraMaxYear = (code: EraCode) => {
  const era = eraOf(code);
  return "endDate" in era && era.endDate ? yearOf(era.endDate) - yearOf(era.startDate) + 1 : CURRENT_ERA_MAX_YEAR;
};

/**
 * 元号・元号年・月・日 → `YYYY-MM-DD`。
 *
 * 実在しない日付（2月30日）に加えて、**選んだ元号の期間外は受け付けない**。
 * 「昭和64年1月8日」や「平成31年5月1日」は暦の上では実在する日付だが、
 * その元号ではないため、黙って平成元年・令和元年として保存すると間違いに気づけない。
 */
export function warekiToIso(code: EraCode, eraYear: number, month: number, day: number) {
  const era = eras.find((candidate) => candidate.code === code);
  if (!era) return null;
  if (!Number.isInteger(eraYear) || eraYear < 1 || eraYear > eraMaxYear(code)) return null;
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  if (!Number.isInteger(day) || day < 1 || day > 31) return null;
  const year = eraStartYear(code) + eraYear - 1;
  const iso = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== iso) return null;
  if (iso < era.startDate || ("endDate" in era && era.endDate && iso > era.endDate)) return null;
  return iso;
}

/** `YYYY-MM-DD` → 元号・元号年・月・日。明治より前は扱わないので null。 */
export function isoToWareki(iso: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const era = eras.find((candidate) => iso >= candidate.startDate && (!("endDate" in candidate) || !candidate.endDate || iso <= candidate.endDate));
  if (!era) return null;
  return {
    code: era.code,
    eraYear: yearOf(iso) - yearOf(era.startDate) + 1,
    month: Number(iso.slice(5, 7)),
    day: Number(iso.slice(8, 10)),
  };
}
