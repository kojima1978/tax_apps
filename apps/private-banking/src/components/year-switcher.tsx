"use client";

import { CalendarDays, CalendarPlus, Pencil, Printer } from "lucide-react";
import { useMemo } from "react";
import { ActionMenu, type ActionMenuItem } from "@/components/action-menu";
import { dateJaWithWareki } from "@/lib/format";
import { type Snapshot, fiscalYearLabel } from "@/lib/portfolio-view";

/**
 * トップバーの表示年度の切替。どの画面でも同じ年度を見るよう、選んだ年度は URL（?snapshot=）で引き継ぐ。
 * 年度そのものの操作（追加・設定）は頻度が低いので、横の「⋯」メニューにまとめる。
 * 狭い画面では基準日をメニューの先頭へ、印刷をメニューの中へ移す（出し分けは CSS）。
 * 基準日は和暦を併記する（西暦・和暦どちらで聞かれても答えられるように）。
 */
export function YearSwitcher({ snapshots, selected, onSelect, onCreate, onEditSettings, onPrint }: {
  snapshots: Snapshot[];
  selected: Snapshot;
  onSelect: (snapshotId: number) => void;
  onCreate: () => void;
  onEditSettings: () => void;
  onPrint: () => void;
}) {
  const orderedSnapshots = useMemo(() => [...snapshots].sort((a, b) => b.fiscalYear - a.fiscalYear), [snapshots]);
  const asOfLabel = `基準日 ${dateJaWithWareki(selected.asOfDate)}`;
  const menuItems: ActionMenuItem[] = [
    { key: "create", label: "年度を追加", icon: CalendarPlus, onSelect: onCreate },
    { key: "settings", label: `${fiscalYearLabel(selected)}の年度設定`, icon: Pencil, onSelect: onEditSettings },
    { key: "print", label: "印刷・PDF出力", icon: Printer, onSelect: onPrint, className: "year-menu-print" },
  ];

  return <div className={`year-switcher ${selected.isCurrent ? "" : "historical"}`}>
    <label title={asOfLabel}>
      <span className="year-switcher-caption"><CalendarDays aria-hidden="true" /><span className="year-switcher-caption-text">表示年度</span></span>
      <select aria-label="表示年度" value={selected.id} onChange={(event) => onSelect(Number(event.target.value))}>
        {orderedSnapshots.map((item) => <option key={item.id} value={item.id}>{fiscalYearLabel(item)}{item.isCurrent ? " 現在" : ""}</option>)}
      </select>
    </label>
    {/* 狭い画面では見た目だけ隠し、読み上げには残す（メニュー先頭の基準日は見た目用）。 */}
    <span className="year-switcher-date">{asOfLabel}</span>
    <ActionMenu id="year-actions-menu" label="年度の操作" items={menuItems} heading={asOfLabel} className="year-switcher-menu" />
  </div>;
}
