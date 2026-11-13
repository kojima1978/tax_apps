// 相続税の検討（依頼22）を、カテゴリー別 Excel の末尾に3シートで足す。既存のシートには触らない。
// シートを作る口（名前の決まり・用紙の設定）は exports.ts から受け取る（循環 import を作らない）。

import type ExcelJS from 'exceljs';
import { warekiFull, warekiShort, warekiYearAbbr } from '../lib/dates.js';
import {
  ANNUAL_GIFT_EXEMPTION,
  EXTENDED_PART_DEDUCTION,
  REVIEW_DISCLAIMER,
  giftPeriodLabel,
  type InheritanceReview,
  type WithdrawalList,
} from '../lib/inheritanceReview.js';

type AddSheet = (title: string, tabColor: string) => ExcelJS.Worksheet;

const FONT = '游ゴシック';
// マイナスは △（金額の欄は出金の合計なので通常は出ないが、引き算の参考欄のために）
const YEN = '#,##0;"△"#,##0';
const TAB = '7C3AED';

const yearLabel = (y: number) => `${warekiYearAbbr(y)}年（${y}）`;
const mark = (on: boolean) => (on ? '○' : null);
const widths = (ws: ExcelJS.Worksheet, list: number[]) => list.forEach((w, i) => (ws.getColumn(i + 1).width = w));

function head(ws: ExcelJS.Worksheet, title: string, info: [string, string][]) {
  const t = ws.addRow([title]);
  t.font = { name: FONT, size: 14, bold: true };
  const d = ws.addRow([REVIEW_DISCLAIMER]);
  d.font = { name: FONT, size: 9, color: { argb: 'FFB45309' } };
  for (const [label, value] of info) {
    const r = ws.addRow([label, value]);
    r.getCell(1).font = { name: FONT, bold: true, color: { argb: 'FF475569' } };
    r.getCell(2).font = { name: FONT };
  }
  ws.addRow([]);
}

function table(ws: ExcelJS.Worksheet, labels: string[], rows: (string | number | null)[][], amountCols: number[], totalRow?: (string | number | null)[]) {
  const h = ws.addRow(labels);
  h.eachCell((c) => {
    c.font = { name: FONT, bold: true };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    c.border = { bottom: { style: 'thin' } };
  });
  const body = rows.map((r) => ws.addRow(r));
  if (totalRow) {
    const t = ws.addRow(totalRow);
    t.font = { name: FONT, bold: true };
    t.eachCell((c) => (c.border = { top: { style: 'thin' } }));
    body.push(t);
  }
  for (const r of body) {
    for (const i of amountCols) r.getCell(i).numFmt = YEN;
    r.eachCell((c) => (c.font = { name: FONT, bold: c.font?.bold ?? false }));
  }
  ws.addRow([]);
}

function giftSheet(ws: ExcelJS.Worksheet, review: InheritanceReview) {
  const g = review.gift;
  const p = g.period;
  head(ws, '生前贈与の検討', [
    ['相続開始日（基準日）', warekiFull(review.referenceDate)],
    ['加算対象期間', giftPeriodLabel(p)],
    ['うち3年以内', `${warekiFull(p.threeYearStart)}〜${warekiFull(p.end)}`],
    ['うち延びた部分', p.extended ? `${warekiFull(p.extended.from)}〜${warekiFull(p.extended.to)}（受贈者ごとに合計から${EXTENDED_PART_DEDUCTION.toLocaleString('ja-JP')}円を控除）` : 'なし'],
    ['対象', '分類「贈与・教育費」の出金。相手先は摘要でまとめています（受贈者と一致するとは限りません）'],
  ]);
  widths(ws, [26, 16, 8, 14, 14, 14, 14]);
  const rows: (string | number | null)[][] = [];
  for (const c of g.counterparties) {
    for (const y of c.years) rows.push([c.counterparty, yearLabel(y.year), y.count, y.total, y.within3, y.extended, y.overExemption ? `超（${(ANNUAL_GIFT_EXEMPTION / 10000).toLocaleString('ja-JP')}万円）` : null]);
    // 計の行は、暦年が2つ以上か延びた部分の控除を書くときだけ（1年だけなら上の行と同じ数字）
    if (c.years.length > 1 || (p.extended && c.extended > 0)) rows.push([`${c.counterparty} 計`, null, c.years.reduce((n, y) => n + y.count, 0), c.total, c.within3, c.extended, p.extended && c.extended > 0 ? `延びた部分−100万円: ${c.extendedAfterDeduction.toLocaleString('ja-JP')}` : null]);
  }
  table(ws, ['相手先（摘要）', '暦年', '件数', '金額', 'うち3年以内', 'うち延びた部分', '110万円との比較（目安）'], rows, [4, 5, 6], ['合計', null, g.count, g.total, g.within3, g.extended, null]);
  table(
    ws,
    ['加算対象期間より前の贈与候補', '期間', '件数', '金額'],
    [[null, g.before.count ? `${warekiShort(g.before.from)}〜${warekiShort(g.before.to)}` : '-', g.before.count, g.before.total]],
    [4],
  );
}

function withdrawalTable(ws: ExcelJS.Worksheet, list: WithdrawalList) {
  table(
    ws,
    ['日付', '口座', '摘要', '出金', '現金', '多額', '分類'],
    list.rows.map((r) => [warekiShort(r.date), r.accountLabel, r.description, r.amountOut, mark(r.cash), mark(r.large), r.category]),
    [4],
    ['合計', null, `${list.rows.length}件（うち現金 ${list.cashTotal.toLocaleString('ja-JP')}円）`, list.total, null, null, null],
  );
  if (list.byAccount.length > 1) {
    table(
      ws,
      ['口座ごと', '', '件数', '出金', 'うち現金'],
      list.byAccount.map((a) => [a.accountLabel, null, a.count, a.total, a.cash]),
      [4, 5],
    );
  }
}

function withdrawalSheet(ws: ExcelJS.Worksheet, review: InheritanceReview, threshold: number) {
  const w = review.withdrawal;
  head(ws, '相続開始直前の出金', [
    ['相続開始日（基準日）', warekiFull(review.referenceDate)],
    ['期間', `${warekiFull(w.from)}〜${warekiFull(w.to)}（基準日の${w.months}か月前から前日まで）`],
    ['対象', `現金の引出し（摘要に ATM・CD・カード・現金・引出・払戻など）と、${threshold.toLocaleString('ja-JP')}円以上の出金`],
  ]);
  widths(ws, [12, 30, 28, 14, 6, 6, 14]);
  withdrawalTable(ws, w.before);
  const t = ws.addRow([`相続開始日（${warekiFull(w.after.from)}）以後の出金（同じ条件）`]);
  t.font = { name: FONT, bold: true };
  withdrawalTable(ws, w.after);
}

function outwardSheet(ws: ExcelJS.Worksheet, review: InheritanceReview) {
  const o = review.outward;
  head(ws, '口座外への多額の移動', [
    ['相続開始日（基準日）', warekiFull(review.referenceDate)],
    ['対象', `${o.threshold.toLocaleString('ja-JP')}円以上の振込・振替・送金のうち、資金移動の相手が案件の口座に見つからなかったもの（全期間・新しい順）`],
  ]);
  widths(ws, [12, 8, 30, 28, 14, 14]);
  table(
    ws,
    ['日付', '基準日との関係', '口座', '摘要', '出金', '分類'],
    o.rows.map((r) => [warekiShort(r.date), r.side, r.accountLabel, r.description, r.amountOut, r.category]),
    [5],
    ['合計', null, `${o.rows.length}件`, null, o.total, null],
  );
}

export function addInheritanceReviewSheets(addSheet: AddSheet, review: InheritanceReview, largeThreshold: number) {
  giftSheet(addSheet('生前贈与の検討', TAB), review);
  withdrawalSheet(addSheet('相続開始直前の出金', TAB), review, largeThreshold);
  outwardSheet(addSheet('口座外への多額の移動', TAB), review);
}
