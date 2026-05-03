/** 死亡日時点での満年齢（YYYY-MM-DD前提）。算出不能は null */
export function ageOnDate(birth: string | null | undefined, on: string | null | undefined): number | null {
  if (!birth || !on) return null;
  const b = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birth);
  const o = /^(\d{4})-(\d{2})-(\d{2})$/.exec(on);
  if (!b || !o) return null;
  const [, by, bm, bd] = b.map(Number);
  const [, oy, om, od] = o.map(Number);
  let age = oy - by;
  if (om < bm || (om === bm && od < bd)) age--;
  return age >= 0 ? age : null;
}
