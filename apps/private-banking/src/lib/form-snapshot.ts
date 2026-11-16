/**
 * フォームの「いまの入力」を比べられる1つの文字列にする。
 *
 * 「開いたときから何か変えたか」を、欄ごとに state を見比べずに決めるために使う
 * （明細の追加・修正は40を超える欄が科目ごとに入れ替わり、半分は defaultValue のまま DOM が値を持つ）。
 * 保存のときに送るのと同じ FormData を並びごと写すので、「送る内容が変わった＝変更あり」になる。
 * 科目を切り替えて欄が入れ替わったときも、送る内容が変わるので変更ありになる。
 */
export function serializeFormEntries(entries: Iterable<[string, FormDataEntryValue]>): string {
  // ファイルは中身を読まず、名前と大きさだけで比べる（選び直したことが分かれば足りる）。
  return JSON.stringify([...entries].map(([name, value]) => [name, typeof value === "string" ? value : `file:${value.name}:${value.size}`]));
}

export const formSnapshot = (form: HTMLFormElement) => serializeFormEntries(new FormData(form).entries());

/**
 * 開いたときの控え（initial）と比べて、保存していない変更があるか。
 * 控えを取れていない（フォームが無い）ときは「変更なし」に倒す ── 確認を出せないまま閉じられなくなるのを避ける。
 */
export function hasUnsavedFormChanges(initial: string | null, form: HTMLFormElement | null): boolean {
  return initial !== null && form !== null && formSnapshot(form) !== initial;
}
