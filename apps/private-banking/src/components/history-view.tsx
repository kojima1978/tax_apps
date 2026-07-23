"use client";

import { Minus, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
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
  const periodLabels = ["古い年度", "中間年度", "最新年度"] as const;
  const orderedSnapshots = [...snapshots].sort((a, b) => a.fiscalYear - b.fiscalYear || a.id - b.id);
  const latestSnapshots = orderedSnapshots.slice(-3);
  const defaultSnapshotIds: Array<number | null> = [...Array(Math.max(0, 3 - latestSnapshots.length)).fill(null), ...latestSnapshots.map((snapshot) => snapshot.id)];
  const [selectedSnapshotIds, setSelectedSnapshotIds] = useState<Array<number | null>>(() => defaultSnapshotIds);
  const paddedPeriods = selectedSnapshotIds.map((snapshotId) => {
    const snapshot = snapshots.find((candidate) => candidate.id === snapshotId);
    return snapshot ? { snapshot, values: trendValues(snapshot) } : null;
  });
  const periods = paddedPeriods.filter((period): period is NonNullable<typeof period> => period !== null);
  const latest = paddedPeriods[2]?.values;
  const previous = paddedPeriods[1]?.values;
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
      return [...Array(3 - chronological.length).fill(null), ...chronological];
    });
  }

  return <>
    <section className="page-heading history-page-heading"><div><p className="eyebrow">ANNUAL COMPARISON</p><h2>3年度比較</h2></div><button className="button primary" onClick={onCreate} disabled={saving}><Plus />年度を追加</button></section>
    <section className="panel table-panel trend-panel" aria-labelledby="trend-table-title">
      <PanelHeader title="3年度推移表" />
      {snapshots.length < 3 ? <p className="trend-guidance">3年度比較には、あと{3 - snapshots.length}年度分の登録が必要です。</p> : null}
      <div className="table-scroll trend-scroll">
        <table className="trend-table">
          <caption id="trend-table-title" className="sr-only">貸借対照表の3年度推移</caption>
          <thead><tr><th scope="col"><span className="sr-only">科目</span></th>{paddedPeriods.map((period, index) => <th scope="col" className="number period-selector" key={`period-${index}`}><span className="period-position-label">{periodLabels[index]}</span><select aria-label={`${periodLabels[index]}の選択`} value={period?.snapshot.id ?? ""} onChange={(event) => selectPeriod(index, event.target.value)}><option value="">未選択</option>{[...orderedSnapshots].reverse().map((snapshot) => <option key={snapshot.id} value={snapshot.id} disabled={selectedSnapshotIds.some((selectedId, selectedIndex) => selectedIndex !== index && selectedId === snapshot.id)}>{fiscalYearLabel(snapshot)}{snapshot.isCurrent ? "（現在）" : ""}</option>)}</select>{period ? <button type="button" className="period-edit" onClick={() => onEditSnapshot(period.snapshot.id)}><Pencil />この年度を修正</button> : null}</th>)}<th scope="col" className="number trend-change-column"><span>前年度差</span><small>最新 − 直前</small></th></tr></thead>
          <tbody>{visibleRows.map((row) => {
            if (row.tone === "section") return <tr className="trend-section" key={`section-${row.key}`}><th scope="rowgroup" colSpan={4}>{row.label}</th><td className="trend-change trend-section-change" aria-hidden="true" /></tr>;
            const change = latest && previous ? latest[row.key] - previous[row.key] : null;
            const expanded = row.group ? expandedGroups.has(row.group) : false;
            const canExpand = row.group ? childrenFor(row.group).length > 0 : false;
            const rowClass = [row.tone ? `trend-${row.tone}` : "", row.group ? "trend-expandable" : "", row.child ? "trend-child" : ""].filter(Boolean).join(" ");
            return <tr className={rowClass || undefined} key={`${row.child ? "child" : row.tone ?? "detail"}-${row.key}`}><th scope="row"><span className="trend-row-heading">{row.group && canExpand ? <button type="button" className="trend-expand" aria-label={`${row.label}の小分類を${expanded ? "閉じる" : "表示"}`} aria-expanded={expanded} onClick={() => toggleGroup(row.group!)}>{expanded ? <Minus /> : <Plus />}</button> : !row.child && !row.tone ? <span className="trend-expand-placeholder" aria-hidden="true" /> : null}<span>{row.label}</span></span></th>{paddedPeriods.map((period, index) => <td className="number" key={period?.snapshot.id ?? `empty-${index}`}>{period ? compactYen(period.values[row.key]) : "—"}</td>)}<td className={`number trend-change ${change === null ? "" : change > 0 ? "positive" : change < 0 ? "negative" : "neutral"}`}>{change === null ? "—" : `${change > 0 ? "+" : ""}${compactYen(change)}`}</td></tr>;
          })}</tbody>
        </table>
      </div>
    </section>
    <section className="panel table-panel history-list-panel">
      <PanelHeader title="年度一覧" subtitle={`${snapshots.length}年度`} />
      <div className="table-scroll"><table className="history-table"><thead><tr><th>基準日</th><th>状態</th><th className="number">資産合計</th><th className="number">負債合計</th><th className="number">純資産</th><th className="number">個人保証</th><th className="actions-column">操作</th></tr></thead><tbody>{[...orderedSnapshots].reverse().map((snapshot) => { const s = trendValues(snapshot); return <tr key={snapshot.id}><td><strong>{dateJa(snapshot.asOfDate)}</strong></td><td>{snapshot.isCurrent ? <span className="current-badge">現在</span> : snapshot.label}</td><td className="number">{compactYen(s.assets)}</td><td className="number">{compactYen(s.liabilities)}</td><td className="number emphasis">{compactYen(s.netWorth)}</td><td className="number">{compactYen(s.guarantees)}</td><td><div className="table-actions"><button type="button" className="row-action delete" title={`${snapshot.fiscalYear}年度を削除`} aria-label={`${snapshot.fiscalYear}年度のデータを削除`} onClick={() => onDeleteSnapshot(snapshot)}><Trash2 /><span className="sr-only">年度を削除</span></button></div></td></tr>; })}</tbody></table></div>
    </section>
  </>;
}
