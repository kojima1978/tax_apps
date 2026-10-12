"use client";

import { Minus, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { ActionMenu } from "@/components/action-menu";
import { PanelHeader } from "@/components/panel-header";
import { compactYen, dateJa } from "@/lib/format";
import {
  type Snapshot,
  type TrendGroup,
  fiscalYearLabel,
  trendChildRows,
  trendRows,
  trendValues,
} from "@/lib/portfolio-view";

export function HistoryView({ snapshots, onCreate, onEditSnapshot, onDeleteSnapshot, saving }: { snapshots: Snapshot[]; onCreate: () => void; onEditSnapshot: (snapshotId: number) => void; onDeleteSnapshot: (snapshot: Snapshot) => void; saving: boolean }) {
  const [expandedGroups, setExpandedGroups] = useState<Set<TrendGroup>>(() => new Set());
  const orderedSnapshots = [...snapshots].sort((a, b) => a.fiscalYear - b.fiscalYear || a.id - b.id);
  // 比較表は常に3期ぶんの位置を保つ。未登録期は0円ではなく「データなし」として扱い、
  // 過去データがまだ無い顧客でも、今後どのように推移を並べるか分かるようにする。
  const columnCount = 3;
  // 右端が必ず最新。差額の列（最新 − 直前）がどの2列を引いたものか見出しだけで分かるようにする。
  const periodLabels = ["古い年度", "直前年度", "最新年度"];
  const latestSnapshots = orderedSnapshots.slice(-columnCount);
  const [selectedSnapshotIds, setSelectedSnapshotIds] = useState<Array<number | null>>(() => [
    ...Array(columnCount - latestSnapshots.length).fill(null),
    ...latestSnapshots.map((snapshot) => snapshot.id),
  ]);
  const paddedPeriods = selectedSnapshotIds.map((snapshotId) => {
    const snapshot = snapshots.find((candidate) => candidate.id === snapshotId);
    return snapshot ? { snapshot, values: trendValues(snapshot) } : null;
  });
  const periodFiscalYears = paddedPeriods.map((period, index) => {
    if (period) return period.snapshot.fiscalYear;
    const nextIndex = paddedPeriods.findIndex((candidate, candidateIndex) => candidateIndex > index && candidate !== null);
    return nextIndex >= 0 ? paddedPeriods[nextIndex]!.snapshot.fiscalYear - (nextIndex - index) : null;
  });
  const periods = paddedPeriods.filter((period): period is NonNullable<typeof period> => period !== null);
  const latest = paddedPeriods[columnCount - 1]?.values;
  const previous = paddedPeriods[columnCount - 2]?.values;
  const childrenFor = (group: TrendGroup) => trendChildRows[group].filter((child) => periods.some((period) => period.values[child.key] !== 0));
  const visibleRows = trendRows.flatMap((row) => row.group && expandedGroups.has(row.group) ? [row, ...childrenFor(row.group)] : [row]);

  function toggleGroup(group: TrendGroup) {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(group)) next.delete(group); else next.add(group);
      return next;
    });
  }

  function selectPeriod(index: number, snapshotId: string) {
    setSelectedSnapshotIds((current) => {
      const next = current.map((value, currentIndex) => currentIndex === index ? (snapshotId ? Number(snapshotId) : null) : value);
      const chronological = next
        .filter((value): value is number => value !== null)
        .sort((leftId, rightId) => {
          const left = snapshots.find((snapshot) => snapshot.id === leftId);
          const right = snapshots.find((snapshot) => snapshot.id === rightId);
          return (left?.fiscalYear ?? 0) - (right?.fiscalYear ?? 0);
        });
      return [...Array(columnCount - chronological.length).fill(null), ...chronological];
    });
  }

  return <>
    <section className="page-heading history-page-heading"><div><h2>年度比較</h2></div><button className="button primary" onClick={onCreate} disabled={saving}><Plus />年度を追加</button></section>
    <section className="panel table-panel trend-panel" aria-label="年度推移表">
      <PanelHeader title="年度推移表" subtitle="3期" />
      {snapshots.length < columnCount ? <p className="trend-guidance">過去データが未登録の期は「データなし」で表示しています。年度を追加すると比較できます。</p> : null}
      <div className="table-scroll trend-scroll">
        <table className={`trend-table trend-columns-${columnCount}`}>
          <caption className="sr-only">貸借対照表の年度推移</caption>
          <thead><tr><th scope="col"><span className="sr-only">科目</span></th>{paddedPeriods.map((period, index) => <th scope="col" className={`center period-selector${period ? "" : " period-no-data"}`} key={`period-${index}`}><span className="period-position-label">{periodLabels[index]}</span><select aria-label={`${periodLabels[index]}の選択`} value={period?.snapshot.id ?? ""} onChange={(event) => selectPeriod(index, event.target.value)}><option value="">{periodFiscalYears[index] ? `${periodFiscalYears[index]}年度（データなし）` : "データなし"}</option>{[...orderedSnapshots].reverse().map((snapshot) => <option key={snapshot.id} value={snapshot.id} disabled={selectedSnapshotIds.some((selectedId, selectedIndex) => selectedIndex !== index && selectedId === snapshot.id)}>{fiscalYearLabel(snapshot)}{snapshot.isCurrent ? "（現在）" : ""}</option>)}</select>{period ? <button type="button" className="period-edit" onClick={() => onEditSnapshot(period.snapshot.id)}><Pencil />この年度を修正</button> : <small className="period-no-data-label">未登録</small>}</th>)}<th scope="col" className="number trend-change-column"><span>前年度差</span><small>最新 − 直前</small></th></tr></thead>
          <tbody>{visibleRows.map((row) => {
            if (row.tone === "section") return <tr className="trend-section" key={`section-${row.key}`}><th scope="rowgroup" colSpan={columnCount + 1}>{row.label}</th><td className="trend-change trend-section-change" aria-hidden="true" /></tr>;
            const change = latest && previous ? latest[row.key] - previous[row.key] : null;
            const expanded = row.group ? expandedGroups.has(row.group) : false;
            const canExpand = row.group ? childrenFor(row.group).length > 0 : false;
            const rowClass = [row.tone ? `trend-${row.tone}` : "", row.group ? "trend-expandable" : "", row.child ? "trend-child" : ""].filter(Boolean).join(" ");
            return <tr className={rowClass || undefined} key={`${row.child ? "child" : row.tone ?? "detail"}-${row.key}`}><th scope="row"><span className="trend-row-heading">{row.group && canExpand ? <button type="button" className="trend-expand" aria-label={`${row.label}の小分類を${expanded ? "閉じる" : "表示"}`} aria-expanded={expanded} onClick={() => toggleGroup(row.group!)}>{expanded ? <Minus /> : <Plus />}</button> : !row.child && !row.tone ? <span className="trend-expand-placeholder" aria-hidden="true" /> : null}<span>{row.label}</span></span></th>{paddedPeriods.map((period, index) => <td className={`number${period ? "" : " trend-no-data"}`} key={period?.snapshot.id ?? `empty-${index}`}>{period ? compactYen(period.values[row.key]) : "—"}</td>)}<td className={`number trend-change ${change === null ? "" : change > 0 ? "positive" : change < 0 ? "negative" : "neutral"}`}>{change === null ? "—" : `${change > 0 ? "+" : ""}${compactYen(change)}`}</td></tr>;
          })}</tbody>
        </table>
      </div>
    </section>
    {/* 年度一覧は画面だけ。印刷では、未登録期も含めて常に表示する3期の推移表を使う。 */}
    <section className="panel table-panel history-list-panel">
      <PanelHeader title="年度一覧" subtitle={`${snapshots.length}年度`} />
      <div className="table-scroll"><table className="history-table"><thead><tr><th className="center">基準日</th><th className="center">状態</th><th className="number">資産合計</th><th className="number">登録負債</th><th className="number">税金等</th><th className="number">予測純資産</th><th className="number">個人保証</th><th className="number">相続税（実効税率）</th><th className="actions-column">操作</th></tr></thead><tbody>{[...orderedSnapshots].reverse().map((snapshot) => { const s = trendValues(snapshot); const calc = snapshot.inheritanceTaxCalculation; return <tr key={snapshot.id}><td className="center"><strong>{dateJa(snapshot.asOfDate)}</strong></td><td className="center">{snapshot.isCurrent ? <span className="current-badge">現在</span> : snapshot.label}</td><td className="number">{compactYen(s.assets)}</td><td className="number">{compactYen(s.borrowings + s.otherLiabilities)}</td><td className="number">{compactYen(s.taxes)}</td><td className="number emphasis">{compactYen(s.netWorth)}</td><td className="number">{compactYen(s.guarantees)}</td><td className="number">{calc ? <><strong>{compactYen(calc.totalInheritanceTaxJpy)}</strong><small className="history-tax-rate">実効税率 {calc.effectiveTaxRate.toFixed(1)}%</small></> : <span className="history-tax-empty">未計算</span>}</td><td><div className="table-actions">{/* 行の操作は顧客一覧・資産負債明細と同じ「…」1つに揃える。削除だけを剥き出しのボタンで置いていたため、
                この表だけ消す操作がワンクリックで並んでいた。 */}<ActionMenu
                  id={`snapshot-menu-${snapshot.id}`}
                  label={`${fiscalYearLabel(snapshot)}の操作`}
                  busy={saving}
                  items={[
                    { key: "edit", label: "この年度を修正", icon: Pencil, onSelect: () => onEditSnapshot(snapshot.id) },
                    { key: "delete", label: "年度データを削除", icon: Trash2, danger: true, onSelect: () => onDeleteSnapshot(snapshot) },
                  ]}
                /></div></td></tr>; })}</tbody></table></div>
    </section>
  </>;
}
