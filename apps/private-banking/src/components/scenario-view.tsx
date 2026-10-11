"use client";

import { AlertTriangle, ChartNoAxesColumnIncreasing, GitCompareArrows, LoaderCircle, Pencil, Plus, Save, Sparkles, Trash2, X } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { API_BASE } from "@/lib/api";
import { compactYen } from "@/lib/format";
import { useModalDialog } from "@/components/use-modal-dialog";

type Scenario = { id: number; name: string; assetChangePercent: number; liabilityChangePercent: number; inheritanceTaxJpy: number; successionCostsJpy: number; note: string; updatedAt: string };
type ScenarioDefaults = Pick<Scenario, "name" | "assetChangePercent" | "liabilityChangePercent" | "inheritanceTaxJpy" | "successionCostsJpy" | "note">;
type ScenarioEditorState = { scenario: Scenario | null; defaults?: ScenarioDefaults };

const scenarioTemplates = (defaultTax: number): Array<{ label: string; description: string; defaults: ScenarioDefaults }> => [
  { label: "資産価値 -10%", description: "相場下落時の耐性を確認", defaults: { name: "資産価値が10%下落", assetChangePercent: -10, liabilityChangePercent: 0, inheritanceTaxJpy: defaultTax, successionCostsJpy: 0, note: "資産価値の下落を想定" } },
  { label: "資産価値 +5%", description: "緩やかな成長を想定", defaults: { name: "資産価値が5%上昇", assetChangePercent: 5, liabilityChangePercent: 0, inheritanceTaxJpy: defaultTax, successionCostsJpy: 0, note: "資産価値の上昇を想定" } },
  { label: "承継費用 1,000万円", description: "専門家報酬などを織り込む", defaults: { name: "承継費用を見込む", assetChangePercent: 0, liabilityChangePercent: 0, inheritanceTaxJpy: defaultTax, successionCostsJpy: 10_000_000, note: "承継関連費用として1,000万円を想定" } },
];

export function ScenarioView({ householdId, assets, liabilities, defaultTax }: { householdId: number; assets: number; liabilities: number; defaultTax: number }) {
  const [items, setItems] = useState<Scenario[] | null>(null);
  const [editing, setEditing] = useState<ScenarioEditorState | null>(null);
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
    const body = { ...Object.fromEntries(new FormData(event.currentTarget).entries()), householdId, ...(editing?.scenario ? { id: editing.scenario.id } : {}) };
    try {
      const response = await fetch(`${API_BASE}/scenarios`, { method: editing?.scenario ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
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
    <section className="page-heading scenario-heading"><div><h2>シナリオ比較</h2><p>現在のB/Sを変更せず、資産価値・負債・税金・承継費用の前提を比較します。</p></div><button className="button primary" onClick={() => setEditing({ scenario: null })}><Plus />シナリオを追加</button></section>
    {error ? <p className="error-banner" role="alert"><AlertTriangle />{error}</p> : null}
    <section className="scenario-current" aria-label="現状の基準値"><GitCompareArrows /><div><span>現状の予測純資産</span><strong>{compactYen(currentNet)}</strong></div><dl><div><dt>資産</dt><dd>{compactYen(assets)}</dd></div><div><dt>登録負債</dt><dd>{compactYen(liabilities)}</dd></div><div><dt>相続税</dt><dd>{compactYen(defaultTax)}</dd></div></dl></section>
    <section className="scenario-templates" aria-labelledby="scenario-template-title"><div><Sparkles /><span><strong id="scenario-template-title">テンプレートから開始</strong><small>数値は保存前に変更できます</small></span></div>{scenarioTemplates(defaultTax).map((template) => <button type="button" key={template.label} onClick={() => setEditing({ scenario: null, defaults: template.defaults })}><strong>{template.label}</strong><span>{template.description}</span></button>)}</section>
    {rows.length > 0 ? <figure className="scenario-chart" aria-labelledby="scenario-chart-title"><figcaption id="scenario-chart-title"><ChartNoAxesColumnIncreasing />予測純資産の比較</figcaption><div className="scenario-chart-rows">{[{ id: 0, name: "現状", net: currentNet }, ...rows].map((item) => { const max = Math.max(1, Math.abs(currentNet), ...rows.map((row) => Math.abs(row.net))); return <div className="scenario-chart-row" key={item.id}><span>{item.name}</span><div className="scenario-chart-track"><i className={item.net < 0 ? "negative" : ""} style={{ width: `${Math.max(2, Math.abs(item.net) / max * 100)}%` }} /></div><strong>{compactYen(item.net)}</strong></div>; })}</div></figure> : null}
    {items === null ? <div className="activity-empty"><LoaderCircle className="spin" />シナリオを読み込んでいます</div> : rows.length === 0 ? <div className="activity-empty"><GitCompareArrows /><strong>保存済みシナリオはありません</strong><span>不動産価値の変化や対策後の税金を登録して比較できます。</span></div> : <section className="panel table-panel"><div className="table-scroll"><table className="scenario-table"><thead><tr><th>シナリオ</th><th className="number">資産変動</th><th className="number">負債変動</th><th className="number">税金</th><th className="number">承継費用</th><th className="number">予測純資産</th><th className="number">現状差</th><th>操作</th></tr></thead><tbody>{rows.map((item) => <tr key={item.id}><td><strong>{item.name}</strong>{item.note ? <small>{item.note}</small> : null}</td><td className="number">{item.assetChangePercent > 0 ? "+" : ""}{item.assetChangePercent}%</td><td className="number">{item.liabilityChangePercent > 0 ? "+" : ""}{item.liabilityChangePercent}%</td><td className="number">{compactYen(item.inheritanceTaxJpy)}</td><td className="number">{compactYen(item.successionCostsJpy)}</td><td className="number emphasis">{compactYen(item.net)}</td><td className={`number ${item.difference > 0 ? "positive" : item.difference < 0 ? "negative" : ""}`}>{item.difference > 0 ? "+" : ""}{compactYen(item.difference)}</td><td><div className="scenario-actions"><button className="icon-button" aria-label={`${item.name}を編集`} onClick={() => setEditing({ scenario: item })} disabled={deletingId !== null}><Pencil /></button><button className="icon-button danger" aria-label={`${item.name}を削除`} onClick={() => void remove(item)} disabled={deletingId !== null}>{deletingId === item.id ? <LoaderCircle className="spin" /> : <Trash2 />}</button></div></td></tr>)}</tbody></table></div></section>}
    {editing ? <ScenarioEditor scenario={editing.scenario} defaults={editing.defaults} defaultTax={defaultTax} saving={saving} onClose={() => setEditing(null)} onSubmit={submit} /> : null}
  </>;
}

function ScenarioEditor({ scenario, defaults, defaultTax, saving, onClose, onSubmit }: { scenario: Scenario | null; defaults?: ScenarioDefaults; defaultTax: number; saving: boolean; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const { dialogRef, onKeyDown } = useModalDialog<HTMLDivElement>({ onEscape: () => { if (!saving) onClose(); }, initialFocus: 'input[name="name"]' });
  return <div className="modal-layer" role="presentation" onKeyDown={onKeyDown}><div ref={dialogRef} tabIndex={-1} className="modal scenario-modal" role="dialog" aria-modal="true" aria-labelledby="scenario-editor-title" aria-busy={saving}><header><div><h2 id="scenario-editor-title">{scenario ? "シナリオを編集" : "シナリオを追加"}</h2></div><button type="button" className="icon-button" aria-label="閉じる" onClick={onClose} disabled={saving}><X /></button></header><form onSubmit={onSubmit}><div className="form-grid">
    <label>シナリオ名<input name="name" defaultValue={scenario?.name ?? defaults?.name ?? ""} maxLength={100} required /></label>
    <label>資産の変動率（%）<input name="assetChangePercent" type="number" step="0.1" min="-100" max="1000" defaultValue={scenario?.assetChangePercent ?? defaults?.assetChangePercent ?? 0} required /></label>
    <label>負債の変動率（%）<input name="liabilityChangePercent" type="number" step="0.1" min="-100" max="1000" defaultValue={scenario?.liabilityChangePercent ?? defaults?.liabilityChangePercent ?? 0} required /></label>
    <label>相続税（円）<input name="inheritanceTaxJpy" type="number" min="0" step="1" defaultValue={scenario?.inheritanceTaxJpy ?? defaults?.inheritanceTaxJpy ?? defaultTax} required /></label>
    <label>承継関連費用（円）<input name="successionCostsJpy" type="number" min="0" step="1" defaultValue={scenario?.successionCostsJpy ?? defaults?.successionCostsJpy ?? 0} required /></label>
    <label className="span-2">メモ<textarea name="note" maxLength={500} defaultValue={scenario?.note ?? defaults?.note ?? ""} rows={3} /></label>
  </div><footer><button type="button" className="button secondary" onClick={onClose} disabled={saving}>キャンセル</button><button className="button primary" type="submit" disabled={saving}>{saving ? <LoaderCircle className="spin" /> : <Save />}保存する</button></footer></form></div></div>;
}
