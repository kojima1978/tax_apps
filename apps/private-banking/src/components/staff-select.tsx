"use client";

import { useEffect, useState } from "react";
import { StaffCombobox } from "@/components/staff-combobox";
import { API_BASE } from "@/lib/api";
import { type Staff, staffOptions } from "@/lib/staff";

/**
 * 顧客の担当者を選ぶ欄。新規登録フォームと本人情報の欄で共用する。
 * 担当者は社員台帳の写しなので、ここで新しい人を足す口は持たない（台帳で登録する）。
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
    : { id: defaultValue, staffCode: "", name: defaultLabel || "登録済みの担当者", nameKana: "", department: "", isActive: true, staffDirectoryId: null, clientCount: 0 };
  const options = staff === null ? (loadingOption ? [loadingOption] : []) : staffOptions(staff, selectedId);

  return <div className="staff-field">
    <label htmlFor={id}>担当者</label>
    <StaffCombobox id={id} name="staffId" staff={options} value={selected} onChange={setSelected} />
    {error ? <small className="staff-field-note is-error" role="alert">{error}</small> : null}
  </div>;
}
