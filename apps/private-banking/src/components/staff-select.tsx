"use client";

import { LoaderCircle, Plus } from "lucide-react";
import { type KeyboardEvent, useEffect, useState } from "react";
import { API_BASE } from "@/lib/api";
import { type Staff, staffOptionLabel, staffOptions } from "@/lib/staff";

/**
 * 顧客の担当者を台帳から選ぶ欄。新規登録フォームと本人情報の欄で共用する。
 *
 * 送るのは `staffId` の1つだけ。未選択は空文字で届くので、API 側で「未設定」へ寄せている。
 * 読み込みが終わる前に保存されても今の担当者が消えないよう、取得中は
 * 選ばれている1人だけを選択肢として先に出しておく（`defaultLabel`）。
 */
export function StaffSelect({ id = "staff-select", defaultValue, defaultLabel = "" }: {
  id?: string;
  defaultValue: number | null;
  defaultLabel?: string;
}) {
  const [staff, setStaff] = useState<Staff[] | null>(null);
  const [selected, setSelected] = useState(defaultValue === null ? "" : String(defaultValue));
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // 候補の取得は開いたときの1回だけ。
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(`${API_BASE}/staff`, { cache: "no-store" });
        if (!response.ok) throw new Error();
        const rows = await response.json() as Staff[];
        if (!cancelled) setStaff(rows);
      } catch {
        if (cancelled) return;
        setStaff([]);
        setError("担当者の一覧を読み込めませんでした。");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const selectedId = selected === "" ? null : Number(selected);
  // 取得前の仮の候補。名前が分からなければ id だけを持たせて、値を落とさないことだけを優先する。
  const loadingOption: Staff | null = defaultValue === null
    ? null
    : { id: defaultValue, name: defaultLabel || "登録済みの担当者", nameKana: "", isActive: true, clientCount: 0 };
  const options = staff === null ? (loadingOption ? [loadingOption] : []) : staffOptions(staff, selectedId);

  async function addStaff() {
    const trimmed = name.trim();
    if (trimmed === "" || saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const result = await response.json().catch(() => null) as (Staff & { error?: string }) | null;
      if (!response.ok || !result) throw new Error(result?.error ?? "担当者を登録できませんでした。");
      setStaff((current) => [...(current ?? []), result]);
      setSelected(String(result.id));
      setName("");
      setAdding(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "担当者を登録できませんでした。");
    } finally {
      setSaving(false);
    }
  }

  // この欄は顧客のフォームの中にあるので、Enter で外側のフォームが送信されないように止める。
  function handleAddKeys(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") { event.preventDefault(); void addStaff(); return; }
    if (event.key === "Escape") { event.preventDefault(); setAdding(false); setName(""); }
  }

  return <div className="staff-field">
    <label htmlFor={id}>担当者</label>
    <select id={id} name="staffId" value={selected} onChange={(event) => setSelected(event.target.value)}>
      <option value="">未設定</option>
      {options.map((row) => <option key={row.id} value={row.id}>{staffOptionLabel(row)}</option>)}
    </select>
    {adding
      ? <div className="staff-field-add">
          <label className="sr-only" htmlFor={`${id}-new`}>新しい担当者の名前</label>
          <input
            id={`${id}-new`}
            value={name}
            maxLength={100}
            autoFocus
            autoComplete="off"
            placeholder="例：佐藤税理士"
            onChange={(event) => setName(event.target.value)}
            onKeyDown={handleAddKeys}
            disabled={saving}
          />
          <button type="button" className="button secondary" onClick={() => { void addStaff(); }} disabled={saving || name.trim() === ""}>{saving ? <LoaderCircle className="spin" /> : null}登録</button>
          <button type="button" className="text-button" onClick={() => { setAdding(false); setName(""); setError(""); }} disabled={saving}>やめる</button>
        </div>
      : <button type="button" className="text-button staff-field-add-button" onClick={() => { setAdding(true); setError(""); }}><Plus />新しい担当者</button>}
    {error ? <small className="staff-field-note is-error" role="alert">{error}</small> : null}
  </div>;
}
