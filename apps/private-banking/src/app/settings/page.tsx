"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { API_BASE } from "@/lib/api";

export default function SettingsPage() {
  const [currencies, setCurrencies] = useState<Array<{ code: string; name: string }>>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  async function load() {
    try {
      const response = await fetch(`${API_BASE}/currencies`, { cache: "no-store" });
      if (!response.ok) throw new Error("通貨設定を読み込めませんでした。");
      setCurrencies(await response.json());
    } catch (e) { setError(e instanceof Error ? e.message : "読込に失敗しました。"); }
  }
  useEffect(() => {
    let active = true;
    void fetch(`${API_BASE}/currencies`, { cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error("通貨設定を読み込めませんでした。");
      const rows = await response.json();
      if (active) setCurrencies(rows);
    }).catch((e) => { if (active) setError(e instanceof Error ? e.message : "読込に失敗しました。"); });
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
      form.reset(); await load(); setNotice("追加通貨を登録しました。全顧客の入力画面で選択できます。");
    } catch (e) { setError(e instanceof Error ? e.message : "登録に失敗しました。"); }
    finally { setSaving(false); }
  }
  return <main className="currency-settings-page"><Link href="/">顧客一覧へ戻る</Link><h1>アプリ共通設定</h1><section className="panel currency-settings-panel"><h2>利用する通貨</h2><p>通常はJPY・USD・EURを使用します。追加通貨は全顧客で共通です。換算レートは顧客・年度ごとに設定してください。</p>
    {error ? <p role="alert">{error}</p> : null}{notice ? <p role="status">{notice}</p> : null}
    <ul>{currencies.map((item) => <li key={item.code}><strong>{item.code}</strong>：{item.name}</li>)}</ul>
    <details><summary>その他の通貨を追加する</summary><form className="form-grid" onSubmit={submit}><label>通貨コード<input name="code" maxLength={3} pattern="[A-Za-z]{3}" placeholder="例：CAD" required autoComplete="off" /></label><label>通貨名<input name="name" maxLength={100} placeholder="例：カナダドル" required /></label><button type="submit" className="button primary" disabled={saving || currencies.length === 0}>{saving ? "登録中" : "通貨を追加"}</button></form></details>
  </section></main>;
}
