"use client";

import { GripVertical, Pencil, Plus, Table2, Trash2 } from "lucide-react";
import { DragEvent, KeyboardEvent, useMemo, useState } from "react";
import { PanelHeader } from "@/components/panel-header";
import { yen } from "@/lib/format";
import {
  type Position,
  type PositionSection,
  type PositionSortMode,
  type Snapshot,
  categoryLabels,
  fiscalYearLabel,
  institutionOrPropertyAddress,
  middleClassification,
  middleClassificationRank,
  valuationBreakdown,
} from "@/lib/portfolio-view";

export function AssetsView({ snapshot, snapshots, onSelectSnapshot, onCreateNext, onAdd, onBulkAdd, onBulkEdit, onEdit, onDelete, onReorder, onEditTaxes, onBack, saving }: { snapshot: Snapshot; snapshots: Snapshot[]; onSelectSnapshot: (snapshotId: number) => void; onCreateNext: () => void; onAdd: () => void; onBulkAdd: () => void; onBulkEdit: () => void; onEdit: (position: Position) => void; onDelete: (position: Position) => void; onReorder: (section: PositionSection, orderedIds: number[]) => Promise<boolean>; onEditTaxes: () => void; onBack?: () => void; saving: boolean }) {
  const assets = snapshot.positions.filter((p) => p.side === "ASSET");
  const liabilities = snapshot.positions.filter((p) => p.side === "LIABILITY" && p.includedInNetWorth);
  const contingencies = snapshot.positions.filter((p) => p.side === "LIABILITY" && !p.includedInNetWorth);
  const orderedSnapshots = [...snapshots].sort((a, b) => b.fiscalYear - a.fiscalYear);
  const updatedAt = new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeStyle: "short" }).format(new Date(snapshot.updatedAt));
  return <><section className="page-heading detail-page-heading"><div><p className="eyebrow">ASSET &amp; LIABILITY DETAILS</p><h2>資産・負債明細</h2><p className="detail-heading-meta"><span className={`detail-status ${snapshot.isCurrent ? "current" : "historical"}`}>{snapshot.isCurrent ? "現在年度" : "過年度を編集中"}</span><span>最終更新 {updatedAt}</span>{!snapshot.isCurrent ? <span>現在年度のデータには影響しません</span> : null}</p></div><div className="page-heading-actions detail-page-actions"><label className="detail-year-selector"><span>表示年度</span><select aria-label="資産・負債明細の表示年度" value={snapshot.id} onChange={(event) => onSelectSnapshot(Number(event.target.value))}>{orderedSnapshots.map((item) => <option key={item.id} value={item.id}>{fiscalYearLabel(item)}{item.isCurrent ? "（現在）" : ""}</option>)}</select></label>{onBack ? <button className="button secondary" onClick={onBack}>年度比較へ戻る</button> : null}<button className="button secondary" onClick={onCreateNext}><Plus />年度を追加</button><button className="button secondary" onClick={onEditTaxes}><Pencil />税金を修正</button><div className="entry-action-group" role="group" aria-label="明細の追加と一括編集"><button className="button secondary" onClick={onBulkEdit}><Pencil />表で編集</button><button className="button secondary" onClick={onBulkAdd}><Table2 />表で追加</button><button className="button primary" onClick={onAdd}><Plus />1件追加</button></div></div></section><PositionTable key={`${snapshot.id}-ASSET-${snapshot.updatedAt}`} title="資産の部" section="ASSET" items={assets} onEdit={onEdit} onDelete={onDelete} onReorder={onReorder} saving={saving} /><PositionTable key={`${snapshot.id}-LIABILITY-${snapshot.updatedAt}`} title="負債の部" section="LIABILITY" items={liabilities} onEdit={onEdit} onDelete={onDelete} onReorder={onReorder} saving={saving} /><PositionTable key={`${snapshot.id}-CONTINGENT-${snapshot.updatedAt}`} title="偶発債務の部（B/S外）" section="CONTINGENT" items={contingencies} onEdit={onEdit} onDelete={onDelete} onReorder={onReorder} saving={saving} /></>;
}

function PositionTable({ title, section, items, onEdit, onDelete, onReorder, saving }: { title: string; section: PositionSection; items: Position[]; onEdit: (position: Position) => void; onDelete: (position: Position) => void; onReorder: (section: PositionSection, orderedIds: number[]) => Promise<boolean>; saving: boolean }) {
  const [orderedItems, setOrderedItems] = useState(items);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dropTargetId, setDropTargetId] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [classificationFilter, setClassificationFilter] = useState("ALL");
  const [sortMode, setSortMode] = useState<PositionSortMode>("classification-asc");

  const classifications = useMemo(() => {
    const values = [...new Set(orderedItems.map(middleClassification))];
    return values.sort((a, b) => (middleClassificationRank.get(a) ?? Number.MAX_SAFE_INTEGER) - (middleClassificationRank.get(b) ?? Number.MAX_SAFE_INTEGER));
  }, [orderedItems]);
  const visibleItems = useMemo(() => {
    const filtered = classificationFilter === "ALL"
      ? orderedItems
      : orderedItems.filter((position) => middleClassification(position) === classificationFilter);
    if (sortMode === "manual") return filtered;
    const manualIndex = new Map(orderedItems.map((position, index) => [position.id, index]));
    const direction = sortMode === "classification-asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const rankA = middleClassificationRank.get(middleClassification(a)) ?? Number.MAX_SAFE_INTEGER;
      const rankB = middleClassificationRank.get(middleClassification(b)) ?? Number.MAX_SAFE_INTEGER;
      return (rankA - rankB) * direction || (manualIndex.get(a.id) ?? 0) - (manualIndex.get(b.id) ?? 0);
    });
  }, [classificationFilter, orderedItems, sortMode]);
  const canManualReorder = classificationFilter === "ALL" && sortMode === "manual";
  const hasClassificationControls = classifications.length > 1;
  const visibleTotal = visibleItems.reduce((sum, position) => sum + position.valueJpy, 0);

  async function movePosition(positionId: number, targetIndex: number) {
    if (!canManualReorder) return;
    const currentIndex = orderedItems.findIndex((position) => position.id === positionId);
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= orderedItems.length || currentIndex === targetIndex) return;
    const previous = orderedItems;
    const next = [...orderedItems];
    const [moved] = next.splice(currentIndex, 1);
    next.splice(targetIndex, 0, moved);
    setOrderedItems(next);
    setAnnouncement(`${moved.name}を${targetIndex + 1}番目へ移動しました。`);
    const saved = await onReorder(section, next.map((position) => position.id));
    if (!saved) {
      setOrderedItems(previous);
      setAnnouncement("並び順を元に戻しました。");
    }
  }

  function startDrag(event: DragEvent<HTMLButtonElement>, positionId: number) {
    if (!canManualReorder) return;
    setDraggedId(positionId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(positionId));
  }

  function dropPosition(event: DragEvent<HTMLTableRowElement>, targetId: number) {
    event.preventDefault();
    if (draggedId === null || !canManualReorder) return;
    const targetIndex = orderedItems.findIndex((position) => position.id === targetId);
    void movePosition(draggedId, targetIndex);
    setDraggedId(null);
    setDropTargetId(null);
  }

  function moveWithKeyboard(event: KeyboardEvent<HTMLButtonElement>, positionId: number) {
    if (!canManualReorder) return;
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    const currentIndex = orderedItems.findIndex((position) => position.id === positionId);
    void movePosition(positionId, currentIndex + (event.key === "ArrowUp" ? -1 : 1));
  }

  const filterActive = classificationFilter !== "ALL";
  const reorderHint = canManualReorder ? "登録順・ドラッグで並び替え" : "絞り込み・表示順を適用中";
  const dragDisabledMessage = "並び替えるには、中分類を「すべて」、表示順を「登録順」に戻してください";

  return (
    <section className={`panel table-panel position-section ${section === "CONTINGENT" ? "contingent-section" : ""}`}>
      <PanelHeader
        title={title}
        subtitle={`${visibleItems.length === items.length ? `${items.length}件` : `${visibleItems.length}/${items.length}件表示`}・${reorderHint}`}
        action={hasClassificationControls ? (
          <div className="position-table-tools" aria-label={`${title}の表示設定`}>
            <label>
              <span>中分類</span>
              <select aria-label={`${title}の中分類を絞り込み`} value={classificationFilter} onChange={(event) => setClassificationFilter(event.target.value)}>
                <option value="ALL">すべて</option>
                {classifications.map((classification) => <option key={classification} value={classification}>{classification}</option>)}
              </select>
            </label>
            <label>
              <span>表示順</span>
              <select aria-label={`${title}の中分類の並び順`} value={sortMode} onChange={(event) => setSortMode(event.target.value as PositionSortMode)}>
                <option value="manual">登録順</option>
                <option value="classification-asc">中分類順</option>
                <option value="classification-desc">中分類の逆順</option>
              </select>
            </label>
          </div>
        ) : undefined}
      />
      <p className="sr-only" aria-live="polite">{announcement}</p>
      <div className="table-scroll">
        <table className="position-table">
          <thead><tr><th className="reorder-column"><span className="sr-only">並び順</span></th><th>中分類</th><th>科目・名称</th><th>所在地・金融機関等</th><th>評価方法</th><th className="number">円換算時価</th><th className="actions-column">操作</th></tr></thead>
          <tbody>
            {visibleItems.length === 0 ? <tr className="position-empty-row"><td colSpan={7}>該当する明細はありません。</td></tr> : visibleItems.map((p, index) => (
              <tr key={p.id} className={`${index > 0 && visibleItems[index - 1].category !== p.category ? "is-category-start" : ""} ${draggedId === p.id ? "is-dragging" : ""} ${dropTargetId === p.id && draggedId !== p.id ? "is-drop-target" : ""}`} onDragOver={(event) => { if (!canManualReorder || draggedId === null || draggedId === p.id) return; event.preventDefault(); event.dataTransfer.dropEffect = "move"; setDropTargetId(p.id); }} onDragLeave={() => setDropTargetId((current) => current === p.id ? null : current)} onDrop={(event) => dropPosition(event, p.id)}>
                <td data-label="並び順" className="reorder-cell"><button type="button" className="drag-handle" draggable={!saving && canManualReorder} disabled={saving || !canManualReorder} aria-label={canManualReorder ? `${p.name}を並び替え。上下矢印キーでも移動できます` : dragDisabledMessage} title={canManualReorder ? "ドラッグして並び替え" : dragDisabledMessage} onDragStart={(event) => startDrag(event, p.id)} onDragEnd={() => { setDraggedId(null); setDropTargetId(null); }} onKeyDown={(event) => moveWithKeyboard(event, p.id)}><GripVertical /></button></td>
                <td data-label="中分類"><span className="classification-label middle">{middleClassification(p)}</span></td>
                <td data-label="科目・名称">{section !== "CONTINGENT" ? <span className="category-tag">{categoryLabels[p.category]}</span> : null}<strong>{p.name}</strong><small className="position-meta">{institutionOrPropertyAddress(p) || "保管先なし"} ／ {p.valuationMethod}</small></td>
                <td data-label="所在地・金融機関等" title={institutionOrPropertyAddress(p) || undefined}>{institutionOrPropertyAddress(p) || "—"}</td>
                <td data-label="評価方法" title={valuationBreakdown(p) || p.valuationMethod}><span>{p.valuationMethod}</span>{valuationBreakdown(p) ? <small className="valuation-breakdown">{valuationBreakdown(p)}</small> : null}</td>
                <td data-label="円換算時価" className="number"><strong>{yen.format(p.valueJpy)}</strong>{p.currency !== "JPY" ? <small>{p.originalAmount.toLocaleString()} {p.currency} × {p.fxRate}</small> : null}</td>
                <td data-label="操作"><div className="table-actions"><button className="row-action edit" title="修正" aria-label={`${p.name}を修正`} onClick={() => onEdit(p)}><Pencil /><span className="sr-only">修正</span></button><button className="row-action delete" title="削除" aria-label={`${p.name}を削除`} onClick={() => onDelete(p)}><Trash2 /><span className="sr-only">削除</span></button></div></td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr><td className="position-total-row" colSpan={7}><div><span>{filterActive ? "表示中の合計" : "合計"}</span><strong>{yen.format(visibleTotal)}</strong></div></td></tr></tfoot>
        </table>
      </div>
    </section>
  );
}
