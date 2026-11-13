// 概要タブの「相続税の検討」（依頼22）。基準日（相続開始日）から、申告の検討に使う3つの表を出す。
// 数字はサーバーの lib/inheritanceReview.ts が作る（カテゴリー別 Excel の3シートと同じ数字）。
// どれも検討の材料で、加算・贈与の判定はしない。行のリンクは取引一覧の絞り込み、
// 「質問候補に入れる」はその表の取引にまとめて付箋を付ける。

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Scale } from 'lucide-react';
import {
  ANNUAL_GIFT_EXEMPTION,
  EXTENDED_PART_DEDUCTION,
  REVIEW_DISCLAIMER,
  giftPeriodLabel,
  type InheritanceReview as Review,
  type WithdrawalList,
} from '../../../server/lib/inheritanceReview';
import { warekiFull } from '../../../server/lib/dates';
import { DownloadButton } from '../../components/DownloadButton';
import { useNotice } from '../../components/Notice';
import { useAction } from '../../hooks/useAction';
import { api } from '../../lib/api';
import { num, warekiShort } from '../../lib/format';

type Props = { caseId: number; review: Review | null; onFlagged: () => void };

// 金額（マイナスは △）
const yenText = (n: number) => (n < 0 ? `△${num(-n)}` : num(n));
const manYen = (n: number) => `${(n / 10000).toLocaleString('ja-JP')}万円`;

// 取引一覧（すべての取引タブ）の絞り込み。空の値は付けない ── desc（摘要の完全一致）だけは '' も「摘要なし」の条件なので付ける。
// 表の行から移るリンクは、その行が数えた取引と同じものだけが出るように desc で摘要を固定する（keyword の部分一致だと「入学金 2」も混ざる）
function listSearch(params: Record<string, string | null | undefined>): string {
  const q = new URLSearchParams({ tab: 'all' });
  for (const [k, v] of Object.entries(params)) if (v || (k === 'desc' && v === '')) q.set(k, v);
  return q.toString();
}

// 相手先の「計」の行が要るか（画面と Excel で同じ決まり）
const needsSubtotal = (c: { years: unknown[]; extended: number }, hasExtended: boolean) => c.years.length > 1 || (hasExtended && c.extended > 0);

// 1件の出金をそのまま指す絞り込み（日・口座・金額）
const oneTxSearch = (r: { date: string; accountNumber: string; amountOut: number; description: string }) =>
  listSearch({
    date_from: r.date, date_to: r.date, account: r.accountNumber, amount_type: 'out',
    amount_min: String(r.amountOut), amount_max: String(r.amountOut), desc: r.description,
  });

export function InheritanceReview({ caseId, review, onFlagged }: Props) {
  return (
    <section className="card p-4" aria-labelledby="inheritanceReviewHeading">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="inheritanceReviewHeading" className="flex items-center gap-1.5 font-semibold">
            <Scale size={16} className="text-violet-700" />
            相続税の検討
          </h2>
          <p className="text-xs text-amber-700">{REVIEW_DISCLAIMER}</p>
        </div>
        {review && (
          <DownloadButton path={`/cases/${caseId}/export/xlsx/categories`} className="btn btn-secondary btn-sm print:hidden" title="カテゴリー別 Excel の末尾に、この3つの表がシートで入ります">
            Excel出力（カテゴリー別に同梱）
          </DownloadButton>
        )}
      </div>
      {review ? (
        <div className="space-y-5">
          <GiftSection caseId={caseId} review={review} onFlagged={onFlagged} />
          <WithdrawalSection caseId={caseId} review={review} onFlagged={onFlagged} />
          <OutwardSection caseId={caseId} review={review} onFlagged={onFlagged} />
        </div>
      ) : (
        <p className="rounded border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-center text-sm text-slate-600">
          基準日（相続開始日）を入れると出ます。生前贈与の検討・相続開始直前の出金・口座外への多額の移動の3つです。
        </p>
      )}
    </section>
  );
}

// 表ごとの「質問候補に入れる」（付箋をまとめて付ける）
function FlagButton({ caseId, ids, onFlagged }: { caseId: number; ids: number[]; onFlagged: () => void }) {
  const notice = useNotice();
  const { busy, run } = useAction();
  if (ids.length === 0) return null;
  const click = async () => {
    const res = await run('flag', () => api.post<{ message: string; count: number }>(`/cases/${caseId}/transactions/flag-many`, { ids, flagged: true }));
    if (!res) return;
    notice.success(res.message);
    if (res.count) onFlagged();
  };
  return (
    <button type="button" className="btn btn-secondary btn-sm print:hidden" onClick={click} disabled={busy !== null} title={`この表の${num(ids.length)}件に付箋を付けます（付いているものはそのまま）`}>
      <Bookmark size={14} />
      質問候補に入れる（{num(ids.length)}件）
    </button>
  );
}

function SubHeading({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 border-b border-violet-200 pb-1">
      <h3 className="text-sm font-semibold text-violet-900">{title}</h3>
      {children}
    </div>
  );
}

const Info = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex flex-wrap gap-x-2 text-sm">
    <span className="font-medium text-slate-500">{label}</span>
    <span>{children}</span>
  </div>
);

const Empty = ({ children }: { children: ReactNode }) => <p className="py-2 text-sm text-slate-500">{children}</p>;

// ---------------------------------------------------------------------------
// 1. 生前贈与の検討
// ---------------------------------------------------------------------------
function GiftSection({ caseId, review, onFlagged }: { caseId: number; review: Review; onFlagged: () => void }) {
  const g = review.gift;
  const p = g.period;
  // desc を渡さない（undefined）ときは摘要で絞らない（期間ごとの合計・期間前）
  const giftSearch = (from: string, to: string, desc?: string) => listSearch({ date_from: from, date_to: to, category: '贈与・教育費', desc, amount_type: 'out' });
  return (
    <div>
      <SubHeading title="生前贈与の検討">
        <FlagButton caseId={caseId} ids={g.ids} onFlagged={onFlagged} />
      </SubHeading>
      <div className="mb-2 space-y-0.5">
        <Info label="加算対象期間">
          <strong>{giftPeriodLabel(p)}</strong>
        </Info>
        {p.extended && (
          <Info label="内訳">
            3年以内 {warekiFull(p.threeYearStart)}〜{warekiFull(p.end)} ／ 延びた部分 {warekiFull(p.extended.from)}〜{warekiFull(p.extended.to)}（受贈者ごとに合計から{manYen(EXTENDED_PART_DEDUCTION)}を控除）
          </Info>
        )}
        <p className="text-xs text-slate-500">
          分類「贈与・教育費」の出金を、相手先（摘要）×暦年でまとめています。摘要は受贈者と一致するとは限りません。{manYen(ANNUAL_GIFT_EXEMPTION)}は暦年課税の基礎控除の目安です。
        </p>
      </div>
      {g.counterparties.length === 0 ? (
        <Empty>加算対象期間に「贈与・教育費」の出金はありません。</Empty>
      ) : (
        <div className="relative overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>相手先（摘要）</th>
                <th>暦年</th>
                <th className="text-right">件数</th>
                <th className="text-right">金額</th>
                <th className="text-right">うち3年以内</th>
                {p.extended && <th className="text-right">うち延びた部分</th>}
                <th>{manYen(ANNUAL_GIFT_EXEMPTION)}（目安）</th>
              </tr>
            </thead>
            <tbody>
              {g.counterparties.map((c) => [
                ...c.years.map((y, i) => (
                  <tr key={`${c.counterparty}-${y.year}`}>
                    <td className="max-w-56 truncate" title={c.counterparty}>
                      {i === 0 ? c.counterparty : ''}
                    </td>
                    <td className="whitespace-nowrap">
                      <Link to={{ search: giftSearch(y.from, y.to, c.description) }} className="text-blue-700 underline" title={`${warekiShort(y.from)}〜${warekiShort(y.to)} の取引一覧`}>
                        {warekiFull(`${y.year}-01-01`).replace(/1月1日$/, '')}
                      </Link>
                    </td>
                    <td className="text-right tabular-nums">{num(y.count)}</td>
                    <td className="text-right tabular-nums">{yenText(y.total)}</td>
                    <td className="text-right tabular-nums">{yenText(y.within3)}</td>
                    {p.extended && <td className="text-right tabular-nums">{yenText(y.extended)}</td>}
                    <td className="whitespace-nowrap">{y.overExemption ? <span className="rounded bg-amber-100 px-1.5 text-xs text-amber-800">超える</span> : ''}</td>
                  </tr>
                )),
                // 計の行は、暦年が2つ以上か延びた部分の控除を書くときだけ（1年だけなら上の行と同じ数字）
                needsSubtotal(c, !!p.extended) && (
                <tr key={`${c.counterparty}-total`} className="bg-slate-50 font-medium">
                  <td colSpan={2} className="text-right text-xs text-slate-600">
                    {/* 相手先の取引はすべて加算対象期間の中なので、期間全体＋摘要でちょうどこの計の取引になる */}
                    <Link to={{ search: giftSearch(p.start, p.end, c.description) }} className="text-blue-700 underline">
                      {c.counterparty} 計
                    </Link>
                  </td>
                  <td className="text-right tabular-nums">{num(c.years.reduce((n, y) => n + y.count, 0))}</td>
                  <td className="text-right tabular-nums">{yenText(c.total)}</td>
                  <td className="text-right tabular-nums">{yenText(c.within3)}</td>
                  {p.extended && <td className="text-right tabular-nums">{yenText(c.extended)}</td>}
                  <td className="text-xs whitespace-nowrap text-slate-600">{p.extended && c.extended > 0 ? `延びた部分−${manYen(EXTENDED_PART_DEDUCTION)}: ${yenText(c.extendedAfterDeduction)}` : ''}</td>
                </tr>
                ),
              ])}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <td colSpan={2}>
                  <Link to={{ search: giftSearch(p.start, p.end) }} className="text-blue-700 underline">
                    合計
                  </Link>
                </td>
                <td className="text-right tabular-nums">{num(g.count)}</td>
                <td className="text-right tabular-nums">{yenText(g.total)}</td>
                <td className="text-right tabular-nums">{yenText(g.within3)}</td>
                {p.extended && <td className="text-right tabular-nums">{yenText(g.extended)}</td>}
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      <div className="mt-2 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
        <span className="font-medium text-slate-600">加算対象期間より前の贈与候補: </span>
        {g.before.count && g.before.from ? (
          <Link to={{ search: giftSearch(g.before.from, g.before.to) }} className="text-blue-700 underline">
            {num(g.before.count)}件 {yenText(g.before.total)}円（{warekiShort(g.before.from)}〜{warekiShort(g.before.to)}）
          </Link>
        ) : (
          'なし'
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. 相続開始直前の出金
// ---------------------------------------------------------------------------
function WithdrawalTable({ list }: { list: WithdrawalList }) {
  if (list.rows.length === 0) return <Empty>該当する出金はありません。</Empty>;
  return (
    <>
      <div className="relative overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>日付</th>
              <th>口座</th>
              <th>摘要</th>
              <th className="text-right">出金</th>
              <th>種類</th>
              <th>分類</th>
            </tr>
          </thead>
          <tbody>
            {list.rows.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap">
                  <Link to={{ search: oneTxSearch(r) }} className="text-blue-700 underline">
                    {warekiShort(r.date)}
                  </Link>
                </td>
                <td className="max-w-48 truncate" title={r.accountLabel}>
                  {r.accountLabel}
                </td>
                <td className="max-w-56 truncate" title={r.description}>
                  {r.description}
                </td>
                <td className="text-right tabular-nums">{yenText(r.amountOut)}</td>
                <td className="whitespace-nowrap text-xs">
                  {r.cash && <span className="mr-1 rounded bg-sky-100 px-1.5 text-sky-800">現金</span>}
                  {r.large && <span className="rounded bg-amber-100 px-1.5 text-amber-800">多額</span>}
                </td>
                <td className="whitespace-nowrap text-xs text-slate-600">{r.category}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-semibold">
              <td colSpan={3}>
                合計 {num(list.rows.length)}件（うち現金 {yenText(list.cashTotal)}円）
              </td>
              <td className="text-right tabular-nums">{yenText(list.total)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
      {list.byAccount.length > 1 && (
        <div className="relative mt-2 overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>口座ごと</th>
                <th className="text-right">件数</th>
                <th className="text-right">出金</th>
                <th className="text-right">うち現金</th>
              </tr>
            </thead>
            <tbody>
              {list.byAccount.map((a) => (
                <tr key={`${a.accountId}-${a.accountNumber}`}>
                  <td className="max-w-64 truncate" title={a.accountLabel}>
                    {a.accountLabel}
                  </td>
                  <td className="text-right tabular-nums">{num(a.count)}</td>
                  <td className="text-right tabular-nums">{yenText(a.total)}</td>
                  <td className="text-right tabular-nums">{yenText(a.cash)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function WithdrawalSection({ caseId, review, onFlagged }: { caseId: number; review: Review; onFlagged: () => void }) {
  const w = review.withdrawal;
  return (
    <div>
      <SubHeading title="相続開始直前の出金">
        <FlagButton caseId={caseId} ids={w.before.ids} onFlagged={onFlagged} />
      </SubHeading>
      <div className="mb-2 space-y-0.5">
        <Info label="期間">
          <Link to={{ search: listSearch({ date_from: w.from, date_to: w.to, amount_type: 'out' }) }} className="font-semibold text-blue-700 underline">
            {warekiFull(w.from)}〜{warekiFull(w.to)}
          </Link>
          （基準日の{w.months}か月前から前日まで。月数は設定で変えられます）
        </Info>
        <p className="text-xs text-slate-500">現金の引出し（摘要に ATM・CD・カード・現金・引出・払戻など）と、多額の出金（設定の金額以上）です。</p>
      </div>
      <WithdrawalTable list={w.before} />
      <div className="mt-3 rounded border border-slate-200 bg-slate-50 p-3">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-slate-700">相続開始日（{warekiFull(w.after.from)}）以後の出金（同じ条件）</h4>
          <FlagButton caseId={caseId} ids={w.after.ids} onFlagged={onFlagged} />
        </div>
        <WithdrawalTable list={w.after} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. 口座外への多額の移動
// ---------------------------------------------------------------------------
function OutwardSection({ caseId, review, onFlagged }: { caseId: number; review: Review; onFlagged: () => void }) {
  const o = review.outward;
  return (
    <div>
      <SubHeading title="口座外への多額の移動">
        <FlagButton caseId={caseId} ids={o.ids} onFlagged={onFlagged} />
      </SubHeading>
      <p className="mb-2 text-xs text-slate-500">{num(o.threshold)}円以上の振込・振替・送金のうち、資金移動の相手が案件の口座に見つからなかったもの（全期間・新しい順）です。</p>
      {o.rows.length === 0 ? (
        <Empty>該当する出金はありません。</Empty>
      ) : (
        <div className="relative overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>日付</th>
                <th>基準日</th>
                <th>口座</th>
                <th>摘要</th>
                <th className="text-right">出金</th>
                <th>分類</th>
              </tr>
            </thead>
            <tbody>
              {o.rows.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap">
                    <Link to={{ search: oneTxSearch(r) }} className="text-blue-700 underline">
                      {warekiShort(r.date)}
                    </Link>
                  </td>
                  <td className="text-center">{r.side}</td>
                  <td className="max-w-48 truncate" title={r.accountLabel}>
                    {r.accountLabel}
                  </td>
                  <td className="max-w-56 truncate" title={r.description}>
                    {r.description}
                  </td>
                  <td className="text-right tabular-nums">{yenText(r.amountOut)}</td>
                  <td className="whitespace-nowrap text-xs text-slate-600">{r.category}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <td colSpan={4}>合計 {num(o.rows.length)}件</td>
                <td className="text-right tabular-nums">{yenText(o.total)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
