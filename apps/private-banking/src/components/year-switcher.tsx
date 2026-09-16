"use client";

import { CalendarPlus, Pencil } from "lucide-react";
import { useMemo } from "react";
import { ActionMenu, type ActionMenuItem } from "@/components/action-menu";
import { dateJa } from "@/lib/format";
import { type Snapshot, fiscalYearLabel } from "@/lib/portfolio-view";

/**
 * トップバーの表示年度の切替。どの画面でも同じ年度を見るよう、選んだ年度は URL（?snapshot=）で引き継ぐ。
 * 年度そのものの操作（追加・設定）は頻度が低いので、横の「⋯」メニューにまとめる。
 */
export function YearSwitcher({ snapshots, selected, onSelect, onCreate, onEditSettings }: {
  snapshots: Snapshot[];
  selected: Snapshot;
  onSelect: (snapshotId: number) => void;
  onCreate: () => void;
  onEditSettings: () => void;
}) {
  const orderedSnapshots = useMemo(() => [...snapshots].sort((a, b) => b.fiscalYear - a.fiscalYear), [snapshots]);
  const menuItems: ActionMenuItem[] = [
    { key: "create", label: "年度を追加", icon: CalendarPlus, onSelect: onCreate },
    { key: "settings", label: `${fiscalYearLabel(selected)}の年度設定`, icon: Pencil, onSelect: onEditSettings },
  ];

  return <div className={`year-switcher ${selected.isCurrent ? "" : "historical"}`}>
    <label>
      <span className="year-switcher-caption">表示年度</span>
      <select aria-label="表示年度" value={selected.id} onChange={(event) => onSelect(Number(event.target.value))}>
        {orderedSnapshots.map((item) => <option key={item.id} value={item.id}>{fiscalYearLabel(item)}{item.isCurrent ? "（現在）" : ""}</option>)}
      </select>
    </label>
    <span className="year-switcher-date">基準日 {dateJa(selected.asOfDate)}</span>
    <ActionMenu id="year-actions-menu" label="年度の操作" items={menuItems} className="year-switcher-menu" />
  </div>;
}
