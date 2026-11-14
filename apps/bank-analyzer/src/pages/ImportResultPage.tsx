// 取込の結果（依頼25）。取込ウィザード・直接入力の確定のあとに開く。
// 中身は確定の応答の summary（server/lib/import/summary.ts）をそのまま見せるだけで、ここでは数え直さない。
// 件数のリンクは取引一覧（?tab=all）へ、今回の取込の ID の範囲と同じ判定の条件を付けて移る
// （移った先の件数が同じになる。判定は server/lib/aggregate.ts の hasMark と summary.ts で揃えてある）。
//
// 履歴は持たない: 結果はこのタブの sessionStorage に案件ごとに直前の1回分だけ（lastImport.ts）。

import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CircleHelp, ClipboardList, FileUp, Undo2 } from 'lucide-react';
import { Breadcrumb } from '../components/Layout';
import { useApiData } from '../hooks/useApiData';
import { api } from '../lib/api';
import { num, signedNum, warekiShort, warekiYearAbbr } from '../lib/format';
import type { CaseDetail } from '../types';
import { GIFT_CATEGORY, UNCATEGORIZED } from '../../server/lib/categories';
import { GAP_DAYS } from '../../server/lib/import/summary';
import { loadLastImport, txListLink, type ImportSummary } from './import/lastImport';

type Account = ImportSummary['accounts'][number];

const accountName = (a: Account) => [a.bankName, a.branchName, a.accountType, a.accountNumber].filter(Boolean).join(' ') || '（口座なし）';
const period = (p: { from: string; to: string }) => (p.from === p.to ? warekiShort(p.from) : `${warekiShort(p.from)}〜${warekiShort(p.to)}`);
const yearLabel = (y: number) => `${warekiYearAbbr(y)}（${y}年）`;

// 件数とリンク。0件ならリンクにしない（移っても空の一覧になるだけ）
function CountLink({ to, count, unit = '件' }: { to: string; count: number; unit?: string }) {
  if (count === 0) return <span className="text-slate-500 tabular-nums">0{unit}</span>;
  return (
    <Link to={to} className="font-semibold text-blue-700 tabular-nums underline-offset-2 hover:underline">
      {num(count)}
      {unit}
    </Link>
  );
}

function Section({ title, children, note }: { title: string; children: ReactNode; note?: ReactNode }) {
  return (
    <section className="card p-4" aria-label={title}>
      <h2 className="mb-3 font-semibold">{title}</h2>
      {children}
      {note && <p className="mt-2 text-xs text-slate-500">{note}</p>}
    </section>
  );
}

// 見出しと値の2列（390px でも折り返さずに読めるように、値は右寄せ）
function Rows({ items }: { items: { label: ReactNode; value: ReactNode; hint?: ReactNode }[] }) {
  return (
    <dl className="divide-y divide-slate-100 text-sm">
      {items.map((it, i) => (
        <div key={i} className="flex items-baseline justify-between gap-3 py-1.5">
          <dt className="min-w-0">
            {it.label}
            {it.hint && <span className="block text-xs text-slate-500">{it.hint}</span>}
          </dt>
          <dd className="shrink-0 text-right">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ImportResultPage() {
  const { caseId = '' } = useParams();
  const { data } = useApiData(`case-${caseId}`, () => api.get<{ case: CaseDetail }>(`/cases/${caseId}`));
  const last = loadLastImport(caseId);
  const caseName = data?.case.name ?? '案件';
  const crumbs = [{ label: '案件一覧', to: '/' }, { label: caseName, to: `/cases/${caseId}` }, { label: '取込の結果' }];

  if (!last) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6">
        <Breadcrumb items={crumbs} />
        <h1 className="mb-3 text-xl font-bold">取込の結果</h1>
        <p className="card p-4 text-sm text-slate-600">
          直前の取込の結果が見当たりません。結果はこのタブを開いている間だけ残ります（取込の履歴は残しません）。
          <Link to={`/cases/${caseId}`} className="ml-1 text-blue-700 underline">
            編集・分析へ戻る
          </Link>
        </p>
      </div>
    );
  }

  const s = last.summary;
  const list = (extra: Parameters<typeof txListLink>[2] = {}) => txListLink(caseId, s, extra);
  const byAccount = (a: Account) => ({ ...(a.bankName ? { bank: a.bankName } : {}), account: a.accountNumber });
  const balanceErrors = s.accounts.reduce((n, a) => n + a.balanceErrors, 0);
  const at = new Date(last.at);
  // at は UTC の ISO 文字列。日付もこの PC の時刻で組む（そのまま切ると朝9時前は前の日になる）
  const pad = (n: number) => String(n).padStart(2, '0');
  const atLabel = Number.isNaN(at.getTime())
    ? ''
    : `${warekiShort(`${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`)} ${pad(at.getHours())}:${pad(at.getMinutes())}`;

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-6">
      <div>
        <Breadcrumb items={crumbs} />
        <h1 className="text-xl font-bold">取込の結果</h1>
        <p className="mt-1 text-sm text-slate-600">
          {last.message}
          {atLabel && <span className="ml-2 text-xs text-slate-500">（{atLabel}）</span>}
        </p>
      </div>

      <Section title="全体">
        <Rows
          items={[
            { label: '取り込んだ取引', value: <CountLink to={list()} count={s.imported} /> },
            { label: '重複として除いた取引', value: <span className="tabular-nums">{num(s.skipped)}件</span>, hint: '取込済みの取引と同じ行' },
            { label: 'ファイル', value: <span className="tabular-nums">{num(s.files)}件</span> },
          ]}
        />
      </Section>

      {s.accounts.length > 0 && (
        <Section
          title="口座ごと"
          note="残高のつながりは、手順3の表の並びで前の行の残高から計算した残高と比べています（手順3で赤くなる行と同じ）。"
        >
          <div className="space-y-3">
            {s.accounts.map((a) => (
              <div key={a.id} className="rounded border border-slate-200 p-3">
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-medium break-all">{accountName(a)}</h3>
                  {a.before === null && <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-xs text-emerald-800">新しく作った口座</span>}
                </div>
                <Rows
                  items={[
                    { label: '件数', value: <CountLink to={list(byAccount(a))} count={a.count} /> },
                    { label: '期間', value: period(a.period) },
                    { label: '出金計', value: <span className="tabular-nums">{num(a.totalOut)}円</span> },
                    { label: '入金計', value: <span className="tabular-nums">{num(a.totalIn)}円</span> },
                    {
                      label: '最後の残高',
                      value: a.lastBalance ? <span className="tabular-nums">{signedNum(a.lastBalance.amount)}円</span> : <span className="text-slate-500">残高の記載なし</span>,
                      hint: a.lastBalance ? `${warekiShort(a.lastBalance.date)} 時点` : undefined,
                    },
                    {
                      label: '残高が合わない行',
                      value:
                        a.balanceErrors === 0 ? (
                          <span className="text-slate-500">なし</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-800">
                            <AlertTriangle size={14} aria-hidden="true" />
                            <CountLink to={list({ id: a.balanceErrorIds })} count={a.balanceErrors} />
                          </span>
                        ),
                      hint: a.balanceErrors > a.balanceErrorIds.length ? `一覧で開けるのは先頭の${num(a.balanceErrorIds.length)}件まで` : undefined,
                    },
                  ]}
                />
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section
        title="分類の内訳"
        note={s.categories.csv === 0 && s.categories.manual === 0 && s.categories.remap === 0 ? 'CSV に分類の列が無い・空欄のときは、すべてアプリが自動で分類します。' : undefined}
      >
        <Rows
          items={[
            { label: 'CSV に書いてあった分類', value: <span className="tabular-nums">{num(s.categories.csv)}件</span>, hint: 'AI で作った CSV の分類など' },
            { label: '手順3で選んだ分類', value: <span className="tabular-nums">{num(s.categories.manual)}件</span> },
            { label: '知らない分類名を読み替えた', value: <span className="tabular-nums">{num(s.categories.remap)}件</span> },
            { label: 'アプリが自動で分類', value: <span className="tabular-nums">{num(s.categories.auto)}件</span> },
            { label: `${UNCATEGORIZED}のまま`, value: <CountLink to={list({ category: UNCATEGORIZED })} count={s.categories.uncategorized} /> },
          ]}
        />
      </Section>

      <Section title="人が見る所" note="件数を押すと、今回取り込んだ取引のうち当てはまるものを取引一覧で開きます。">
        <Rows
          items={[
            { label: '付箋（要確認）', value: <CountLink to={list({ mark: 'flagged' })} count={s.attention.flagged} /> },
            { label: 'メモのある行', value: <CountLink to={list({ mark: 'memo' })} count={s.attention.memo} /> },
            {
              label: '相手の見つからない通帳間移動',
              value: <CountLink to={list({ mark: 'transfer_unmatched' })} count={s.attention.transferUnmatched} />,
              hint: '相手の通帳がまだ取り込まれていないことが多い',
            },
            { label: '多額の取引', value: <CountLink to={list({ mark: 'large' })} count={s.attention.large} />, hint: '設定の「多額の基準」以上' },
            { label: '贈与の候補', value: <CountLink to={list({ category: GIFT_CATEGORY })} count={s.attention.gift} />, hint: `分類が「${GIFT_CATEGORY}」` },
          ]}
        />
      </Section>

      {s.accounts.length > 0 && (
        <Section
          title="既存データとの関係"
          note={
            <>
              取引の無い間は、前からの取引と今回の取引を日付順に並べて{GAP_DAYS}日を超えて空いている所（今回の取引に接する所だけ）。
              取引の無い年は、通帳有無一覧表の自動の○と同じく「その年に取引が1件でもあるか」で数えています。
              <Link to={`/cases/${caseId}/passbooks`} className="ml-1 text-blue-700 underline">
                通帳有無一覧表
              </Link>
            </>
          }
        >
          <ul className="space-y-2 text-sm">
            {s.accounts.map((a) => (
              <li key={a.id} className="rounded border border-slate-200 p-3">
                <p className="mb-1 font-medium break-all">{accountName(a)}</p>
                {a.before === null ? (
                  <p className="text-slate-600">前から入っていた取引はありません（この取込で初めて入った口座）。</p>
                ) : (
                  <ul className="list-disc space-y-0.5 pl-5">
                    <li>
                      前から入っていた取引: {num(a.before.count)}件（{period(a.before)}）
                    </li>
                    <li>今回: {period(a.period)}</li>
                    {a.overlap && (
                      <li>
                        期間が重なっている: {period(a.overlap)}
                        <span className="block text-xs text-slate-500">同じ取引は重複として除いています。重なりの中で残高が合わなければ、通帳の写し違いを疑ってください。</span>
                      </li>
                    )}
                  </ul>
                )}
                {a.gaps.length > 0 && (
                  <ul className="mt-1 space-y-0.5 text-amber-800">
                    {a.gaps.map((g) => (
                      <li key={g.from}>
                        <AlertTriangle size={14} className="mr-1 inline" aria-hidden="true" />
                        取引の無い間: {period(g)}（{num(g.days)}日）── 通帳の抜けかもしれません
                      </li>
                    ))}
                  </ul>
                )}
                {a.emptyYears.length > 0 && (
                  <p className="mt-1 text-amber-800">取引の無い年: {a.emptyYears.map(yearLabel).join('、')}</p>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="次にすること">
        <div className="flex flex-wrap gap-2 print:hidden">
          <Link to={`/cases/${caseId}?tab=flagged`} className="btn btn-secondary btn-sm">
            <ClipboardList size={14} />
            要確認（質問候補）を見る
          </Link>
          <Link to={`/cases/${caseId}?tab=unclassified`} className="btn btn-secondary btn-sm">
            <CircleHelp size={14} />
            未分類を片付ける
          </Link>
          {balanceErrors > 0 && (
            <Link to={list({ id: s.accounts.flatMap((a) => a.balanceErrorIds) })} className="btn btn-secondary btn-sm">
              <AlertTriangle size={14} />
              残高の合わない行を見る
            </Link>
          )}
          <Link to={`/cases/${caseId}/import`} className="btn btn-secondary btn-sm">
            <FileUp size={14} />
            続けて取り込む
          </Link>
          <Link to={`/cases/${caseId}`} className="btn btn-primary btn-sm">
            編集・分析へ
            <ArrowRight size={14} />
          </Link>
        </div>
        {s.idFrom !== null && s.idTo !== null && (
          <p className="mt-3 flex items-start gap-1.5 text-sm text-slate-600">
            <Undo2 size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              間違えて取り込んだときは、データクレンジングの「範囲削除」で ID {s.idFrom}〜{s.idTo} を消すと、今回の分だけを取り除けます（消す前の控えから戻せます）。
              <Link to={`/cases/${caseId}?tab=cleanup&start_id=${s.idFrom}&end_id=${s.idTo}`} className="ml-1 text-blue-700 underline print:hidden">
                範囲削除を開く
              </Link>
            </span>
          </p>
        )}
      </Section>
    </div>
  );
}
