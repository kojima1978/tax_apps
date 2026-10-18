"use client";

import { AlertTriangle, CheckCircle2, ClipboardCheck, LoaderCircle, UserCheck } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BackToClientList } from "@/components/back-to-client-list";
import { AppBrand } from "@/components/portal-link";
import { API_BASE } from "@/lib/api";
import { CLIENT_QUALITY_LABELS, type ClientQualityIssueCode, type ClientSummary } from "@/lib/clients";
import { compactYen, dateJa } from "@/lib/format";
import type { Staff } from "@/lib/staff";

const ISSUE_ORDER = Object.keys(CLIENT_QUALITY_LABELS) as ClientQualityIssueCode[];
type IssueFilter = "all" | ClientQualityIssueCode;

function IssueLinks({ client }: { client: ClientSummary }) {
  return <div className="quality-issue-list">{client.qualityIssues.map((issue) => <Link key={issue.code} className={`quality-issue ${issue.severity}`} href={`/customers/${client.id}/${issue.href}`}><AlertTriangle />{issue.label}<span>修正する</span></Link>)}</div>;
}

export function DataQualityView() {
  const [clients, setClients] = useState<ClientSummary[] | null>(null);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [issueFilter, setIssueFilter] = useState<IssueFilter>("all");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [staffId, setStaffId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const [clientsResponse, staffResponse] = await Promise.all([
        fetch(`${API_BASE}/clients`, { cache: "no-store" }),
        fetch(`${API_BASE}/staff`, { cache: "no-store" }),
      ]);
      if (!clientsResponse.ok || !staffResponse.ok) throw new Error();
      setClients(await clientsResponse.json() as ClientSummary[]);
      setStaff((await staffResponse.json() as Staff[]).filter((row) => row.isActive));
      setError("");
    } catch { setClients([]); setError("データ品質の状況を読み込めませんでした。"); }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  const issueCounts = useMemo(() => ISSUE_ORDER.map((code) => ({ code, label: CLIENT_QUALITY_LABELS[code], count: clients?.filter((client) => client.qualityIssues.some((issue) => issue.code === code)).length ?? 0 })).filter((item) => item.count > 0), [clients]);
  const attentionClients = useMemo(() => (clients ?? []).filter((client) => client.qualityIssues.length > 0), [clients]);
  const visibleClients = useMemo(() => attentionClients.filter((client) => issueFilter === "all" || client.qualityIssues.some((issue) => issue.code === issueFilter)), [attentionClients, issueFilter]);
  const unassignedVisible = visibleClients.filter((client) => client.qualityIssues.some((issue) => issue.code === "staff-missing"));
  const allUnassignedSelected = unassignedVisible.length > 0 && unassignedVisible.every((client) => selected.has(client.id));

  function toggleSelected(id: number) {
    setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }

  async function assignStaff() {
    if (!staffId || selected.size === 0) return;
    setAssigning(true); setError(""); setNotice("");
    try {
      const response = await fetch(`${API_BASE}/clients/bulk-staff`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ householdIds: [...selected], staffId }) });
      const result = await response.json().catch(() => null) as { error?: string; count?: number; staffName?: string } | null;
      if (!response.ok) throw new Error(result?.error ?? "担当者を設定できませんでした。");
      setNotice(`${result?.count ?? selected.size}件の担当者を${result?.staffName ?? "選択した担当者"}に設定しました。`);
      setSelected(new Set());
      await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "担当者を設定できませんでした。"); }
    finally { setAssigning(false); }
  }

  if (clients === null) return <main className="initial-loader"><LoaderCircle className="spin" /><p>データ品質を確認しています</p></main>;
  return <div className="client-home"><header className="client-home-header"><AppBrand /></header><main className="client-home-main quality-page">
    <section className="page-heading"><div><BackToClientList /><h1>データ品質チェック</h1><p>計算や顧客説明の前に確認したい不備を、全顧客を横断して表示します。</p></div></section>
    {error ? <p className="error-banner" role="alert"><AlertTriangle />{error}</p> : null}
    {notice ? <p className="quality-notice" role="status"><CheckCircle2 />{notice}</p> : null}
    <section className="quality-summary" aria-label="不備の集計">
      <button type="button" aria-pressed={issueFilter === "all"} onClick={() => setIssueFilter("all")}><ClipboardCheck /><span>要確認の顧客</span><strong>{attentionClients.length}件</strong></button>
      {issueCounts.map((item) => <button type="button" aria-pressed={issueFilter === item.code} onClick={() => setIssueFilter(item.code)} key={item.code}><AlertTriangle /><span>{item.label}</span><strong>{item.count}件</strong></button>)}
    </section>
    {unassignedVisible.length > 0 ? <section className="quality-bulk panel" aria-label="担当者の一括設定">
      <label className="quality-select-all"><input type="checkbox" checked={allUnassignedSelected} onChange={() => setSelected(allUnassignedSelected ? new Set() : new Set(unassignedVisible.map((client) => client.id)))} />表示中の担当者未設定をすべて選択</label>
      <label><span>担当者</span><select value={staffId} onChange={(event) => setStaffId(event.target.value)}><option value="">選択してください</option>{staff.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
      <button type="button" className="button primary" disabled={!staffId || selected.size === 0 || assigning} onClick={() => void assignStaff()}>{assigning ? <LoaderCircle className="spin" /> : <UserCheck />}{selected.size}件に設定</button>
    </section> : null}
    {attentionClients.length === 0 ? <section className="quality-complete"><CheckCircle2 /><h2>すべて確認済みです</h2><p>現在、確認が必要な顧客はいません。</p></section> : visibleClients.length === 0 ? <section className="quality-complete"><CheckCircle2 /><h2>該当する顧客はいません</h2><p>別の確認項目を選択してください。</p></section> : <section className="panel table-panel quality-results">
      <div className="table-scroll quality-table-wrap"><table className="quality-table"><thead><tr><th className="quality-check-column"><span className="sr-only">選択</span></th><th>顧客</th><th>基準日</th><th className="number">純資産</th><th>確認事項</th></tr></thead><tbody>
        {visibleClients.map((client) => { const canAssign = client.qualityIssues.some((issue) => issue.code === "staff-missing"); return <tr key={client.id}><td className="quality-check-column">{canAssign ? <input type="checkbox" aria-label={`${client.name}を担当者設定の対象にする`} checked={selected.has(client.id)} onChange={() => toggleSelected(client.id)} /> : null}</td><td><Link href={`/customers/${client.id}/balance`}><strong>{client.name}</strong><small>{client.clientCode}</small></Link></td><td>{client.latestAsOfDate ? dateJa(client.latestAsOfDate) : "—"}</td><td className="number">{compactYen(client.netWorth)}</td><td><IssueLinks client={client} /></td></tr>; })}
      </tbody></table></div>
      <div className="quality-card-list">{visibleClients.map((client) => { const canAssign = client.qualityIssues.some((issue) => issue.code === "staff-missing"); return <article key={client.id} className="quality-card"><header>{canAssign ? <input type="checkbox" aria-label={`${client.name}を担当者設定の対象にする`} checked={selected.has(client.id)} onChange={() => toggleSelected(client.id)} /> : null}<Link href={`/customers/${client.id}/balance`}><strong>{client.name}</strong><small>{client.clientCode}</small></Link></header><dl><div><dt>基準日</dt><dd>{client.latestAsOfDate ? dateJa(client.latestAsOfDate) : "—"}</dd></div><div><dt>純資産</dt><dd>{compactYen(client.netWorth)}</dd></div></dl><IssueLinks client={client} /></article>; })}</div>
    </section>}
  </main></div>;
}
