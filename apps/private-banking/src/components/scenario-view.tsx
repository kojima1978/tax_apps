"use client";

import { AlertTriangle, GitCompareArrows, LoaderCircle, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { API_BASE } from "@/lib/api";
import { compactYen } from "@/lib/format";
import { useModalDialog } from "@/components/use-modal-dialog";

type Scenario = { id: number; name: string; assetChangePercent: number; liabilityChangePercent: number; inheritanceTaxJpy: number; successionCostsJpy: number; note: string; updatedAt: string };

export function ScenarioView({ householdId, assets, liabilities, defaultTax }: { householdId: number; assets: number; liabilities: number; defaultTax: number }) {
  const [items, setItems] = useState<Scenario[] | null>(null);
  const [editing, setEditing] = useState<Scenario | null | "new">(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const load = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/scenarios?householdId=${householdId}`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      setItems(await response.json() as Scenario[]); setError("");
    } catch { setItems([]); setError("保存済みシナリオを読み込めませんでした。"); }
  }, [householdId]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  const currentNet = assets - liabilities - defaultTax;
  const rows = useMemo(() => (items ?? []).map((item) => {
    const adjustedAssets = Math.round(assets * (1 + item.assetChangePercent / 100));
    const adjustedLiabilities = Math.round(liabilities * (1 + item.liabilityChangePercent / 100));
    const net = adjustedAssets - adjustedLiabilities - item.inheritanceTaxJpy - item.successionCostsJpy;
    return { ...item, adjustedAssets, adjustedLiabilities, net, difference: net - currentNet };
  }), [items, assets, liabilities, currentNet]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    const body = { ...Object.fromEntries(new FormData(event.currentTarget).entries()), householdId, ...(editing !== "new" && editing ? { id: editing.id } : {}) };
    try {
      const response = await fetch(`${API_BASE}/scenarios`, { method: editing === "new" ? "POST" : "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error ?? "シナリオを保存できませんでした。");
      setEditing(null); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "シナリオを保存できませんでした。"); }
    finally { setSaving(false); }
  }

  async function remove(item: Scenario) {
    if (!window.confirm(`シナリオ「${item.name}」を削除しますか？`)) return;
    setDeletingId(item.id); setError("");
    try {
      const response = await fetch(`${API_BASE}/scenarios`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, householdId }) });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error ?? "シナリオを削除できませんでした。");
      await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "シナリオを削除できませんでした。"); }
    finally { setDeletingId(null); }
  }

  return <>
    <section className="page-heading scenario-heading"><div><h2>シナリオ比較</h2><p>現在のB/Sを変更せず、資産価値・負債・税金・承継費用の前提を比較します。</p></div><button className="button primary" onClick={() => setEditing("new")}><Plus />シナリオを追加</button></section>
    {error ? <p className="error-banner" role="alert"><AlertTriangle />{error}</p> : null}
    <section className="scenario-current" aria-label="現状の基準値"><GitCompareArrows /><div><span>現状の予測純資産</span><strong>{compactYen(currentNet)}</strong></div><dl><div><dt>資産</dt><dd>{compactYen(assets)}</dd></div><div><dt>登録負債</dt><dd>{compactYen(liabilities)}</dd></div><div><dt>相続税</dt><dd>{compactYen(defaultTax)}</dd></div></dl></section>
    {items === null ? <div className="activity-empty"><LoaderCircle className="spin" />シナリオを読み込んでいます</div> : rows.length === 0 ? <div className="activity-empty"><GitCompareArrows /><strong>保存済みシナリオはありません</strong><span>不動産価値の変化や対策後の税金を登録して比較できます。</span></div> : <section className="panel table-panel"><div className="table-scroll"><table className="scenario-table"><thead><tr><th>シナリオ</th><th className="number">資産変動</th><th className="number">負債変動</th><th className="number">税金</th><th className="number">承継費用</th><th className="number">予測純資産</th><th className="number">現状差</th><th>操作</th></tr></thead><tbody>{rows.map((item) => <tr key={item.id}><td><strong>{item.name}</strong>{item.note ? <small>{item.note}</small> : null}</td><td className="number">{item.assetChangePercent > 0 ? "+" : ""}{item.assetChangePercent}%</td><td className="number">{item.liabilityChangePercent > 0 ? "+" : ""}{item.liabilityChangePercent}%</td><td className="number">{compactYen(item.inheritanceTaxJpy)}</td><td className="number">{compactYen(item.successionCostsJpy)}</td><td className="number emphasis">{compactYen(item.net)}</td><td className={`number ${item.difference > 0 ? "positive" : item.difference < 0 ? "negative" : ""}`}>{item.difference > 0 ? "+" : ""}{compactYen(item.difference)}</td><td><div className="scenario-actions"><button className="icon-button" aria-label={`${item.name}を編集`} onClick={() => setEditing(item)} disabled={deletingId !== null}><Pencil /></button><button className="icon-button danger" aria-label={`${item.name}を削除`} onClick={() => void remove(item)} disabled={deletingId !== null}>{deletingId === item.id ? <LoaderCircle className="spin" /> : <Trash2 />}</button></div></td></tr>)}</tbody></table></div></section>}
    {editing ? <ScenarioEditor scenario={editing === "new" ? null : editing} defaultTax={defaultTax} saving={saving} onClose={() => setEditing(null)} onSubmit={submit} /> : null}
  </>;
}

function ScenarioEditor({ scenario, defaultTax, saving, onClose, onSubmit }: { scenario: Scenario | null; defaultTax: number; saving: boolean; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const { dialogRef, onKeyDown } = useModalDialog<HTMLDivElement>({ onEscape: () => { if (!saving) onClose(); }, initialFocus: 'input[name="name"]' });
  return <div className="modal-layer" role="presentation" onKeyDown={onKeyDown}><div ref={dialogRef} tabIndex={-1} className="modal scenario-modal" role="dialog" aria-modal="true" aria-labelledby="scenario-editor-title" aria-busy={saving}><header><div><h2 id="scenario-editor-title">{scenario ? "シナリオを編集" : "シナリオを追加"}</h2></div><button type="button" className="icon-button" aria-label="閉じる" onClick={onClose} disabled={saving}><X /></button></header><form onSubmit={onSubmit}><div className="form-grid">
    <label>シナリオ名<input name="name" defaultValue={scenario?.name ?? ""} maxLength={100} required /></label>
    <label>資産の変動率（%）<input name="assetChangePercent" type="number" step="0.1" min="-100" max="1000" defaultValue={scenario?.assetChangePercent ?? 0} required /></label>
    <label>負債の変動率（%）<input name="liabilityChangePercent" type="number" step="0.1" min="-100" max="1000" defaultValue={scenario?.liabilityChangePercent ?? 0} required /></label>
    <label>相続税（円）<input name="inheritanceTaxJpy" type="number" min="0" step="1" defaultValue={scenario?.inheritanceTaxJpy ?? defaultTax} required /></label>
    <label>承継関連費用（円）<input name="successionCostsJpy" type="number" min="0" step="1" defaultValue={scenario?.successionCostsJpy ?? 0} required /></label>
    <label className="span-2">メモ<textarea name="note" maxLength={500} defaultValue={scenario?.note ?? ""} rows={3} /></label>
  </div><footer><button type="button" className="button secondary" onClick={onClose} disabled={saving}>キャンセル</button><button className="button primary" type="submit" disabled={saving}>{saving ? <LoaderCircle className="spin" /> : <Save />}保存する</button></footer></form></div></div>;
}
