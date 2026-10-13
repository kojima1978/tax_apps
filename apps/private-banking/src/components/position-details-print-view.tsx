"use client";

import { useEffect, useMemo, useState } from "react";
import { positionDetailTableValue } from "@/lib/position-display";
import { DETAIL_PAGES, defaultColumns, detailColumns, matchesDetailPage, parseColumnPreferences, type DetailPage } from "@/lib/position-detail-pages";
import { triangleYenNumber, yenNumber } from "@/lib/format";
import { fiscalYearLabel, type Position, type Snapshot, valuationDetailLine } from "@/lib/portfolio-view";

type Props = { snapshot: Snapshot; taxBurden: (position: Position) => number | null };

function cellText(position: Position, key: string, taxBurden: Props["taxBurden"]) {
  if (key === "name") return position.name || "名称未登録";
  if (key === "value") return yenNumber.format(position.valueJpy);
  if (key === "tax") { const burden = taxBurden(position); return burden === null ? "—" : triangleYenNumber(burden); }
  if (key === "method") return position.valuationMethod || "金額を直接入力";
  if (key === "formula") return valuationDetailLine(position) || `入力額 ${position.valueJpy.toLocaleString("ja-JP")}円`;
  if (key === "currency") return position.currency;
  if (key === "original") return `${position.originalAmount.toLocaleString("ja-JP")} ${position.currency}`;
  if (key === "fx") return position.fxRate.toLocaleString("ja-JP");
  return positionDetailTableValue(position, key);
}

function PrintCategoryTable({ page, rows, taxBurden }: { page: DetailPage; rows: Position[]; taxBurden: Props["taxBurden"] }) {
  const columns = useMemo(() => detailColumns(page), [page]);
  const [preferences, setPreferences] = useState(() => defaultColumns(columns));
  useEffect(() => {
    try {
      // 入力画面で保存した科目別の列設定を、印刷表にもそのまま反映する。
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPreferences(parseColumnPreferences(localStorage.getItem(`pb.position-columns.v1.${page.key}`), columns));
    } catch { /* 保存領域を使えない場合は標準列で印刷する。 */ }
  }, [columns, page.key]);
  const visible = preferences.order
    .map((key) => columns.find((column) => column.key === key))
    .filter((column): column is typeof columns[number] => column !== undefined && column.key !== "method" && (preferences.visible.includes(column.key) || column.key === "formula"));
  const fixedWidths: Record<string, number> = { name: 12, value: 11, formula: 23 };
  const fixedTotal = visible.reduce((sum, column) => sum + (fixedWidths[column.key] ?? 0), 0);
  const flexible = visible.filter((column) => fixedWidths[column.key] === undefined);
  const flexibleWidth = flexible.reduce((sum, column) => sum + preferences.widths[column.key], 0);
  // 印刷では数値入りの計算根拠を標準表示し、名称・評価額とともに全科目で幅をそろえる。
  // 残りの幅は、入力画面で保存した各列の幅比率を維持して配分する。
  const printWidth = (key: string) => flexible.length === 0
    ? (fixedWidths[key] / fixedTotal) * 100
    : fixedWidths[key] ?? (preferences.widths[key] / flexibleWidth) * (100 - fixedTotal);
  return <section className="position-detail-print-section">
    <header><h3>{page.label}</h3><span>{rows.length}件</span></header>
    <table className="position-detail-print-table">
      <caption className="sr-only">{page.label}の明細</caption>
      <colgroup>{visible.map((column) => <col key={column.key} data-column={column.key} style={{ width: `${printWidth(column.key)}%` }} />)}</colgroup>
      <thead><tr>{visible.map((column) => <th key={column.key} data-column={column.key} scope="col" className={column.alignment ?? "text"}>{column.label}</th>)}</tr></thead>
      <tbody>{rows.map((position) => <tr key={position.id}>{visible.map((column) => <td key={column.key} data-column={column.key} className={column.alignment ?? "text"}>{cellText(position, column.key, taxBurden)}</td>)}</tr>)}</tbody>
    </table>
  </section>;
}

export function PositionDetailsPrintView({ snapshot, taxBurden }: Props) {
  const pages = DETAIL_PAGES.map((page) => ({ page, rows: snapshot.positions.filter((position) => matchesDetailPage(position, page)) })).filter(({ rows }) => rows.length > 0);
  return <div className="position-details-print">
    <header className="position-details-print-heading"><div><h2>資産・負債詳細</h2><p>科目別明細</p></div><span>{fiscalYearLabel(snapshot)}{snapshot.isCurrent ? "（現在）" : ""}</span></header>
    {pages.map(({ page, rows }) => <PrintCategoryTable key={page.key} page={page} rows={rows} taxBurden={taxBurden} />)}
    {pages.length === 0 ? <p className="print-empty-notice">登録されている資産・負債明細はありません。</p> : null}
  </div>;
}
