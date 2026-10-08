// 概要タブ（Django: analysis.html の overview）。基準日・分析対象期間・数字のまとめ・次に行う作業・
// 口座一覧・月次入出金。
//
// Django 版との違い（直したもの）:
// - 基準日の保存に失敗しても黙っていた。理由を出す
// - 基準日を変えてもグラフは古いまま（相続開始月以降の除外は読み込み時に決まる）だった。読み直す

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownLeft, ArrowRight, ArrowUpRight, Bookmark, Calculator, CalendarDays, CheckCircle2, ChevronDown, Pencil, Trash2, X } from 'lucide-react';
import { ConfirmDialog } from '../../components/Dialog';
import { DownloadButton } from '../../components/DownloadButton';
import { useNotice } from '../../components/Notice';
import { useAction } from '../../hooks/useAction';
import { api } from '../../lib/api';
import { dateOrDash, num, warekiMonthShort, warekiShort } from '../../lib/format';
import { MonthlyChart } from './MonthlyChart';
import type { DashboardSummary, OverviewData } from './types';

type Props = { dash: DashboardSummary & OverviewData; reload: () => void };

export function OverviewTab({ dash, reload }: Props) {
  const caseId = dash.case.id;
  return (
    <div className="space-y-4">
      <ReferenceDate caseId={caseId} value={dash.case.referenceDate} onSaved={reload} />

      <div className="card flex flex-wrap items-center gap-2 px-4 py-2 text-sm" aria-label="分析対象期間">
        <span className="flex items-center gap-1 font-medium text-slate-500">
          <CalendarDays size={14} />
          分析対象期間
        </span>
        <strong>
          {dash.earliestTransactionDate && dash.latestTransactionDate
            ? `${warekiShort(dash.earliestTransactionDate)}〜${warekiShort(dash.latestTransactionDate)}`
            : '日付未設定'}
        </strong>
        <span className="ml-auto rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600">全{num(dash.totalTxCount)}件</span>
      </div>

      <Kpis dash={dash} />
      <NextStep dash={dash} />
      <AccountList caseId={caseId} accounts={dash.accountSummary} onDeleted={reload} />

      <section className="card p-4" aria-labelledby="monthlyHeading">
        <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 id="monthlyHeading" className="font-semibold">
              月次入出金
            </h2>
            <p className="text-xs text-slate-500">
              {dash.case.referenceDate
                ? `相続開始月（${warekiMonthShort(dash.case.referenceDate)}）以降を除外し、前月までを表示しています`
                : '棒にマウスを重ねると金額を確認できます'}
            </p>
          </div>
          <DownloadButton path={`/cases/${caseId}/export/xlsx/monthly`}>表をExcel出力</DownloadButton>
        </div>
        <MonthlyChart data={dash.chartMonthly} />
      </section>
    </div>
  );
}

function ReferenceDate({ caseId, value, onSaved }: { caseId: number; value: string | null; onSaved: () => void }) {
  const notice = useNotice();
  const { busy, run } = useAction();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');

  const save = async (referenceDate: string) => {
    const res = await run('save', () => api.put<{ message: string }>(`/cases/${caseId}/reference-date`, { referenceDate }));
    if (!res) return;
    notice.success(res.message);
    setEditing(false);
    onSaved();
  };

  return (
    <div className="card flex flex-wrap items-center gap-3 px-4 py-3">
      <span className="text-sm font-medium text-slate-500">基準日（相続開始日）</span>
      {editing ? (
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (draft) void save(draft);
          }}
        >
          <input type="date" className="input w-auto" value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="基準日" required />
          <button type="submit" className="btn btn-primary btn-sm" disabled={busy !== null || !draft}>
            保存
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}>
            キャンセル
          </button>
        </form>
      ) : (
        <div className="flex items-center gap-2">
          {value ? (
            <span className="rounded bg-blue-700 px-2 py-0.5 text-sm text-white">{warekiShort(value)}</span>
          ) : (
            <span className="text-sm text-slate-500">未設定</span>
          )}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            aria-label="基準日を変更"
            title="変更"
            onClick={() => {
              setDraft(value ?? '');
              setEditing(true);
            }}
          >
            <Pencil size={14} />
          </button>
          {value && (
            <button type="button" className="btn btn-outline-danger btn-sm" aria-label="基準日をクリア" title="クリア" onClick={() => save('')} disabled={busy !== null}>
              <X size={14} />
            </button>
          )}
        </div>
      )}
      <span className="text-xs text-slate-500">設定すると、取引の日付に「前・当・後」の印が付きます。</span>
    </div>
  );
}

function Kpis({ dash }: { dash: DashboardSummary & OverviewData }) {
  const items = [
    { label: '総入金', icon: ArrowDownLeft, value: `¥${num(dash.totalIn)}`, tone: 'text-blue-700', note: `入金のある取引 ${num(dash.incomingTxCount)}件` },
    { label: '総出金', icon: ArrowUpRight, value: `¥${num(dash.totalOut)}`, tone: 'text-red-600', note: `出金のある取引 ${num(dash.outgoingTxCount)}件` },
    {
      label: '収支差額',
      icon: Calculator,
      value: `¥${num(dash.netFlow)}`,
      tone: dash.netFlow < 0 ? 'text-red-600' : 'text-emerald-700',
      note: '入金 − 出金',
    },
    { label: '分類進捗', icon: CheckCircle2, value: `${dash.classifiedPct}%`, tone: '', note: `${num(dash.classifiedCount)} / ${num(dash.totalTxCount)}件` },
    { label: '要確認', icon: Bookmark, value: `${num(dash.flaggedCount)}件`, tone: '', note: '付箋付き取引' },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5" aria-label="案件のまとめ">
      {items.map(({ label, icon: Icon, value, tone, note }) => (
        <article key={label} className="card p-3">
          <span className="flex items-center gap-1 text-xs font-medium text-slate-500">
            <Icon size={14} />
            {label}
          </span>
          <strong className={`mt-1 block text-lg tabular-nums ${tone}`}>{value}</strong>
          <small className="text-xs text-slate-500">{note}</small>
        </article>
      ))}
    </div>
  );
}

function NextStep({ dash }: { dash: DashboardSummary }) {
  const step = dash.unclassifiedCount
    ? {
        title: `${num(dash.unclassifiedCount)}件の未分類取引を確認`,
        text: dash.suggestionsCount ? `分類候補が${num(dash.suggestionsCount)}件あります。候補から進めると効率的です。` : '摘要ごとにまとめて分類できます。',
        tab: dash.suggestionsCount ? 'ai' : 'unclassified',
        action: dash.suggestionsCount ? '分類候補を開く' : '未分類を開く',
      }
    : dash.flaggedCount
      ? { title: `${num(dash.flaggedCount)}件の付箋を確認`, text: '確認事項やメモが残っている取引を整理しましょう。', tab: 'flagged', action: '質問候補を開く' }
      : null;
  return (
    <section className="card border-l-4 border-l-emerald-500 p-4" aria-labelledby="nextStepHeading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-xs font-semibold text-emerald-700">次に行う作業</span>
          <h2 id="nextStepHeading" className={step ? 'text-base font-semibold' : 'text-sm text-slate-600'}>
            {step?.title ?? '主要な確認作業は完了しています'}
          </h2>
          {step && <p className="text-sm text-slate-600">{step.text}</p>}
        </div>
        {step && (
          <Link to={`?tab=${step.tab}`} className="btn btn-success">
            {step.action}
            <ArrowRight size={16} />
          </Link>
        )}
      </div>
    </section>
  );
}

function AccountList({ caseId, accounts, onDeleted }: { caseId: number; accounts: OverviewData['accountSummary']; onDeleted: () => void }) {
  const notice = useNotice();
  const { busy, run } = useAction();
  const [target, setTarget] = useState<string | null>(null);

  const remove = async () => {
    if (target === null) return;
    const res = await run('delete', () => api.post<{ message: string }>(`/cases/${caseId}/accounts/delete`, { accountNumber: target }));
    setTarget(null);
    if (!res) return;
    notice.success(res.message);
    onDeleted();
  };

  return (
    <details className="card group p-4">
      <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold">
        登録口座一覧
        <span className="rounded bg-slate-500 px-2 py-0.5 text-xs font-normal text-white">{accounts.length}口座</span>
        <ChevronDown size={16} className="ml-auto transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-3 overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>銀行名</th>
              <th>支店名</th>
              <th>口座番号</th>
              <th>種別</th>
              <th>名義人</th>
              <th className="text-right">取引件数</th>
              <th>最終取引</th>
              <th>
                <span className="sr-only">操作</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.accountNumber}>
                <td>{a.bankName || '－'}</td>
                <td>{a.branchName || '－'}</td>
                <td className="font-semibold">{a.accountNumber}</td>
                <td>{a.accountType || '－'}</td>
                <td>{a.holder || '－'}</td>
                <td className="text-right tabular-nums">{num(a.count)}件</td>
                <td>{dateOrDash(a.lastDate)}</td>
                <td className="text-right">
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    aria-label={`口座 ${a.accountNumber} の全取引を削除`}
                    title="この口座の取引を全て削除"
                    onClick={() => setTarget(a.accountNumber)}
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ConfirmDialog open={target !== null} onClose={() => setTarget(null)} onConfirm={remove} title="口座データの削除" confirmLabel="削除" danger busy={busy !== null}>
        口座「{target}」の取引を全て削除しますか？この操作は取り消せません。
      </ConfirmDialog>
    </details>
  );
}
