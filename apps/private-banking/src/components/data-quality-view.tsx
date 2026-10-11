"use client";

import { AlertTriangle, ArrowLeft, CheckCircle2, ClipboardCheck, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppBrand } from "@/components/portal-link";
import { API_BASE } from "@/lib/api";
import { CLIENT_QUALITY_LABELS, type ClientQualityIssueCode, type ClientSummary } from "@/lib/clients";
import { compactYen, dateJa } from "@/lib/format";

const ISSUE_ORDER = Object.keys(CLIENT_QUALITY_LABELS) as ClientQualityIssueCode[];

export function DataQualityView() {
  const [clients, setClients] = useState<ClientSummary[] | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/clients`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      setClients(await response.json() as ClientSummary[]);
      setError("");
    } catch {
      setClients([]);
      setError("データ品質の状況を読み込めませんでした。");
    }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  const issueCounts = useMemo(() => ISSUE_ORDER.map((code) => ({
    code,
    label: CLIENT_QUALITY_LABELS[code],
    count: clients?.filter((client) => client.qualityIssues.some((issue) => issue.code === code)).length ?? 0,
  })).filter((item) => item.count > 0), [clients]);

  if (clients === null) return <main className="initial-loader"><LoaderCircle className="spin" /><p>データ品質を確認しています</p></main>;
  const attentionClients = clients.filter((client) => client.qualityIssues.length > 0);
  return <div className="client-home">
    <header className="client-home-header"><AppBrand /></header>
    <main className="client-home-main quality-page">
      <section className="page-heading"><div><Link className="back-to-list" href="/"><ArrowLeft />顧客一覧に戻る</Link><h1>データ品質チェック</h1><p>計算や顧客説明の前に確認したい不備を、全顧客を横断して表示します。</p></div></section>
      {error ? <p className="error-banner" role="alert"><AlertTriangle />{error}</p> : null}
      <section className="quality-summary" aria-label="不備の集計">
        <article><ClipboardCheck /><span>要確認の顧客</span><strong>{attentionClients.length}件</strong></article>
        {issueCounts.map((item) => <article key={item.code}><AlertTriangle /><span>{item.label}</span><strong>{item.count}件</strong></article>)}
      </section>
      {attentionClients.length === 0 ? <section className="quality-complete"><CheckCircle2 /><h2>すべて確認済みです</h2><p>現在、確認が必要な顧客はいません。</p></section> : <section className="panel table-panel">
        <div className="table-scroll"><table className="quality-table"><thead><tr><th>顧客</th><th>基準日</th><th className="number">純資産</th><th>確認事項</th></tr></thead><tbody>
          {attentionClients.map((client) => <tr key={client.id}><td><Link href={`/customers/${client.id}/balance`}><strong>{client.name}</strong><small>{client.clientCode}</small></Link></td><td>{client.latestAsOfDate ? dateJa(client.latestAsOfDate) : "—"}</td><td className="number">{compactYen(client.netWorth)}</td><td><div className="quality-issue-list">{client.qualityIssues.map((issue) => <Link key={issue.code} className={`quality-issue ${issue.severity}`} href={`/customers/${client.id}/${issue.href}`}><AlertTriangle />{issue.label}</Link>)}</div></td></tr>)}
        </tbody></table></div>
      </section>}
    </main>
  </div>;
}
