"use client";

import { X } from "lucide-react";
import { useMemo } from "react";

import { ScrollRegion } from "@/components/scroll-region";
import { useModalDialog } from "@/components/use-modal-dialog";
import { dateJaWithWareki, triangleYen } from "@/lib/format";
import { positionCaption } from "@/lib/position-display";
import { changeText, changeTone, lineageHistory } from "@/lib/position-trend";
import { type Snapshot, fiscalYearLabel, institutionOrPropertyAddress, valuationDetailLine } from "@/lib/portfolio-view";

/**
 * 1つの明細の全年度の推移。年度比較の「明細ごとの推移」で名称を押すと開く（画面だけ。印刷しない）。
 * 年度比較の表は3期しか並ばないので、それより前の年度や、名称・所在・評価方法がいつ変わったかはここで見る。
 */
export function PositionHistoryModal({ snapshots, lineageKey, onClose }: { snapshots: Snapshot[]; lineageKey: string; onClose: () => void }) {
  const { dialogRef, onKeyDown } = useModalDialog<HTMLDivElement>({ onEscape: onClose, initialFocus: "h2" });
  const entries = useMemo(() => lineageHistory(snapshots, lineageKey), [snapshots, lineageKey]);
  const current = entries.findLast((entry) => entry.position !== null)?.position ?? null;
  if (!current) return null;
  const names = new Set(entries.flatMap((entry) => entry.position ? [entry.position.name] : []));

  return <div className="modal-layer" role="presentation" onKeyDown={onKeyDown}><div ref={dialogRef} className="modal position-history-modal" role="dialog" aria-modal="true" aria-labelledby="position-history-title" tabIndex={-1}>
    <header><div><small className="position-history-caption">{positionCaption(current)}</small><h2 id="position-history-title" tabIndex={-1}>{current.name}の推移</h2></div><button type="button" className="icon-button" aria-label="閉じる" onClick={onClose}><X /></button></header>
    <div className="position-history-body">
      {names.size > 1 ? <p className="position-history-note">名称を変えた年度があります。年度ごとの名称は表で確かめられます。</p> : null}
      <ScrollRegion className="table-scroll" label="明細の推移">
        <table className="position-history-table">
          <caption className="sr-only">{current.name}の年度ごとの評価額</caption>
          <thead><tr><th scope="col">年度</th><th scope="col">名称・金融機関／所在</th><th scope="col">評価方法</th><th scope="col" className="number">評価額</th><th scope="col" className="number">前の年度との差</th></tr></thead>
          <tbody>{[...entries].reverse().map(({ snapshot, position, change }) => <tr key={snapshot.id} className={position ? undefined : "position-history-absent"}>
            <th scope="row"><strong>{fiscalYearLabel(snapshot)}</strong><small>{dateJaWithWareki(snapshot.asOfDate)}</small></th>
            {position ? <>
              <td><span className="position-history-name">{position.name}</span>{institutionOrPropertyAddress(position) ? <small>{institutionOrPropertyAddress(position)}</small> : null}</td>
              <td><span>{position.valuationMethod || "金額を直接入力"}</span>{valuationDetailLine(position) ? <small>{valuationDetailLine(position)}</small> : null}</td>
              <td className="number">{triangleYen(position.valueJpy)}</td>
              <td className={`number trend-change ${changeTone(change)}`}>{changeText(change, triangleYen)}</td>
            </> : <td colSpan={4} className="position-history-absent-cell">この年度には登録がありません</td>}
          </tr>)}</tbody>
        </table>
      </ScrollRegion>
    </div>
  </div></div>;
}
