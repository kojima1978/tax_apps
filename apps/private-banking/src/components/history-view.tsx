"use client";

import { Minus, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { ActionMenu } from "@/components/action-menu";
import { PanelHeader } from "@/components/panel-header";
import { PositionHistoryModal } from "@/components/position-history-modal";
import { compactYen, dateJaWithWareki, triangleYen } from "@/lib/format";
import { type PositionTrendRow, changeText, changeTone, positionTrendRows } from "@/lib/position-trend";
import {
  type Snapshot,
  type TrendGroup,
  fiscalYearLabel,
  positionSectionLabels,
  trendChildRows,
  trendRows,
  trendValues,
} from "@/lib/portfolio-view";
import { ScrollRegion } from "@/components/scroll-region";

export function HistoryView({ snapshots, onCreate, onEditSnapshot, onDeleteSnapshot, saving }: { snapshots: Snapshot[]; onCreate: () => void; onEditSnapshot: (snapshotId: number) => void; onDeleteSnapshot: (snapshot: Snapshot) => void; saving: boolean }) {
  const [expandedGroups, setExpandedGroups] = useState<Set<TrendGroup>>(() => new Set());
  const [historyLineageKey, setHistoryLineageKey] = useState<string | null>(null);
  const orderedSnapshots = [...snapshots].sort((a, b) => a.fiscalYear - b.fiscalYear || a.id - b.id);
  // 比較表は常に3期ぶんの位置を保つ。登録の無い期は列ごと隠さず、0円でもなく「データなし」と出す
  // （隠すと「無い」のか「見せていない」のか分からない）。言葉は見出し・セル・注記とも「データなし」1つ。
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
  const hasEmptyPeriod = paddedPeriods.some((period) => period === null);
  // 差が出せないときは、どの期が無いからなのかを見出しで言う（セルの「—」だけでは理由が分からない）。
  const changeBasis = !latest ? "最新年度のデータなし" : !previous ? "直前年度のデータなし" : "最新 − 直前";
  const childrenFor = (group: TrendGroup) => trendChildRows[group].filter((child) => periods.some((period) => period.values[child.key] !== 0));
  const visibleRows = trendRows.flatMap((row) => row.group && expandedGroups.has(row.group) ? [row, ...childrenFor(row.group)] : [row]);
  const periodSnapshots = paddedPeriods.map((period) => period?.snapshot ?? null);
  // 明細ごとの推移は年度推移表と同じ3期で並べる（年度の選択は上の表で行う）。
  const positionRows = positionTrendRows(periodSnapshots);

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
    <section className="page-heading history-page-heading"><div><h1>年度比較</h1></div><button className="button primary" onClick={onCreate} disabled={saving}><Plus />年度を追加</button></section>
    <section className="panel table-panel trend-panel" aria-label="年度推移表">
      <PanelHeader title="年度推移表" subtitle="3期" />
      {snapshots.length < columnCount ? <p className="trend-guidance">登録の無い期は「データなし」で表示しています。年度を追加すると比較できます。</p> : null}
      <ScrollRegion className="table-scroll trend-scroll" label="年度推移表">
        <table className="trend-table">
          <caption className="sr-only">貸借対照表の年度推移</caption>
          <thead><tr><th scope="col"><span className="sr-only">科目</span></th>{paddedPeriods.map((period, index) => <th scope="col" className={`center period-selector${period ? "" : " period-no-data"}`} key={`period-${index}`}><span className="period-position-label">{periodLabels[index]}</span><select aria-label={`${periodLabels[index]}の選択`} value={period?.snapshot.id ?? ""} onChange={(event) => selectPeriod(index, event.target.value)}>{/* 空の選択肢は空いている列にだけ出す。年度が3つ以上ある顧客で列を空にできると、
              逆算した年度が登録済みの年度と重なり、登録があるのに「データなし」と書いた列ができる。 */}{period ? null : <option value="">{periodFiscalYears[index] ? `${periodFiscalYears[index]}年度（データなし）` : "データなし"}</option>}{[...orderedSnapshots].reverse().map((snapshot) => <option key={snapshot.id} value={snapshot.id} disabled={selectedSnapshotIds.some((selectedId, selectedIndex) => selectedIndex !== index && selectedId === snapshot.id)}>{fiscalYearLabel(snapshot)}{snapshot.isCurrent ? "（現在）" : ""}</option>)}</select>{period ? <button type="button" className="period-edit" onClick={() => onEditSnapshot(period.snapshot.id)}><Pencil />この年度を修正</button> : null}</th>)}<th scope="col" className="number trend-change-column"><span>前年度差</span><small>{changeBasis}</small></th></tr></thead>
          <tbody>{visibleRows.map((row) => {
            if (row.tone === "section") return <tr className="trend-section" key={`section-${row.key}`}><th scope="rowgroup" colSpan={columnCount + 1}>{row.label}</th><td className="trend-change trend-section-change" aria-hidden="true" /></tr>;
            const change = latest && previous ? latest[row.key] - previous[row.key] : null;
            const expanded = row.group ? expandedGroups.has(row.group) : false;
            const canExpand = row.group ? childrenFor(row.group).length > 0 : false;
            const rowClass = [row.tone ? `trend-${row.tone}` : "", row.group ? "trend-expandable" : "", row.child ? "trend-child" : ""].filter(Boolean).join(" ");
            return <tr className={rowClass || undefined} key={`${row.child ? "child" : row.tone ?? "detail"}-${row.key}`}><th scope="row"><span className="trend-row-heading">{row.group && canExpand ? <button type="button" className="trend-expand" aria-label={`${row.label}の小分類を${expanded ? "閉じる" : "表示"}`} aria-expanded={expanded} onClick={() => toggleGroup(row.group!)}>{expanded ? <Minus /> : <Plus />}</button> : !row.child && !row.tone ? <span className="trend-expand-placeholder" aria-hidden="true" /> : null}<span>{row.label}</span></span></th>{paddedPeriods.map((period, index) => <td className={`number${period ? "" : " trend-no-data"}`} key={period?.snapshot.id ?? `empty-${index}`}>{period ? compactYen(period.values[row.key]) : "データなし"}</td>)}<td className={`number trend-change ${changeTone(change)}`}>{changeText(change, compactYen)}</td></tr>;
          })}</tbody>
        </table>
      </ScrollRegion>
      {/* 画面の案内（年度を追加する話）は紙で消えるので、紙には「データなし」の意味だけを残す。 */}
      {hasEmptyPeriod ? <p className="trend-print-note">「データなし」の期は、その年度が登録されていません。</p> : null}
    </section>
    <section className="panel table-panel trend-panel position-trend-panel" aria-label="明細ごとの推移">
      <PanelHeader title="明細ごとの推移" subtitle={`${positionRows.length}件`} />
      {positionRows.length > 0 ? <>
        <p className="trend-guidance position-trend-guidance">上の表と同じ3期です。名称を押すと、その明細の全年度の推移を表示します。</p>
        <ScrollRegion className="table-scroll trend-scroll" label="明細ごとの推移">
          <table className="trend-table position-trend-table">
            <caption className="sr-only">明細ごとの評価額の年度推移</caption>
            <thead><tr><th scope="col">明細</th>{paddedPeriods.map((period, index) => <th scope="col" className={`number${period ? "" : " period-no-data"}`} key={`position-period-${index}`}><span className="period-position-label">{periodLabels[index]}</span><small>{period ? fiscalYearLabel(period.snapshot) : periodFiscalYears[index] ? `${periodFiscalYears[index]}年度（データなし）` : "データなし"}</small></th>)}<th scope="col" className="number trend-change-column"><span>前年度差</span><small>{changeBasis}</small></th></tr></thead>
            <tbody>{positionRows.map((row, rowIndex) => {
              const sectionStart = rowIndex === 0 || positionRows[rowIndex - 1].section !== row.section;
              return <PositionTrendRowView key={row.lineageKey} row={row} sectionStart={sectionStart} periods={paddedPeriods.map((period) => period !== null)} onOpen={() => setHistoryLineageKey(row.lineageKey)} />;
            })}</tbody>
          </table>
        </ScrollRegion>
        <p className="trend-print-note position-trend-print-note">「—」はその年度に登録が無い明細です。前年度差は、無い年度を0円として求めています。</p>
      </> : <p className="position-trend-empty">選んだ年度には明細が登録されていません。</p>}
    </section>
    {historyLineageKey ? <PositionHistoryModal snapshots={snapshots} lineageKey={historyLineageKey} onClose={() => setHistoryLineageKey(null)} /> : null}
    {/* 年度一覧は画面だけ。印刷では、データなしの期も含めて常に表示する3期の推移表を使う。 */}
    <section className="panel table-panel history-list-panel">
      <PanelHeader title="年度一覧" subtitle={`${snapshots.length}年度`} />
      <ScrollRegion className="table-scroll" label="年度一覧"><table className="history-table"><thead><tr><th className="center">基準日</th><th className="center">状態</th><th className="number">資産合計</th><th className="number">登録負債</th><th className="number">税金等</th><th className="number">予測純資産</th><th className="number">個人保証</th><th className="number">相続税（実効税率）</th><th className="actions-column">操作</th></tr></thead><tbody>{[...orderedSnapshots].reverse().map((snapshot) => { const s = trendValues(snapshot); const calc = snapshot.inheritanceTaxCalculation; return <tr key={snapshot.id}><td className="center"><strong>{dateJaWithWareki(snapshot.asOfDate)}</strong></td><td className="center">{snapshot.isCurrent ? <span className="current-badge">現在</span> : snapshot.label}</td><td className="number">{compactYen(s.assets)}</td><td className="number">{compactYen(s.borrowings + s.otherLiabilities)}</td><td className="number">{compactYen(s.taxes)}</td><td className="number emphasis">{compactYen(s.netWorth)}</td><td className="number">{compactYen(s.guarantees)}</td><td className="number">{calc ? <><strong>{compactYen(calc.totalInheritanceTaxJpy)}</strong><small className="history-tax-rate">実効税率 {calc.effectiveTaxRate.toFixed(1)}%</small></> : <span className="history-tax-empty">未計算</span>}</td><td><div className="table-actions">{/* 行の操作は顧客一覧・資産負債明細と同じ「…」1つに揃える。削除だけを剥き出しのボタンで置いていたため、
                この表だけ消す操作がワンクリックで並んでいた。 */}<ActionMenu
                  id={`snapshot-menu-${snapshot.id}`}
                  label={`${fiscalYearLabel(snapshot)}の操作`}
                  busy={saving}
                  items={[
                    { key: "edit", label: "この年度を修正", icon: Pencil, onSelect: () => onEditSnapshot(snapshot.id) },
                    { key: "delete", label: "年度データを削除", icon: Trash2, danger: true, onSelect: () => onDeleteSnapshot(snapshot) },
                  ]}
                /></div></td></tr>; })}</tbody></table></ScrollRegion>
    </section>
  </>;
}

function PositionTrendRowView({ row, sectionStart, periods, onOpen }: { row: PositionTrendRow; sectionStart: boolean; periods: boolean[]; onOpen: () => void }) {
  return <>
    {sectionStart ? <tr className="trend-section"><th scope="rowgroup" colSpan={periods.length + 1}>{positionSectionLabels[row.section]}</th><td className="trend-change trend-section-change" aria-hidden="true" /></tr> : null}
    <tr className={row.status === "ended" ? "position-trend-ended" : undefined}>
      <th scope="row">
        <small className="position-trend-caption">{row.caption}{row.status ? <span className={`position-trend-tag ${row.status}`}>{row.status === "new" ? "新規" : "最新年度に無し"}</span> : null}</small>
        <button type="button" className="position-trend-name" onClick={onOpen} aria-haspopup="dialog">{row.name}</button>
        {row.detail ? <small className="position-trend-detail">{row.detail}</small> : null}
        {row.formerNames.length > 0 ? <small className="position-trend-former">旧名称：{row.formerNames.join("、")}</small> : null}
      </th>
      {row.values.map((value, index) => !periods[index]
        ? <td className="number trend-no-data" key={index}>データなし</td>
        : <td className="number" key={index}>{value === null ? <><span aria-hidden="true">—</span><span className="sr-only">登録なし</span></> : triangleYen(value)}</td>)}
      <td className={`number trend-change ${changeTone(row.change)}`}>{changeText(row.change, triangleYen)}</td>
    </tr>
  </>;
}
