"use client";

import { AlertTriangle, ExternalLink, LoaderCircle, RefreshCw, Search, UserCog } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BackToClientList } from "@/components/back-to-client-list";
import { PanelHeader } from "@/components/panel-header";
import { API_BASE } from "@/lib/api";
import { matchesSearchTerms, searchTerms } from "@/lib/clients";
import type { Staff } from "@/lib/staff";
import type { StaffDirectorySyncResult } from "@/lib/staff-directory/sync";

/** 社員台帳の画面（ゲートウェイ経由で同じホストに居る） */
const STAFF_DIRECTORY_PAGE = "/staff-directory/";

type StatusFilter = "active" | "retired" | "unlinked" | "all";

const isUnlinked = (row: Staff) => row.staffDirectoryId === null;
const matchesStatus = (row: Staff, status: StatusFilter) => {
  if (status === "all") return true;
  if (status === "unlinked") return isUnlinked(row);
  if (isUnlinked(row)) return false;
  return status === "active" ? row.isActive : !row.isActive;
};

const syncTime = (iso: string) => new Date(iso).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

/**
 * 担当者の一覧。顧客一覧の「担当者」から開く独立した画面。
 *
 * 担当者は社員台帳（staff-directory）の写しなので、ここでは追加・修正・退職をしない
 * （台帳で直せば、次にこの画面か選択欄を開いたとき＝最大5分後に写る）。見せるのは
 * 担当件数と、台帳に居ない「未連携」の担当者 ── 未連携の人は選択の候補から外れ、
 * 担当していた顧客の「担当 ○○」だけが残るので、顧客側で担当者を選び直してもらう。
 */
export function StaffView() {
  const [staff, setStaff] = useState<Staff[] | null>(null);
  const [sync, setSync] = useState<StaffDirectorySyncResult | null>(null);
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("active");

  const load = useCallback(async () => {
    try {
      // 一覧の GET が期限切れなら写し直すので、状況はその後に読む
      const response = await fetch(`${API_BASE}/staff`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      setStaff(await response.json() as Staff[]);
      const syncResponse = await fetch(`${API_BASE}/staff-directory`, { cache: "no-store" });
      if (syncResponse.ok) setSync(await syncResponse.json() as StaffDirectorySyncResult | null);
    } catch {
      setStaff((current) => current ?? []);
      setError("担当者の一覧を読み込めませんでした。");
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  async function resync() {
    if (syncing) return;
    setSyncing(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/staff-directory`, { method: "POST", cache: "no-store" });
      if (!response.ok) throw new Error();
      setSync(await response.json() as StaffDirectorySyncResult);
      await load();
    } catch {
      setError("社員台帳から読み直せませんでした。");
    } finally {
      setSyncing(false);
    }
  }

  const visibleStaff = useMemo(() => {
    const terms = searchTerms(query);
    return (staff ?? []).filter((row) => matchesStatus(row, status)
      && matchesSearchTerms([row.staffCode, row.name, row.nameKana, row.department], terms));
  }, [staff, query, status]);
  const unlinkedCount = (staff ?? []).filter(isUnlinked).length;

  return <>
    <div className="page-heading"><div><BackToClientList /><h1>担当者</h1><p>担当者は社員台帳の写しです。追加・修正・退職は社員台帳で行います。</p></div></div>
    {error ? <p className="error-banner" role="alert"><AlertTriangle />{error}</p> : null}
    {sync && !sync.ok ? <p className="error-banner" role="alert"><AlertTriangle />社員台帳から読み直せませんでした（{sync.error}）。前回までの写しで表示しています。</p> : null}
    {unlinkedCount > 0
      ? <p className="error-banner" role="status"><AlertTriangle />社員台帳に居ない担当者が{unlinkedCount}人います（在籍状態「未連携」）。候補には出ないので、担当している顧客は担当者を選び直してください。</p>
      : null}
    <article className="panel staff-panel">
      <PanelHeader
        title="担当者の一覧"
        subtitle="社員台帳で直した内容は、この画面か担当者の選択欄を開いたとき（前回から5分以上たっていれば）に写ります。すぐに写したいときは「今すぐ読み直す」を押します。"
        action={<div className="staff-sync-actions">
          <a className="button secondary" href={STAFF_DIRECTORY_PAGE} target="_blank" rel="noreferrer"><ExternalLink />社員台帳を開く</a>
          <button type="button" className="button secondary" onClick={() => { void resync(); }} disabled={syncing}>{syncing ? <LoaderCircle className="spin" /> : <RefreshCw />}今すぐ読み直す</button>
        </div>}
      />
      <div className="staff-panel-body">
        {sync?.ok ? <p className="staff-sync-time">最終の読み直し: {syncTime(sync.at)}</p> : null}
        <div className="staff-list-toolbar">
          <label className="staff-list-search"><span>検索</span><div><Search aria-hidden="true" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="氏名・カナ・コード・部署" /></div></label>
          <label><span>在籍状態</span><select value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)}><option value="active">在籍</option><option value="retired">退職</option><option value="unlinked">未連携</option><option value="all">すべて</option></select></label>
          <p aria-live="polite">{visibleStaff.length}件（全{staff?.length ?? 0}件中）</p>
        </div>

        {staff === null
          ? <p className="staff-loading"><LoaderCircle className="spin" />読み込んでいます</p>
          : staff.length === 0
            ? <p className="staff-empty"><UserCog />担当者がまだいません。社員台帳で登録してください。</p>
            : visibleStaff.length === 0
              ? <p className="staff-empty"><UserCog />条件に一致する担当者がいません。</p>
              : <ul className="staff-list">
                {visibleStaff.map((row) => <li key={row.id} className={`staff-row${row.isActive && !isUnlinked(row) ? "" : " is-retired"}`} aria-label={row.name}>
                  <div className="staff-row-fields is-readonly">
                    <span className="staff-code-input">{row.staffCode}</span>
                    <span>{row.name}</span>
                    <span>{row.nameKana}</span>
                    <span>{row.department}</span>
                  </div>
                  <span className="staff-row-meta">
                    {isUnlinked(row) ? <span className="staff-retired-tag">未連携</span> : row.isActive ? null : <span className="staff-retired-tag">退職</span>}
                    {row.clientCount === 0 ? "担当なし" : `担当 ${row.clientCount}件`}
                  </span>
                </li>)}
              </ul>}
      </div>
    </article>
  </>;
}
