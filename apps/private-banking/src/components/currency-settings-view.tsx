"use client";

import { AlertTriangle, CheckCircle2, LoaderCircle, Plus } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { BackToClientList } from "@/components/back-to-client-list";
import { PanelHeader } from "@/components/panel-header";
import { ScrollRegion } from "@/components/scroll-region";
import { API_BASE } from "@/lib/api";
import { positionCurrencies } from "@/lib/fx-rates";

type Currency = { code: string; name: string };

async function fetchCurrencies(): Promise<Currency[]> {
  const response = await fetch(`${API_BASE}/currencies`, { cache: "no-store" });
  if (!response.ok) throw new Error("通貨設定を読み込めませんでした。");
  return response.json();
}

const errorText = (e: unknown, fallback: string) => e instanceof Error ? e.message : fallback;

// 全顧客で共通の設定（今は通貨だけ）。担当者・データ品質と同じ枠（見出し＋パネル）に置く。
export function CurrencySettingsView() {
  const [currencies, setCurrencies] = useState<Currency[] | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    fetchCurrencies().then((rows) => { if (active) setCurrencies(rows); }, (e: unknown) => { if (active) setError(errorText(e, "読込に失敗しました。")); });
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch(`${API_BASE}/currencies`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "通貨を登録できませんでした。");
      form.reset();
      setCurrencies(await fetchCurrencies());
      setNotice(`${result.code}（${result.name}）を追加しました。全顧客の入力画面で選べます。`);
    } catch (e) {
      setError(errorText(e, "登録に失敗しました。"));
    } finally {
      setSaving(false);
    }
  }

  return <div className="settings-page">
    <div className="page-heading"><div><BackToClientList /><h1>共通設定</h1><p>全顧客で共通の設定です。顧客・年度ごとの設定（換算レートなど）は、各顧客の画面の「設定」で行います。</p></div></div>
    {error ? <p className="error-banner" role="alert"><AlertTriangle />{error}</p> : null}
    {notice ? <p className="settings-notice" role="status"><CheckCircle2 />{notice}</p> : null}
    <article className="panel settings-panel">
      <PanelHeader title="利用する通貨" subtitle="日本円・米ドル・ユーロは標準で使えます。ほかの通貨はここで追加すると全顧客で選べます。" />
      <div className="settings-panel-body">
        {currencies === null
          ? error ? null : <p className="settings-loading"><LoaderCircle className="spin" />読み込んでいます</p>
          : <ScrollRegion className="table-scroll" label="利用する通貨の一覧"><table className="currency-table">
            <thead><tr><th>通貨コード</th><th>通貨名</th><th>区分</th></tr></thead>
            <tbody>{currencies.map((item) => <tr key={item.code}>
              <td className="currency-code">{item.code}</td>
              <td>{item.name}</td>
              <td>{positionCurrencies.includes(item.code) ? "標準" : "追加"}</td>
            </tr>)}</tbody>
          </table></ScrollRegion>}
        <section className="currency-add" aria-labelledby="currency-add-title">
          <h3 id="currency-add-title">通貨を追加する</h3>
          <form className="currency-add-form" onSubmit={submit}>
            <label>通貨コード<input name="code" maxLength={3} pattern="[A-Za-z]{3}" placeholder="例：CAD" required autoComplete="off" /></label>
            <label>通貨名<input name="name" maxLength={100} placeholder="例：カナダドル" required /></label>
            <button type="submit" className="button primary" disabled={saving || currencies === null}>{saving ? <LoaderCircle className="spin" /> : <Plus />}{saving ? "登録中" : "通貨を追加"}</button>
          </form>
        </section>
      </div>
    </article>
  </div>;
}
