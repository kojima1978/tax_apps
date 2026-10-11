"use client";

import { Activity, AlertTriangle, Calculator, CirclePlus, FilePenLine, LoaderCircle, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { API_BASE } from "@/lib/api";

type ActivityItem = { id: number; action: string; entityType: string; summary: string; actor: string; createdAt: string };
const icons = { CREATE: CirclePlus, UPDATE: FilePenLine, DELETE: Trash2, CALCULATE: Calculator } as const;
const activityActionLabel: Record<string, string> = { CREATE: "登録", UPDATE: "更新", DELETE: "削除", CALCULATE: "計算", RESTORE: "復元" };

export function ActivityView({ householdId }: { householdId: number }) {
  const [items, setItems] = useState<ActivityItem[] | null>(null);
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

  return <>
    <section className="page-heading"><div><h2>操作履歴</h2><p>顧客データに対する重要な登録・更新・削除を確認できます。</p></div></section>
    {error ? <p className="error-banner" role="alert"><AlertTriangle />{error}</p> : null}
    {items === null ? <div className="activity-empty"><LoaderCircle className="spin" />操作履歴を読み込んでいます</div>
      : items.length === 0 ? <div className="activity-empty"><Activity /><strong>まだ操作履歴はありません</strong><span>今後の更新から自動的に記録されます。</span></div>
      : <ol className="activity-timeline">{items.map((item) => { const Icon = icons[item.action as keyof typeof icons] ?? Activity; return <li key={item.id}><span className={`activity-icon action-${item.action.toLowerCase()}`}><Icon /></span><div><header><strong>{item.summary}</strong><span>{activityActionLabel[item.action] ?? item.action}</span></header><p>{item.actor}</p><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString("ja-JP")}</time></div></li>; })}</ol>}
  </>;
}
