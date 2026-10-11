"use client";

import { Activity, AlertTriangle, Calculator, CirclePlus, Download, FilePenLine, LoaderCircle, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { API_BASE } from "@/lib/api";

type ActivityItem = { id: number; action: string; entityType: string; summary: string; actor: string; createdAt: string };
const icons = { CREATE: CirclePlus, UPDATE: FilePenLine, DELETE: Trash2, CALCULATE: Calculator } as const;
const activityActionLabel: Record<string, string> = { CREATE: "登録", UPDATE: "更新", DELETE: "削除", CALCULATE: "計算", RESTORE: "復元" };

export function ActivityView({ householdId }: { householdId: number }) {
  const [items, setItems] = useState<ActivityItem[] | null>(null);
  const [query, setQuery] = useState("");
  const [action, setAction] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/activity?householdId=${householdId}`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      setItems(await response.json() as ActivityItem[]);
      setError("");
    } catch { setItems([]); setError("操作履歴を読み込めませんでした。"); }
  }, [householdId]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => (items ?? []).filter((item) => {
    const normalized = query.trim().toLocaleLowerCase("ja");
    const date = item.createdAt.slice(0, 10);
    return (!normalized || `${item.summary} ${item.actor} ${item.entityType} ${activityActionLabel[item.action] ?? item.action}`.toLocaleLowerCase("ja").includes(normalized))
      && (action === "all" || item.action === action)
      && (!dateFrom || date >= dateFrom)
      && (!dateTo || date <= dateTo);
  }), [items, query, action, dateFrom, dateTo]);

  function exportCsv() {
    const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const rows = [["日時", "操作", "概要", "実行者", "対象種別"], ...filtered.map((item) => [new Date(item.createdAt).toLocaleString("ja-JP"), activityActionLabel[item.action] ?? item.action, item.summary, item.actor, item.entityType])];
    const blob = new Blob(["\uFEFF", rows.map((row) => row.map(escape).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `activity-${householdId}-${new Date().toISOString().slice(0, 10)}.csv`; link.click();
    URL.revokeObjectURL(url);
  }

  return <>
    <section className="page-heading"><div><h2>操作履歴</h2><p>顧客データに対する重要な登録・更新・削除を確認できます。</p></div></section>
    {error ? <p className="error-banner" role="alert"><AlertTriangle />{error}</p> : null}
    {items && items.length > 0 ? <section className="activity-tools" aria-label="操作履歴の検索と絞り込み">
      <label className="activity-search"><span>検索</span><div><Search /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="概要・実行者・対象で検索" /></div></label>
      <label><span>操作</span><select value={action} onChange={(event) => setAction(event.target.value)}><option value="all">すべて</option>{Object.entries(activityActionLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label><span>開始日</span><input type="date" value={dateFrom} max={dateTo || undefined} onChange={(event) => setDateFrom(event.target.value)} /></label>
      <label><span>終了日</span><input type="date" value={dateTo} min={dateFrom || undefined} onChange={(event) => setDateTo(event.target.value)} /></label>
      <button type="button" className="button secondary" disabled={filtered.length === 0} onClick={exportCsv}><Download />CSV出力（{filtered.length}件）</button>
    </section> : null}
    {items === null ? <div className="activity-empty"><LoaderCircle className="spin" />操作履歴を読み込んでいます</div>
      : items.length === 0 ? <div className="activity-empty"><Activity /><strong>まだ操作履歴はありません</strong><span>今後の更新から自動的に記録されます。</span></div>
      : filtered.length === 0 ? <div className="activity-empty"><Search /><strong>該当する操作履歴はありません</strong><span>検索語や期間を変更してください。</span></div>
      : <><p className="activity-count" aria-live="polite">{filtered.length}件表示（全{items.length}件）</p><ol className="activity-timeline">{filtered.map((item) => { const Icon = icons[item.action as keyof typeof icons] ?? Activity; return <li key={item.id}><span className={`activity-icon action-${item.action.toLowerCase()}`}><Icon /></span><div><header><strong>{item.summary}</strong><span>{activityActionLabel[item.action] ?? item.action}</span></header><p>{item.actor}・{item.entityType}</p><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString("ja-JP")}</time></div></li>; })}</ol></>}
  </>;
}
