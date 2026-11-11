// 社員の在籍・退職の判定（社員台帳・案件管理と PB の写しで同じものを使う）。
// 原本は shared/staff-retirement/、各アプリの写しは shared/sync.sh で配る。
//
// 退職日は「最後に在籍する日」。その日までは在籍で、翌日から退職として扱う。
// 未来の日付を入れた人は「退職予定」── 在籍の一覧・担当者の候補に残る。
// 日付は日本時間で決める（サーバーが UTC でも、日本の朝9時前に前日扱いにならないように）。
// 退職日は YYYY-MM-DD の文字列なので、比べるのは文字列の大小で足りる。

export type RetirementState = 'active' | 'scheduled' | 'retired';

const JST_OFFSET_MS = 9 * 3600 * 1000;

/** 日本時間の今日（YYYY-MM-DD） */
export function jstToday(now: Date = new Date()): string {
  return new Date(now.getTime() + JST_OFFSET_MS).toISOString().slice(0, 10);
}

/** 退職日を過ぎたか（退職日の当日はまだ在籍） */
export function isRetired(retiredOn: string | null, today: string = jstToday()): boolean {
  return retiredOn !== null && retiredOn < today;
}

/** 在籍・退職予定（退職日が今日以降）・退職 */
export function retirementState(retiredOn: string | null, today: string = jstToday()): RetirementState {
  if (retiredOn === null) return 'active';
  return isRetired(retiredOn, today) ? 'retired' : 'scheduled';
}

/** 退職日まであと何日か（当日は0）。退職予定でなければ null */
export function daysUntilRetirement(retiredOn: string | null, today: string = jstToday()): number | null {
  if (retirementState(retiredOn, today) !== 'scheduled') return null;
  return Math.round((Date.parse(`${retiredOn}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}
