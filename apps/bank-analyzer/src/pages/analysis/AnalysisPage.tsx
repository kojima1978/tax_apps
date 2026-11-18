// 分析画面（Django: analysis_dashboard / analysis.html）。見出し・直前の分類変更・左のメニューと、
// ?tab= で選んだタブの中身。タブを切り替えると絞り込みは外れる（Django 版と同じ: ?tab= だけのリンク）。
//
// Django 版との違い:
// - 「AI分類」を「分類候補」と呼ぶ。中身は登録済みのキーワードとのあいまい一致で、AI ではない
// - 候補の件数は候補のタブ以外でも数える（server/services/dashboard.ts）
// - 書き出せないとき（取引が無い・分類済みが無いなど）は JSON が画面いっぱいに出ていた。通知に出す

import { useEffect, useRef, useState, type ComponentType } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeftRight,
  ArrowRight,
  Check,
  CircleHelp,
  ClipboardList,
  DatabaseBackup,
  FileSpreadsheet,
  FileUp,
  FolderOpen,
  Gauge,
  History,
  Home,
  Keyboard,
  Lightbulb,
  Mail,
  Pencil,
  Plus,
  Settings,
  Sparkles,
  Table2,
  Undo2,
  X,
  type LucideProps,
} from 'lucide-react';
import { DownloadButton } from '../../components/DownloadButton';
import { Breadcrumb } from '../../components/Layout';
import { useNotice } from '../../components/Notice';
import { OperatorPicker } from '@/shared/staff-directory/OperatorPicker';
import { useAction } from '../../hooks/useAction';
import { useApiData } from '../../hooks/useApiData';
import { api } from '../../lib/api';
import { num } from '../../lib/format';
import { clearLastImport, loadLastImport } from '../import/lastImport';
import { FORMAT_GUIDE_ID } from '../import/FormatGuide';
import { AllTab } from './AllTab';
import { UnclassifiedTab } from './UnclassifiedTab';
import { AiTab } from './AiTab';
import { FlaggedTab } from './FlaggedTab';
import { TransfersTab } from './TransfersTab';
import { CleanupTab } from './CleanupTab';
import { OverviewTab } from './OverviewTab';
import { TABS, type Dashboard, type DashboardSummary, type OverviewData, type Tab, type TabData } from './types';

type NavItem = { tab: Tab; label: string; icon: ComponentType<LucideProps>; badge?: (d: DashboardSummary) => { count: number; tone: string } };

const NAV: { title: string; items: NavItem[] }[] = [
  { title: '案件の確認', items: [{ tab: 'overview', label: '概要', icon: Gauge }] },
  {
    title: '取引を整理',
    items: [
      { tab: 'all', label: '取引一覧・検索', icon: Table2 },
      { tab: 'unclassified', label: '未分類', icon: CircleHelp, badge: (d) => ({ count: d.unclassifiedCount, tone: 'bg-amber-400 text-slate-900' }) },
      { tab: 'ai', label: '分類候補', icon: Lightbulb, badge: (d) => ({ count: d.suggestionsCount, tone: 'bg-blue-700 text-white' }) },
      { tab: 'cleanup', label: 'データクレンジング', icon: Sparkles },
    ],
  },
  {
    title: '分析・質問',
    items: [
      { tab: 'transfers', label: '資金移動フロー', icon: ArrowLeftRight },
      { tab: 'flagged', label: '質問候補', icon: ClipboardList, badge: (d) => ({ count: d.flaggedCount, tone: 'bg-cyan-600 text-white' }) },
    ],
  },
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

      <LastImportStrip caseId={data.case.id} />
      {data.noData ? (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[15rem_minmax(0,1fr)]">
          <aside aria-label="案件メニュー" className="lg:sticky lg:top-4 lg:self-start"><GlobalCaseMenu /></aside>
          <NoData caseId={data.case.id} backup={data.latestDeletionBackup} onRestored={reload} />
        </div>
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

// 直前の取込の結果（依頼25）へ戻る帯。結果はこのタブの間だけ残る。× で消すと二度と出ない
function LastImportStrip({ caseId }: { caseId: number }) {
  const [last, setLast] = useState(() => loadLastImport(caseId));
  if (!last) return null;
  const dismiss = () => {
    clearLastImport(caseId);
    setLast(null);
  };
  return (
    <div className="mb-3 flex items-center gap-2 rounded border border-blue-200 print:hidden bg-blue-50 px-3 py-2 text-sm text-blue-900">
      <FileUp size={16} className="shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        直前の取込（{num(last.summary.imported)}件）
        <Link to={`/cases/${caseId}/import/result`} className="ml-2 font-medium underline">
          結果を見る
        </Link>
      </span>
      <button type="button" className="shrink-0 rounded p-1 hover:bg-blue-100" onClick={dismiss} aria-label="取込の結果の案内を閉じる">
        <X size={16} />
      </button>
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
    case 'transfers':
      return <TransfersTab dash={dash as DashboardSummary & TabData['transfers']} reload={reload} />;
    case 'cleanup':
      return <CleanupTab dash={dash as DashboardSummary & TabData['cleanup']} reload={reload} />;
    case 'flagged':
      return <FlaggedTab dash={dash as DashboardSummary & TabData['flagged']} reload={reload} />;
    default:
      return <p className="card p-6 text-sm text-slate-500">この画面は準備中です。</p>;
  }
}

// ---------------------------------------------------------------------------
// 見出し（お客様名の修正）。案件の操作はサイドバーにまとめる
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
    <div className="mb-4 flex flex-wrap items-center gap-3">
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
    <section className="card p-5" aria-labelledby="startTitle">
      <h2 id="startTitle" className="text-lg font-semibold">取引データを追加</h2>
      <p className="mt-1 text-sm text-slate-600">お持ちの資料に合う方法を選んでください。</p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <Sparkles size={22} className="text-blue-700" aria-hidden="true" />
          <h3 className="mt-2 font-semibold text-blue-950">通帳PDFから</h3>
          <p className="mt-1 min-h-10 text-sm text-blue-900">Geminiで文字認識し、Excelにして取り込みます。</p>
          <Link to={`/cases/${caseId}/import#${FORMAT_GUIDE_ID}`} className="btn btn-primary mt-3 w-full">
            Geminiの手順を見る
          </Link>
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <FileUp size={22} className="text-slate-600" aria-hidden="true" />
          <h3 className="mt-2 font-semibold">CSV・Excelから</h3>
          <p className="mt-1 min-h-10 text-sm text-slate-600">すでに作成済みの取引データを取り込みます。</p>
          <Link to={`/cases/${caseId}/import`} className="btn btn-secondary mt-3 w-full">ファイルを取り込む</Link>
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <Keyboard size={22} className="text-slate-600" aria-hidden="true" />
          <h3 className="mt-2 font-semibold">画面で入力</h3>
          <p className="mt-1 min-h-10 text-sm text-slate-600">少ない件数を1件ずつ直接入力します。</p>
          <Link to={`/cases/${caseId}/direct`} className="btn btn-secondary mt-3 w-full">直接入力する</Link>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-4">
        <Link to={`/cases/${caseId}/passbooks`} className="btn btn-secondary btn-sm"><Table2 size={14} aria-hidden="true" />通帳有無一覧表</Link>
        <DownloadButton path={`/cases/${caseId}/export/json`}><DatabaseBackup size={14} aria-hidden="true" />JSONバックアップ</DownloadButton>
      </div>
      {backup && <div className="mt-4 border-t border-slate-200 pt-4"><button type="button" className="btn btn-secondary btn-sm" onClick={restore} disabled={busy !== null}><Undo2 size={14} />直前に削除した{num(backup.transactionCount)}件を復元</button></div>}
    </section>
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
          {change.operatorName && <span className="text-xs text-slate-500">{change.operatorName}</span>}
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

function GlobalCaseMenu() {
  const item = 'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500';
  return (
    <nav className="card p-2 print:hidden" aria-label="共通メニュー">
      <details>
        <summary className="cursor-pointer rounded-md px-2 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">アプリ全体へ</summary>
        <div className="mt-1 grid grid-cols-2 gap-1 border-t border-slate-100 pt-1 lg:grid-cols-1">
          <a href="/" className={item}><Home size={16} aria-hidden="true" />ポータル</a>
          <Link to="/" className={item}><FolderOpen size={16} aria-hidden="true" />案件一覧</Link>
          <Link to="/settings" className={item}><Settings size={16} aria-hidden="true" />設定</Link>
          <a href={`${import.meta.env.BASE_URL}letter`} target="_blank" rel="noopener" className={item}><Mail size={16} aria-hidden="true" />お客様配布用文書</a>
          <Link to="/?new=1" className={item}><Plus size={16} aria-hidden="true" />新規案件</Link>
        </div>
      </details>
      <div className="mt-1 border-t border-slate-200 px-2 pt-2">
        <OperatorPicker usage="取引の分類を変えたとき、変更履歴に名前が残ります" className="max-w-full" />
      </div>
    </nav>
  );
}

function Sidebar({ dash, active }: { dash: DashboardSummary; active: Tab }) {
  const navigate = useNavigate();
  return (
    <aside aria-label="分析メニュー" className="space-y-3 lg:sticky lg:top-4 lg:self-start">
      <label className="card flex items-center gap-3 px-3 py-2 text-sm font-medium lg:hidden">
        <span className="shrink-0">表示する画面</span>
        <select className="input min-w-0 flex-1" value={active} onChange={(event) => navigate(`?tab=${event.target.value}`)}>
          {NAV.map((group) => (
            <optgroup key={group.title} label={group.title}>
              {group.items.map((item) => <option key={item.tab} value={item.tab}>{item.label}</option>)}
            </optgroup>
          ))}
        </select>
      </label>
      <nav className="card hidden p-2 lg:flex lg:flex-col" aria-label="分析機能">
        {NAV.map((group) => (
          <div key={group.title} className="flex flex-col gap-1">
            <span className="px-2 pt-2 text-xs font-semibold text-slate-500">{group.title}</span>
            {group.items.map(({ tab, label, icon: Icon, badge }) => {
              const b = badge?.(dash);
              const current = tab === active;
              return (
                <Link
                  key={tab}
                  to={`?tab=${tab}`}
                  aria-current={current ? 'page' : undefined}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${current ? 'bg-blue-50 font-semibold text-blue-800' : 'text-slate-700 hover:bg-slate-100'}`}
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
      <section className="card p-2" aria-labelledby="caseActionsTitle">
        <h2 id="caseActionsTitle" className="px-2 py-1 text-xs font-semibold text-slate-500">データを追加</h2>
        <div className="grid grid-cols-2 gap-1 lg:grid-cols-1">
          <Link to={`/cases/${dash.case.id}/import`} className="btn btn-secondary btn-sm justify-start"><FileUp size={14} aria-hidden="true" />CSV追加取込</Link>
          <Link to={`/cases/${dash.case.id}/direct`} className="btn btn-secondary btn-sm justify-start"><Keyboard size={14} aria-hidden="true" />直接入力</Link>
        </div>
        <h3 className="mt-2 border-t border-slate-100 px-2 pt-2 pb-1 text-xs font-semibold text-slate-500">資料・バックアップ</h3>
        <div className="grid grid-cols-2 gap-1 lg:grid-cols-1">
          <DownloadButton path={`/cases/${dash.case.id}/export/xlsx/categories`} className="btn btn-success btn-sm col-span-2 w-full justify-start lg:col-span-1"><FileSpreadsheet size={14} aria-hidden="true" />分類別Excel出力</DownloadButton>
          <Link to={`/cases/${dash.case.id}/passbooks`} className="btn btn-secondary btn-sm justify-start"><Table2 size={14} aria-hidden="true" />通帳有無一覧表</Link>
          <DownloadButton path={`/cases/${dash.case.id}/export/json`} className="btn btn-secondary btn-sm w-full justify-start"><DatabaseBackup size={14} aria-hidden="true" />JSONバックアップ</DownloadButton>
        </div>
      </section>
      <GlobalCaseMenu />
    </aside>
  );
}
