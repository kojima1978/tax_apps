import { WORKLOAD_SOURCES, type WorkloadSource } from '../server/linkedApps';
import { PRIMARY_ROLE, WORKLOAD_PATH, parseWorkload, type StaffWorkload, type WorkloadResponse } from './shared/staff-workload/workload';
import { isRetired, jstToday } from '../server/shared/staff-retirement/retirement';
import type { Staff } from './types';

// 社員ごとの担当件数。各アプリ（server/linkedApps.ts の WORKLOAD_SOURCES）をゲートウェイの下から
// まとめて読み、社員一覧の「担当」列・退職者の担当・編集画面の内訳に使う。
// 読むだけ ── 引き継ぎ先は人が決めるので、担当を書き換える口は持たない。
// 読めないアプリ（止まっている・3秒で返らない・形が違う）は「—」にして、一覧は止めない

const TIMEOUT_MS = 3000;

/** 'unreachable' = 止まっている・形が違う（数えられなかった） */
export type AppWorkload = { source: WorkloadSource; data: WorkloadResponse | 'unreachable' };

export async function fetchWorkloads(): Promise<AppWorkload[]> {
  return Promise.all(
    WORKLOAD_SOURCES.map(async (source): Promise<AppWorkload> => {
      try {
        const res = await fetch(source.basePath + WORKLOAD_PATH, { cache: 'no-store', signal: AbortSignal.timeout(TIMEOUT_MS) });
        const data = res.ok ? parseWorkload(await res.json()) : null;
        return { source, data: data ?? 'unreachable' };
      } catch {
        return { source, data: 'unreachable' };
      }
    }),
  );
}

/** 編集画面・ツールチップの1アプリ分 */
export type WorkloadLine =
  | { source: WorkloadSource; unreachable: true }
  | {
      source: WorkloadSource;
      unreachable: false;
      activeLabel: string;
      roles: { key: string; label: string; active: number; total: number; primary: boolean; url: string | null }[];
    };

export type WorkloadIndex = {
  apps: AppWorkload[];
  byStaff: Map<number, Map<WorkloadSource['key'], StaffWorkload>>;
  /** 読めなかったアプリ（「—」） */
  unreachable: WorkloadSource[];
};

export function indexWorkloads(apps: AppWorkload[]): WorkloadIndex {
  const byStaff: WorkloadIndex['byStaff'] = new Map();
  for (const app of apps) {
    if (app.data === 'unreachable') continue;
    for (const s of app.data.staff) {
      let m = byStaff.get(s.staffDirectoryId);
      if (!m) byStaff.set(s.staffDirectoryId, (m = new Map()));
      m.set(app.source.key, s);
    }
  }
  return { apps, byStaff, unreachable: apps.flatMap((a) => (a.data === 'unreachable' ? [a.source] : [])) };
}

/**
 * 一覧の「担当」列の数: 読めたアプリの、主の役割（担当）の進行中の合計。
 * どのアプリも読めなければ null（「—」）
 */
export function primaryActive(index: WorkloadIndex, staffId: number): number | null {
  if (index.unreachable.length === index.apps.length) return null;
  let sum = 0;
  for (const s of index.byStaff.get(staffId)?.values() ?? []) sum += s.counts[PRIMARY_ROLE]?.active ?? 0;
  return sum;
}

/** アプリごとの内訳（WORKLOAD_SOURCES の順）。リンクは進行中が1件以上の役割だけ（飛んだ先の一覧と件数が合うように） */
export function workloadLines(index: WorkloadIndex, staffId: number): WorkloadLine[] {
  return index.apps.map((app): WorkloadLine => {
    if (app.data === 'unreachable') return { source: app.source, unreachable: true };
    const s = index.byStaff.get(staffId)?.get(app.source.key);
    return {
      source: app.source,
      unreachable: false,
      activeLabel: app.data.activeLabel,
      roles: app.data.roles.map((r) => {
        const c = s?.counts[r.key] ?? { active: 0, total: 0 };
        const link = s?.links[r.key];
        return {
          key: r.key,
          label: r.label,
          active: c.active,
          total: c.total,
          primary: r.key === PRIMARY_ROLE,
          url: link && c.active > 0 ? app.source.basePath + link : null,
        };
      }),
    };
  });
}

/** 1役割の件数の書き方。進行中とすべてが違うときだけ「すべて」を添える */
export function formatRoleCount(r: { label: string; active: number; total: number }): string {
  return `${r.label} ${r.active}件${r.total !== r.active ? `（すべて ${r.total}件）` : ''}`;
}

/** 一覧の「担当」列のツールチップ。件数のあるアプリと読めなかったアプリだけ並べる */
export function workloadTitle(lines: WorkloadLine[]): string {
  const out = lines.flatMap((l) => {
    if (l.unreachable) return [`${l.source.label}: —（読めませんでした）`];
    const roles = l.roles.filter((r) => r.total > 0);
    return roles.length ? [`${l.source.label}: ${roles.map(formatRoleCount).join('・')}`] : [];
  });
  return out.length ? out.join('\n') : '担当している案件はありません';
}

/** 担当（進行中）が1件以上ある人 */
export function withWorkload(staff: Staff[], index: WorkloadIndex): Staff[] {
  return staff.filter((s) => (primaryActive(index, s.id) ?? 0) > 0);
}

/** 退職者（退職日を過ぎた人）のうち、まだ担当（進行中）が残っている人。退職予定の人は入れない */
export function retiredWithWorkload(staff: Staff[], index: WorkloadIndex, today: string = jstToday()): Staff[] {
  return withWorkload(staff.filter((s) => isRetired(s.retiredOn, today)), index);
}

/** 編集画面の注意に使う、まだ残っている担当（主の役割の進行中）。一覧へのリンクつき */
export function remainingWorkload(lines: WorkloadLine[]): { app: string; active: number; url: string | null }[] {
  return lines.flatMap((l) => {
    if (l.unreachable) return [];
    const r = l.roles.find((x) => x.primary);
    return r && r.active > 0 ? [{ app: l.source.label, active: r.active, url: r.url }] : [];
  });
}
