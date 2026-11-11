import { daysUntilRetirement, jstToday, retirementState, type RetirementState } from '../server/shared/staff-retirement/retirement';
import type { Staff } from './types';

// 画面での退職予定の出し方。判定そのもの（退職日の翌日から退職）は shared/staff-retirement にだけ置き、
// ここは書き方だけ持つ

export { jstToday, retirementState, type RetirementState };

/** 「11月30日」。今年でなければ「2027年3月31日」 */
export function formatRetireDate(retiredOn: string, today: string = jstToday()): string {
  const [y, m, d] = retiredOn.split('-').map(Number);
  return `${retiredOn.slice(0, 4) === today.slice(0, 4) ? '' : `${y}年`}${m}月${d}日`;
}

/** 退職予定の人の、あと何日か（「今日が最終日」「3日後」） */
export function retireCountdown(retiredOn: string, today: string = jstToday()): string {
  const days = daysUntilRetirement(retiredOn, today);
  if (days === null) return '';
  return days === 0 ? '今日が最終日' : `${days}日後`;
}

/** 退職予定（退職日が今日以降）の人 */
export function scheduledRetirees(staff: Staff[], today: string = jstToday()): Staff[] {
  return staff.filter((s) => retirementState(s.retiredOn, today) === 'scheduled');
}
