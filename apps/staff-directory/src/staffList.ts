import type { Staff } from './types';

// 社員一覧の「未入力」の絞り込み（URL の ?missing=kana など）と、部署の小見出し・「次の人」の決め方。
// 画面から切り離して、並び・絞り込みの答えをテストで確かめられるようにしている

export const MISSING_KEYS = ['kana', 'employeeNo', 'mobile'] as const;
export type MissingKey = (typeof MISSING_KEYS)[number];

export const MISSING_LABEL: Record<MissingKey, string> = {
  kana: 'フリガナ未入力',
  employeeNo: '社員番号未入力',
  mobile: '携帯未入力',
};

export function parseMissing(v: string | null): MissingKey | null {
  return MISSING_KEYS.find((k) => k === v) ?? null;
}

// フリガナは姓の読みが無いか、名があるのに名の読みが無ければ未入力（名の無い人に名の読みは求めない）。
// 社員番号は一覧に出している主所属の番号
export function isMissing(s: Staff, key: MissingKey): boolean {
  switch (key) {
    case 'kana':
      return s.familyKana === '' || (s.givenName !== '' && s.givenKana === '');
    case 'employeeNo':
      return !s.employeeNo;
    case 'mobile':
      return s.mobilePhone === '';
  }
}

export function countMissing(rows: Staff[]): Record<MissingKey, number> {
  const counts = { kana: 0, employeeNo: 0, mobile: 0 };
  for (const s of rows) for (const k of MISSING_KEYS) if (isMissing(s, k)) counts[k]++;
  return counts;
}

// 部署の小見出しを入れる位置。主所属の会社・部署が前の行と変わったところに入れる
export type StaffGroup = { key: string; companyName: string | null; departmentName: string | null; staff: Staff[] };

export function groupByDepartment(rows: Staff[]): StaffGroup[] {
  const groups: StaffGroup[] = [];
  for (const s of rows) {
    const key = `${s.companyId ?? ''}/${s.departmentId ?? ''}`;
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.staff.push(s);
    else groups.push({ key, companyName: s.companyName, departmentName: s.departmentName, staff: [s] });
  }
  return groups;
}

// 今の絞り込み・並びで、id の人の次の人（いなければ null）
export function nextStaffId(rows: Staff[], id: number): number | null {
  const i = rows.findIndex((s) => s.id === id);
  return i >= 0 && i + 1 < rows.length ? rows[i + 1].id : null;
}
