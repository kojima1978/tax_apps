// 分析画面（Django: analysis_dashboard / analysis.html）。見出し・直前の分類変更・左のメニューと、
// ?tab= で選んだタブの中身。タブを切り替えると絞り込みは外れる（Django 版と同じ: ?tab= だけのリンク）。
//
// Django 版との違い:
// - 「AI分類」を「分類候補」と呼ぶ。中身は登録済みのキーワードとのあいまい一致で、AI ではない
// - 候補の件数は候補のタブ以外でも数える（server/services/dashboard.ts）
// - 書き出せないとき（取引が無い・分類済みが無いなど）は JSON が画面いっぱいに出ていた。通知に出す

import { useEffect, useRef, useState, type ComponentType } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeftRight,
  ArrowRight,
  Check,
  CircleHelp,
  ClipboardList,
  DatabaseBackup,
  FileSpreadsheet,
  FileUp,
  Gauge,
  History,
  Keyboard,
  Lightbulb,
  Pencil,
  Sparkles,
  Table2,
  Undo2,
  type LucideProps,
} from 'lucide-react';
import { DownloadButton } from '../../components/DownloadButton';
import { Breadcrumb } from '../../components/Layout';
import { useNotice } from '../../components/Notice';
import { useAction } from '../../hooks/useAction';
import { useApiData } from '../../hooks/useApiData';
import { api } from '../../lib/api';
import { num } from '../../lib/format';
import { AllTab } from './AllTab';
import { UnclassifiedTab } from './UnclassifiedTab';
import { AiTab } from './AiTab';
import { OverviewTab } from './OverviewTab';
import { TABS, type Dashboard, type DashboardSummary, type OverviewData, type Tab, type TabData } from './types';

type NavItem = { tab: Tab; label: string; icon: ComponentType<LucideProps>; badge?: (d: DashboardSummary) => { count: number; tone: string } };

const NAV: { title: string; items: NavItem[] }[] = [
  { title: '案件', items: [{ tab: 'overview', label: '概要', icon: Gauge }] },
  {
    title: '取引処理',
    items: [
      { tab: 'all', label: '取引一覧・検索', icon: Table2 },
      { tab: 'unclassified', label: '未分類', icon: CircleHelp, badge: (d) => ({ count: d.unclassifiedCount, tone: 'bg-amber-400 text-slate-900' }) },
      { tab: 'ai', label: '分類候補', icon: Lightbulb, badge: (d) => ({ count: d.suggestionsCount, tone: 'bg-blue-700 text-white' }) },
    ],
  },
  {
    title: '分析',
    items: [
      { tab: 'transfers', label: '資金移動フロー', icon: ArrowLeftRight },
      { tab: 'flagged', label: '質問候補', icon: ClipboardList, badge: (d) => ({ count: d.flaggedCount, tone: 'bg-cyan-600 text-white' }) },
    ],
  },
  { title: 'データ管理', items: [{ tab: 'cleanup', label: 'データクレンジング', icon: Sparkles }] },
];

const parseTab = (v: string | null): Tab => ((TABS as readonly string[]).includes(v ?? '') ? (v as Tab) : 'overview');

export function AnalysisPage() {
  const { caseId } = useParams();
  const [searchParams] = useSearchParams();
  const tab = parseTab(searchParams.get('tab'));
  const query = new URLSearchParams(searchParams);
  query.set('tab', tab);
  const { data, error, loading, reload, setData } = useApiData(`dash-${caseId}-${query}`, () =>
    api.get<Dashboard>(`/cases/${caseId}/dashboard?${query}`),
  );

  if (!data) {
    return (
      <div className="mx-auto max-w-[1600px] px-4 py-6">
        {error ? <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : <p className="text-sm text-slate-500">読み込み中…</p>}
      </div>
    );
  }

  const rename = (name: string) => setData({ ...data, case: { ...data.case, name } });

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6">
      <Breadcrumb items={[{ label: '案件一覧', to: '/' }, { label: data.case.name }]} />
      <Header caseId={data.case.id} name={data.case.name} onRenamed={rename} />
      {error && <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}

      {data.noData ? (
        <NoData caseId={data.case.id} backup={data.latestDeletionBackup} onRestored={reload} />
      ) : (
        <>
          {data.latestClassificationChange && <HistoryStrip caseId={data.case.id} change={data.latestClassificationChange} onUndone={reload} />}
          <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[15rem_minmax(0,1fr)]">
            <Sidebar dash={data} active={tab} />
            <div aria-busy={loading} className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
              <TabContent dash={data} reload={reload} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// 開いているタブの中身。読み直しの間は前のタブのデータが残るので、data.activeTab で選ぶ
function TabContent({ dash, reload }: { dash: Exclude<Dashboard, { noData: true }>; reload: () => void }) {
  switch (dash.activeTab) {
    case 'overview':
      return <OverviewTab dash={dash as DashboardSummary & OverviewData} reload={reload} />;
    case 'all':
      return <AllTab dash={dash as DashboardSummary & TabData['all']} reload={reload} />;
    case 'unclassified':
      return <UnclassifiedTab dash={dash as DashboardSummary & TabData['unclassified']} reload={reload} />;
    case 'ai':
      return <AiTab dash={dash as DashboardSummary & TabData['ai']} reload={reload} />;
    default:
      return <p className="card p-6 text-sm text-slate-500">この画面は準備中です。</p>;
  }
}

// ---------------------------------------------------------------------------
// 見出し（お客様名の修正・書き出し・取込への入口）
// ---------------------------------------------------------------------------

function Header({ caseId, name, onRenamed }: { caseId: number; name: string; onRenamed: (name: string) => void }) {
  const notice = useNotice();
  const { busy, run } = useAction();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const cancel = () => {
    setEditing(false);
    setFieldError(null);
  };
  const save = async () => {
    const value = draft.trim();
    if (!value) {
      setFieldError('お客様名を入力してください');
      return;
    }
    const res = await run('rename', () => api.patch<{ name: string; message: string }>(`/cases/${caseId}`, { name: value }));
    if (!res) return;
    onRenamed(res.name);
    notice.success(res.message);
    cancel();
  };

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      {editing ? (
        <form
          noValidate
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <label htmlFor="caseNameInput" className="text-sm font-medium">
            お客様名
          </label>
          <input
            ref={inputRef}
            id="caseNameInput"
            className="input w-72"
            value={draft}
            maxLength={255}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && (e.preventDefault(), cancel())}
            aria-invalid={fieldError !== null}
            aria-describedby="caseNameError"
            autoComplete="off"
          />
          <button type="submit" className="btn btn-primary" disabled={busy !== null}>
            <Check size={16} />
            保存
          </button>
          <button type="button" className="btn btn-secondary" onClick={cancel}>
            キャンセル
          </button>
          <p id="caseNameError" role="alert" className="w-full text-sm text-red-700">
            {fieldError}
          </p>
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold">編集・分析: {name}</h1>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            aria-label="お客様名を修正"
            onClick={() => {
              setDraft(name);
              setEditing(true);
            }}
          >
            <Pencil size={14} />
            修正
          </button>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <DownloadButton path={`/cases/${caseId}/export/xlsx/categories`} className="btn btn-success btn-sm">
          <FileSpreadsheet size={14} />
          分類別Excel出力
        </DownloadButton>
        <Link to={`/cases/${caseId}/passbooks`} className="btn btn-secondary btn-sm">
          <Table2 size={14} />
          通帳有無一覧表
        </Link>
        <Link to={`/cases/${caseId}/import`} className="btn btn-secondary btn-sm">
          <FileUp size={14} />
          CSV追加取込
        </Link>
        <Link to={`/cases/${caseId}/direct`} className="btn btn-secondary btn-sm">
          <Keyboard size={14} />
          直接入力
        </Link>
        <DownloadButton path={`/cases/${caseId}/export/json`}>
          <DatabaseBackup size={14} />
          JSONバックアップ
        </DownloadButton>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 取引が無いとき
// ---------------------------------------------------------------------------

function NoData({ caseId, backup, onRestored }: { caseId: number; backup: Dashboard['latestDeletionBackup']; onRestored: () => void }) {
  const notice = useNotice();
  const { busy, run } = useAction();
  const restore = async () => {
    if (!backup) return;
    const res = await run('restore', () => api.post<{ message: string }>(`/cases/${caseId}/range-delete/restore`, { backupId: backup.id }));
    if (!res) return;
    notice.success(res.message);
    onRestored();
  };
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4" role="status">
      <h2 className="mb-1 font-semibold text-blue-900">取引データがありません</h2>
      <p className="mb-3 text-sm text-blue-900">CSVまたはExcelファイルを追加取込すると、取引の編集・分析を開始できます。</p>
      <div className="flex flex-wrap gap-2">
        <Link to={`/cases/${caseId}/import`} className="btn btn-primary btn-sm">
          <FileUp size={14} />
          CSV追加取込
        </Link>
        <Link to={`/cases/${caseId}/direct`} className="btn btn-secondary btn-sm">
          <Keyboard size={14} />
          直接入力
        </Link>
        {backup && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={restore} disabled={busy !== null}>
            <Undo2 size={14} />
            直前に削除した{num(backup.transactionCount)}件を復元
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 直前の分類変更（元に戻す）
// ---------------------------------------------------------------------------

const timeFormat = new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', dateStyle: 'short', timeStyle: 'short' });

function HistoryStrip({ caseId, change, onUndone }: { caseId: number; change: NonNullable<DashboardSummary['latestClassificationChange']>; onUndone: () => void }) {
  const notice = useNotice();
  const { busy, run } = useAction();
  const undo = async () => {
    const res = await run('undo', () => api.post<{ message: string }>(`/cases/${caseId}/history/undo`, { changeGroup: change.changeGroup }));
    if (!res) return;
    notice.success(res.message);
    onUndone();
  };
  return (
    <section className="card mb-4 flex flex-wrap items-center gap-3 px-4 py-2" aria-labelledby="historyTitle">
      <History size={18} className="text-slate-500" aria-hidden="true" />
      <div className="min-w-0 flex-1 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <strong id="historyTitle">直前の分類変更</strong>
          <span className="rounded bg-slate-100 px-1.5 text-xs">{num(change.count)}件</span>
          <time dateTime={change.createdAt} className="text-xs text-slate-500">
            {timeFormat.format(new Date(change.createdAt))}
          </time>
        </div>
        <div className="flex flex-wrap items-center gap-1 text-slate-600">
          <span>{change.oldCategory}</span>
          <ArrowRight size={14} aria-hidden="true" />
          <strong className="text-slate-800">{change.newCategory}</strong>
          {change.count === 1 && change.description && <span className="ml-2 truncate text-xs text-slate-500">{change.description}</span>}
        </div>
      </div>
      <button type="button" className="btn btn-secondary btn-sm" onClick={undo} disabled={busy !== null} aria-label={`直前の分類変更 ${change.count}件を元に戻す`}>
        <Undo2 size={14} />
        元に戻す
      </button>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 左のメニュー（狭い画面では上に横並び）
// ---------------------------------------------------------------------------

function Sidebar({ dash, active }: { dash: DashboardSummary; active: Tab }) {
  return (
    <aside aria-label="分析メニュー" className="space-y-3 lg:sticky lg:top-18 lg:self-start">
      <nav className="card flex gap-1 overflow-x-auto p-2 lg:flex-col lg:overflow-visible" aria-label="分析機能">
        {NAV.map((group) => (
          <div key={group.title} className="flex shrink-0 gap-1 lg:flex-col">
            <span className="hidden px-2 pt-2 text-xs font-semibold text-slate-400 lg:block">{group.title}</span>
            {group.items.map(({ tab, label, icon: Icon, badge }) => {
              const b = badge?.(dash);
              const current = tab === active;
              return (
                <Link
                  key={tab}
                  to={`?tab=${tab}`}
                  aria-current={current ? 'page' : undefined}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm whitespace-nowrap ${current ? 'bg-blue-50 font-semibold text-blue-800' : 'text-slate-700 hover:bg-slate-100'}`}
                >
                  <Icon size={16} aria-hidden="true" />
                  <span>{label}</span>
                  {b && <span className={`ml-auto rounded-full px-1.5 text-xs ${b.count ? b.tone : 'bg-slate-100 text-slate-500'}`}>{num(b.count)}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <section className="card hidden p-3 text-sm lg:block" aria-labelledby="outputTitle">
        <span className="text-xs font-semibold text-slate-400">最終成果物</span>
        <h2 id="outputTitle" className="flex items-center gap-1 font-semibold">
          <FileSpreadsheet size={16} aria-hidden="true" />
          分類別Excel
        </h2>
        <p className="my-1 text-xs text-slate-600">分類ごとのシートに加え、多額取引・付箋付き取引もまとめて出力します。</p>
        <p className={`mb-2 text-xs ${dash.unclassifiedCount ? 'text-amber-700' : 'text-emerald-700'}`}>
          {dash.unclassifiedCount ? `未分類 ${num(dash.unclassifiedCount)}件を含みます` : '出力準備完了'}
        </p>
        <DownloadButton path={`/cases/${dash.case.id}/export/xlsx/categories`} className="btn btn-success w-full">
          Excelを出力
        </DownloadButton>
      </section>
    </aside>
  );
}
