"use client";

import { AlertTriangle, ExternalLink, LoaderCircle, Save, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollRegion } from "@/components/scroll-region";
import { useModalDialog } from "@/components/use-modal-dialog";
import { API_BASE } from "@/lib/api";
import { type PropertyLocationAdoptResult, type PropertyLocationCandidate, propertyPositionHref } from "@/lib/properties";

type Status = { kind: "loading" } | { kind: "error"; message: string } | { kind: "ready"; rows: PropertyLocationCandidate[] };

const clientText = (row: PropertyLocationCandidate) => `${row.clientCode} ${row.clientName}（${row.fiscalYear}年度）`;
const blank = (value: string) => value || "－";

/**
 * 所在をまとめて分ける。構造を持たない不動産の明細について、原文から分けた案を一覧にし、
 * 分け切れた行（問題の無い行）だけを選んでまとめて保存する。評価額などほかの項目は変えない。
 * 住居表示・照合できない市区町村などの行は保存の対象にせず、明細を開いて人が入力する。
 */
export function PropertyLocationAdoptModal({ onClose, onSaved }: {
  onClose: () => void;
  onSaved: (result: PropertyLocationAdoptResult) => void;
}) {
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const { dialogRef, onKeyDown } = useModalDialog<HTMLDivElement>({ onEscape: () => { if (!saving) onClose(); }, initialFocus: "h2" });

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(`${API_BASE}/properties/locations`, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error();
        const { rows } = await response.json() as { rows: PropertyLocationCandidate[] };
        setStatus({ kind: "ready", rows });
        // 分け切れた行は最初から選んでおく（見比べて外したい行だけ外す）
        setSelected(new Set(rows.filter((row) => row.problems.length === 0).map((row) => row.positionId)));
      } catch {
        if (!controller.signal.aborted) setStatus({ kind: "error", message: "所在を分けていない明細を読み込めませんでした。画面を更新してください。" });
      }
    })();
    return () => controller.abort();
  }, []);

  const rows = useMemo(() => status.kind === "ready" ? status.rows : [], [status]);
  const adoptable = useMemo(() => rows.filter((row) => row.problems.length === 0), [rows]);
  const needsPerson = useMemo(() => rows.filter((row) => row.problems.length > 0), [rows]);
  const allSelected = adoptable.length > 0 && adoptable.every((row) => selected.has(row.positionId));
  const someSelected = selected.size > 0 && !allSelected;
  const selectAllRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected; }, [someSelected]);

  const toggle = (positionId: number) => setSelected((current) => {
    const next = new Set(current);
    if (next.has(positionId)) next.delete(positionId); else next.add(positionId);
    return next;
  });

  const save = async () => {
    const items = adoptable.filter((row) => selected.has(row.positionId)).map((row) => ({ positionId: row.positionId, source: row.location.source }));
    if (items.length === 0) return;
    setSaving(true);
    setSaveError("");
    try {
      const response = await fetch(`${API_BASE}/properties/locations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }) });
      const result = await response.json().catch(() => null) as PropertyLocationAdoptResult & { error?: string } | null;
      if (!response.ok || !result) throw new Error(result?.error ?? "保存できませんでした。もう一度お試しください。");
      onSaved(result);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "保存できませんでした。もう一度お試しください。");
      setSaving(false);
    }
  };

  return <div className="modal-layer" role="presentation" onKeyDown={onKeyDown}><div ref={dialogRef} className="modal location-adopt-modal" role="dialog" aria-modal="true" aria-labelledby="location-adopt-title" aria-describedby="location-adopt-description">
    <header>
      <div>
        <h2 id="location-adopt-title" tabIndex={-1}>所在をまとめて分ける</h2>
        <p id="location-adopt-description">所在・地番の原文しか持たない不動産（全年度）を、市区町村・大字町名・字・地番に分けて保存します。原文は残し、評価額などほかの項目は変えません。</p>
      </div>
      <button type="button" className="icon-button" aria-label="閉じる" onClick={onClose} disabled={saving}><X /></button>
    </header>
    <div className="location-adopt-body">
      {status.kind === "loading" ? <p className="properties-loading" role="status"><LoaderCircle className="spin" />読み込み中です…</p> : null}
      {status.kind === "error" ? <p className="backup-message error" role="alert"><AlertTriangle />{status.message}</p> : null}
      {status.kind === "ready" && rows.length === 0 ? <p className="location-adopt-empty">所在を分けていない不動産はありません。</p> : null}
      {adoptable.length > 0 ? <section aria-labelledby="location-adopt-ready-title">
        <h3 id="location-adopt-ready-title">原文から分けられた明細（{adoptable.length}件）</h3>
        <p className="location-adopt-help">原文と分けた案を見比べ、違っている行はチェックを外してください（外した行は明細を開いて直せます）。市区町村コードは保存のときに名前から付きます。</p>
        <ScrollRegion className="table-scroll location-adopt-scroll" label="原文から分けられた明細">
          <table className="location-adopt-table">
            <thead><tr>
              <th scope="col" className="location-adopt-check"><input ref={selectAllRef} type="checkbox" aria-label="分けられた明細をすべて選ぶ" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(adoptable.map((row) => row.positionId)))} disabled={saving} /></th>
              <th scope="col">顧客・年度</th><th scope="col">名称</th><th scope="col">所在・地番の原文</th>
              <th scope="col">市区町村</th><th scope="col">大字・町名</th><th scope="col">字</th><th scope="col">地番</th>
            </tr></thead>
            <tbody>{adoptable.map((row) => <tr key={row.positionId} className={selected.has(row.positionId) ? "is-selected" : undefined}>
              <td className="location-adopt-check"><input type="checkbox" aria-label={`${row.name}（${clientText(row)}）を保存する`} checked={selected.has(row.positionId)} onChange={() => toggle(row.positionId)} disabled={saving} /></td>
              <td className="location-adopt-client">{clientText(row)}</td>
              <td><span className="category-tag">{row.categoryLabel}</span>{row.propertyTypeLabel}<br />{row.name}</td>
              <td className="location-adopt-source">{row.location.source}</td>
              <td>{row.location.municipalityName}<small>{row.location.municipalityCode}</small></td>
              <td>{blank(row.location.townName)}</td>
              <td>{blank(row.location.aza)}</td>
              <td>{row.location.lotNumber}</td>
            </tr>)}</tbody>
          </table>
        </ScrollRegion>
      </section> : null}
      {needsPerson.length > 0 ? <details className="location-adopt-manual" open={adoptable.length === 0}>
        <summary>人が確かめて入力する明細（{needsPerson.length}件）</summary>
        <p className="location-adopt-help">住居表示しか分からない・市区町村を照合できないなどの行です。まとめては保存しません。「開く」で明細を別のタブに開いて入力してください。</p>
        <ScrollRegion className="table-scroll location-adopt-scroll" label="人が確かめて入力する明細">
          <table className="location-adopt-table">
            <thead><tr><th scope="col">顧客・年度</th><th scope="col">名称</th><th scope="col">所在・地番の原文</th><th scope="col">分けられなかった理由</th><th scope="col"><span className="sr-only">明細を開く</span></th></tr></thead>
            <tbody>{needsPerson.map((row) => <tr key={row.positionId}>
              <td className="location-adopt-client">{clientText(row)}</td>
              <td><span className="category-tag">{row.categoryLabel}</span>{row.propertyTypeLabel}<br />{row.name}</td>
              <td className="location-adopt-source">{row.location.source}</td>
              <td><ul className="location-adopt-problems">{row.problems.map((problem) => <li key={problem}>{problem}</li>)}</ul></td>
              <td><Link className="button secondary location-adopt-open" href={propertyPositionHref(row)} target="_blank" rel="noopener">開く<ExternalLink /><span className="sr-only">（{row.name}・新しいタブ）</span></Link></td>
            </tr>)}</tbody>
          </table>
        </ScrollRegion>
      </details> : null}
      {saveError ? <p className="bulk-form-error" role="alert"><AlertTriangle />{saveError}</p> : null}
    </div>
    <footer className="location-adopt-footer">
      <button type="button" className="button secondary" onClick={onClose} disabled={saving}>閉じる</button>
      {adoptable.length > 0 ? <button type="button" className="button primary" onClick={save} disabled={saving || selected.size === 0}>
        {saving ? <LoaderCircle className="spin" /> : <Save />}選んだ{selected.size}件を保存
      </button> : null}
    </footer>
  </div></div>;
}
