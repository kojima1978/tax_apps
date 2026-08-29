"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { API_BASE } from "@/lib/api";
import { type Portfolio } from "@/lib/portfolio-view";

type MutationResult = { ok: boolean; status: number; result: ({ error?: string } & Record<string, unknown>) | null };

/**
 * 顧客1件分のデータ読み込みと保存系リクエストをまとめたフック。
 * 保存中フラグ・エラー表示・成功後の読み直しはどのハンドラでも同じ形なので、`mutate` に寄せている。
 */
export function usePortfolio(householdId: number) {
  const router = useRouter();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const response = await fetch(`${API_BASE}/portfolio?householdId=${householdId}`, { cache: "no-store" });
      // URL の顧客が存在しない場合は一覧へ戻して選び直してもらう。
      if (response.status === 404) { router.replace("/"); return; }
      if (!response.ok) throw new Error();
      setPortfolio(await response.json() as Portfolio);
    } catch {
      setError("データを読み込めませんでした。接続を確認してください。");
    }
  }, [householdId, router]);

  // 顧客が変わったときだけ、安定したローダー経由で読み直す。
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  /**
   * 保存系リクエストの共通処理。
   * `silentStatus` に渡したステータスだけはエラー表示せず、呼び出し側で内容を見て処理する
   * （年度の重複作成のように、失敗ではなく分岐として扱いたい応答があるため）。
   */
  async function mutate(path: string, method: string, body: unknown, fallbackMessage: string, options: { silentStatus?: number } = {}): Promise<MutationResult> {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}${path}`, {
        method,
        ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
      });
      const result = response.status === 204 ? null : await response.json().catch(() => null) as MutationResult["result"];
      if (!response.ok && response.status !== options.silentStatus) throw new Error(result?.error ?? fallbackMessage);
      return { ok: response.ok, status: response.status, result };
    } catch (caught) {
      setError(caught instanceof Error && caught.message ? caught.message : fallbackMessage);
      return { ok: false, status: 0, result: null };
    } finally {
      setSaving(false);
    }
  }

  return { portfolio, saving, error, setError, load, mutate, router };
}
