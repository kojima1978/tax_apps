// 自動分類のプレビュー（Django: classify_preview.html / classify_preview.js）。
// 登録済みのキーワードを未分類の取引へ当てたら何がどう変わるかを一覧にし、選んだものだけ当てる。
//
// Django 版との違い（直したもの）:
// - 適用は取引の ID だけを送り、当てる瞬間に照合し直していた。一覧を開いた後にキーワードが
//   変わると、画面で確かめたのとは別の分類が黙って入った → 画面に出した分類も一緒に送り、
//   食い違う取引は見送って件数を知らせる（routes/classification.ts）
// - 「全選択」「高信頼度のみ」が2つのチェックボックスで、片方を外すと手で選んだ行まで全部外れ、
//   表の見出しの全選択とも状態がずれた → 選び方はボタン、見出しのチェックは表示中の行の状態を映す

import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Check, Eye } from 'lucide-react';
import { ConfirmDialog } from '../components/Dialog';
import { Breadcrumb } from '../components/Layout';
import { useNotice } from '../components/Notice';
import { useAction } from '../hooks/useAction';
import { useApiData } from '../hooks/useApiData';
import { api } from '../lib/api';
import { num, warekiShort } from '../lib/format';
import type { CaseDetail } from '../types';

type MatchType = 'exact' | 'partial' | 'case';
type PreviewItem = {
  txId: number;
  date: string | null;
  description: string;
  amountOut: number;
  amountIn: number;
  currentCategory: string;
  proposedCategory: string;
  matchedKeyword: string;
  matchType: MatchType;
  score: number;
};

const HIGH = 90;

const MATCH_LABEL: Record<MatchType, { label: string; className: string }> = {
  exact: { label: '完全一致', className: 'text-emerald-700 font-semibold' },
  case: { label: '案件固有', className: 'text-blue-700 font-semibold' },
  partial: { label: '部分一致', className: 'text-amber-700' },
};

function scoreClass(score: number) {
  if (score >= HIGH) return 'bg-emerald-600 text-white';
  if (score >= 80) return 'bg-blue-600 text-white';
  return 'bg-amber-300 text-slate-900';
}

export function ClassifyPreviewPage() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const notice = useNotice();
  const { busy, run } = useAction();
  const { data: caseData } = useApiData(`case-${caseId}`, () => api.get<{ case: CaseDetail }>(`/cases/${caseId}`));
  const { data, error, loading } = useApiData(`preview-${caseId}`, () => api.get<{ items: PreviewItem[] }>(`/cases/${caseId}/classify/preview`));
  const items = useMemo(() => data?.items ?? [], [data]);

  const [category, setCategory] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [confirm, setConfirm] = useState(false);

  const categories = useMemo(() => [...new Set(items.map((i) => i.proposedCategory))].sort((a, b) => a.localeCompare(b, 'ja')), [items]);
  const visible = useMemo(() => (category ? items.filter((i) => i.proposedCategory === category) : items), [items, category]);
  const highCount = items.filter((i) => i.score >= HIGH).length;
  // 絞り込みを変えると選択は外す（見えない行が選ばれたまま当たらないように）
  const chosen = visible.filter((i) => selected.has(i.txId));
  const allVisibleChosen = visible.length > 0 && chosen.length === visible.length;

  const select = (pick: (i: PreviewItem) => boolean) => setSelected(new Set(visible.filter(pick).map((i) => i.txId)));
  const toggle = (id: number) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const changeCategory = (c: string) => {
    setCategory(c);
    setSelected(new Set());
  };

  const apply = async () => {
    const body = { items: chosen.map((i) => ({ id: i.txId, category: i.proposedCategory })) };
    const res = await run('apply', () => api.post<{ count: number; skipped: number; message: string }>(`/cases/${caseId}/classify/apply-selected`, body));
    setConfirm(false);
    if (!res) return;
    notice.success(res.message);
    navigate(`/cases/${caseId}?tab=unclassified`);
  };

  const caseName = caseData?.case.name ?? '案件';
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Breadcrumb items={[{ label: '案件一覧', to: '/' }, { label: caseName, to: `/cases/${caseId}` }, { label: '自動分類のプレビュー' }]} />
      <h1 className="mb-1 flex items-center gap-2 text-xl font-bold">
        <Eye size={20} aria-hidden="true" />
        自動分類のプレビュー
      </h1>
      <p className="mb-4 text-sm text-slate-600">
        登録済みのキーワードを未分類の取引（付箋付きを除く）に当てたときの分類です。確かめて、当てるものだけ選んでください。
      </p>
      {error && <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}

      {loading && !data ? (
        <p className="card p-6 text-sm text-slate-500">読み込み中…</p>
      ) : items.length === 0 ? (
        <div className="card space-y-3 p-8 text-center">
          <p className="font-semibold">変更候補はありません</p>
          <p className="text-sm text-slate-500">未分類の取引が無いか、登録済みのキーワードに当たる取引がありません。</p>
          <Link to={`/cases/${caseId}?tab=ai`} className="btn btn-secondary btn-sm">
            分析画面へ戻る
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <dl className="grid grid-cols-3 gap-3 text-center">
            {[
              ['変更候補', items.length],
              [`信頼度${HIGH}%以上`, highCount],
              ['選択中', chosen.length],
            ].map(([label, value]) => (
              <div key={label} className="card p-3">
                <dt className="text-xs text-slate-500">{label}</dt>
                <dd className="text-2xl font-bold tabular-nums">{num(value as number)}</dd>
              </div>
            ))}
          </dl>

          <div className="card flex flex-wrap items-center gap-2 p-3">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => select(() => true)}>
              表示中をすべて選択
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => select((i) => i.score >= HIGH)}>
              表示中の{HIGH}%以上を選択
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelected(new Set())} disabled={chosen.length === 0}>
              選択を解除
            </button>
            <label className="ml-auto flex items-center gap-2 text-sm">
              提案の分類
              <select className="input w-auto py-1" value={category} onChange={(e) => changeCategory(e.target.value)}>
                <option value="">すべて（{num(items.length)}件）</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}（{num(items.filter((i) => i.proposedCategory === c).length)}件）
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="card overflow-x-auto p-0">
            <table className="table text-sm">
              <thead>
                <tr>
                  <th className="w-10 text-center">
                    <input
                      type="checkbox"
                      aria-label="表示中の行をすべて選ぶ"
                      checked={allVisibleChosen}
                      ref={(el) => {
                        if (el) el.indeterminate = chosen.length > 0 && !allVisibleChosen;
                      }}
                      onChange={() => (allVisibleChosen ? setSelected(new Set()) : select(() => true))}
                    />
                  </th>
                  <th>日付</th>
                  <th>摘要</th>
                  <th className="text-right">出金</th>
                  <th className="text-right">入金</th>
                  <th>現在</th>
                  <th aria-label="変更" />
                  <th>提案</th>
                  <th className="text-center">信頼度</th>
                  <th>当たったキーワード</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((i) => {
                  const on = selected.has(i.txId);
                  const match = MATCH_LABEL[i.matchType];
                  return (
                    <tr key={i.txId} className={on ? 'bg-emerald-50' : undefined}>
                      <td className="text-center">
                        <input type="checkbox" checked={on} onChange={() => toggle(i.txId)} aria-label={`ID ${i.txId} を選ぶ`} />
                      </td>
                      <td className="whitespace-nowrap">{i.date ? warekiShort(i.date) : '-'}</td>
                      <td className="max-w-72">
                        <span className="block truncate" title={i.description}>
                          {i.description}
                        </span>
                      </td>
                      <td className="text-right whitespace-nowrap tabular-nums text-red-700">{i.amountOut > 0 ? num(i.amountOut) : ''}</td>
                      <td className="text-right whitespace-nowrap tabular-nums text-emerald-700">{i.amountIn > 0 ? num(i.amountIn) : ''}</td>
                      <td>
                        <span className="rounded bg-slate-200 px-1.5 py-0.5 text-xs whitespace-nowrap">{i.currentCategory}</span>
                      </td>
                      <td className="text-slate-400">
                        <ArrowRight size={14} aria-hidden="true" />
                      </td>
                      <td>
                        <span className="rounded bg-sky-100 px-1.5 py-0.5 text-xs whitespace-nowrap text-sky-900">{i.proposedCategory}</span>
                      </td>
                      <td className="text-center">
                        <span className={`rounded px-1.5 py-0.5 text-xs tabular-nums ${scoreClass(i.score)}`}>{i.score}%</span>
                      </td>
                      <td className="text-xs">
                        <span className={match.className}>{match.label}</span>
                        <span className="block max-w-40 truncate text-slate-500" title={i.matchedKeyword}>
                          「{i.matchedKeyword}」
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link to={`/cases/${caseId}?tab=ai`} className="btn btn-secondary">
              戻る
            </Link>
            <button type="button" className="btn btn-primary" disabled={chosen.length === 0 || busy !== null} onClick={() => setConfirm(true)}>
              <Check size={16} aria-hidden="true" />
              選んだ {num(chosen.length)}件に当てる
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => void apply()}
        title="分類を当てる"
        confirmLabel="当てる"
        busy={busy === 'apply'}
      >
        <p>選んだ {num(chosen.length)}件に、一覧の「提案」の分類を当てます。</p>
        <p className="mt-2 text-xs text-slate-500">
          この画面を開いた後に分類された取引や、キーワードが変わって提案と違う分類になる取引は当てずに残します。あとから分析画面の「直前の分類変更」で元に戻せます。
        </p>
      </ConfirmDialog>
    </div>
  );
}
