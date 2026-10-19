"use client";

import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/api";

type Assignment = { id: number; staffCode: string; staffName: string; startedAt: string; endedAt: string | null };
const dateTime = (value: string) => new Date(value).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", dateStyle: "medium", timeStyle: "short" });

export function StaffHistory({ householdId, staffId }: { householdId: number; staffId: number | null }) {
  const [rows, setRows] = useState<Assignment[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    void fetch(`${API_BASE}/clients/staff-history?householdId=${householdId}`, { cache: "no-store" })
      .then(async (response) => { if (!response.ok) throw new Error(); return response.json() as Promise<Assignment[]>; })
      .then((result) => { if (!cancelled) { setRows(result); setError(""); } })
      .catch(() => { if (!cancelled) setError("担当変更履歴を読み込めませんでした。"); });
    return () => { cancelled = true; };
  }, [householdId, staffId]);
  return <details className="staff-history panel"><summary>担当変更履歴</summary>
    <p>コード・氏名は担当開始時の情報です。履歴機能の導入時に登録した担当者の開始日は、顧客登録日を基準にしています。</p>
    {error ? <p role="alert">{error}</p> : rows === null ? <p>読み込んでいます…</p> : rows.length === 0 ? <p>担当変更履歴はありません。</p> : <div className="table-scroll"><table><thead><tr><th>担当者コード</th><th>担当者</th><th>開始日時</th><th>終了日時</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td>{row.staffCode}</td><td>{row.staffName}</td><td>{dateTime(row.startedAt)}</td><td>{row.endedAt ? dateTime(row.endedAt) : "現在担当"}</td></tr>)}</tbody></table></div>}
  </details>;
}
