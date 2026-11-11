import { useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useLoad } from '../hooks/useLoad';
import { fetchWorkloads, indexWorkloads, type WorkloadIndex } from '../workload';
import type { WorkloadTotal } from '../orgStats';
import type { Staff } from '../types';

// 部署・会社の画面で使う、人数（退職予定）と担当件数の読み込みと出し方

/** 台帳の全員（退職者を含む）と各アプリの担当件数。担当件数は待たずに画面を出す */
export function useOrgWorkload(): { staff: Staff[]; index: WorkloadIndex; loading: boolean; error: string | null } {
  const loadAll = useCallback(() => api.listStaff('all'), []);
  const staff = useLoad(loadAll);
  const workloads = useLoad(fetchWorkloads);
  const index = useMemo(() => indexWorkloads(workloads.data ?? []), [workloads.data]);
  // 読み込み前の空配列も同じものを返す（使う側の useMemo を毎回作り直させない）
  const list = useMemo(() => staff.data ?? [], [staff.data]);
  return {
    staff: list,
    index,
    loading: workloads.data === null || (staff.data === null && staff.error === null),
    error: staff.error,
  };
}

/** 読めなかったアプリの注記（全部読めたら出さない）。1つでも読めなければ合計は「—」 */
export function UnreachableNote({ index, loading }: { index: WorkloadIndex; loading: boolean }) {
  if (loading || index.unreachable.length === 0) return null;
  const all = index.unreachable.length === index.apps.length;
  return (
    <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
      {all
        ? '担当件数をどのアプリからも読めなかったため、担当は「—」にしています。'
        : `${index.unreachable.map((s) => s.label).join('・')}の担当件数を読めなかったため、担当の合計は「—」にしています（欠けたまま足すと少なく見えるため）。社員一覧では読めたアプリの分だけ出ています。`}
      読めているかは「連携」の画面で確かめられます。
    </p>
  );
}

/** 在籍の人数に添える「うち退職予定 N名」。0なら出さない */
export function RetiringLink({ count, to }: { count: number; to: string }) {
  if (count === 0) return null;
  return (
    <Link
      to={to}
      onClick={(e) => e.stopPropagation()}
      className="mt-0.5 block whitespace-nowrap text-xs text-orange-700 hover:underline"
      title="退職日が決まっていて、まだ在籍している人を社員一覧で見る"
    >
      うち退職予定 {count}名
    </Link>
  );
}

/** 担当（進行中）の合計。退職予定の人の分と、退職した人に残っている分は分けて添える */
export function WorkloadSummary({ workload, loading, retiredTo }: { workload: WorkloadTotal; loading: boolean; retiredTo: string }) {
  if (loading) return <span className="text-slate-400">…</span>;
  if (workload === null) return <span className="text-slate-400" title="担当件数を読めないアプリがあるため、合計を出していません">—</span>;
  return (
    <>
      <span>{workload.active}件</span>
      {workload.retiring > 0 && (
        <span className="mt-0.5 block whitespace-nowrap text-xs text-orange-700">うち退職予定の人 {workload.retiring}件</span>
      )}
      {workload.retired > 0 && (
        <Link
          to={retiredTo}
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5 block whitespace-nowrap text-xs font-medium text-red-700 hover:underline"
          title="退職した人にまだ残っている担当（進行中）。引き継ぎ先は各アプリで決めてください"
        >
          ほかに退職者の担当 {workload.retired}件
        </Link>
      )}
    </>
  );
}
