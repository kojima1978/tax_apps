"use client";

import { AlertTriangle, ChevronRight, DatabaseBackup, LoaderCircle, MoreHorizontal, Search, Trash2, UserPlus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ClientFields } from "@/components/client-fields";
import { ClientDeleteModal } from "@/components/client-delete-modal";
import { PortalLink } from "@/components/portal-link";
import { API_BASE } from "@/lib/api";
import { ClientSummary, filterClients, highlightRanges, searchTerms } from "@/lib/clients";
import { defaultAsOfDate } from "@/lib/snapshot-date";
import { type Portfolio } from "@/lib/portfolio-view";

/** 顧客ページのうち、一覧から最初に開く画面。 */
export const CLIENT_HOME_SECTION = "balance";

export const clientHref = (householdId: number) => `/customers/${householdId}/${CLIENT_HOME_SECTION}`;

/** 検索語に一致した部分を <mark> で強調する。 */
function Highlighted({ text, terms }: { text: string; terms: string[] }) {
  const ranges = useMemo(() => highlightRanges(text, terms), [text, terms]);
  if (ranges.length === 0) return <>{text}</>;
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  ranges.forEach(([start, end], index) => {
    if (start > cursor) parts.push(text.slice(cursor, start));
    parts.push(<mark key={index}>{text.slice(start, end)}</mark>);
    cursor = end;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));
  return <>{parts}</>;
}

export function ClientList() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientSummary[] | null>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<Portfolio | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleteLoadingId, setDeleteLoadingId] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const deleteBusy = useRef(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/clients`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      setClients(await response.json() as ClientSummary[]);
      setError("");
    } catch {
      setClients([]);
      setError("顧客一覧を読み込めませんでした。接続を確認してください。");
    }
  }, []);

  // 一覧の初回取得のみを安定したローダー経由で実行する。
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  const terms = useMemo(() => searchTerms(query), [query]);
  const filtered = useMemo(() => filterClients(clients ?? [], terms), [clients, terms]);
  // 絞り込みで件数が減っても範囲外を指さないようにする。
  const highlightedIndex = filtered.length === 0 ? -1 : Math.min(activeIndex, filtered.length - 1);

  function moveHighlight(delta: number) {
    if (filtered.length === 0) return;
    const next = (highlightedIndex + delta + filtered.length) % filtered.length;
    setActiveIndex(next);
    itemRefs.current[next]?.scrollIntoView({ block: "nearest" });
  }

  function handleSearchKeys(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") { event.preventDefault(); moveHighlight(1); return; }
    if (event.key === "ArrowUp") { event.preventDefault(); moveHighlight(-1); return; }
    if (event.key === "Enter") {
      event.preventDefault();
      const target = filtered[highlightedIndex];
      if (target) router.push(clientHref(target.id));
      return;
    }
    if (event.key === "Escape" && query) { event.preventDefault(); setQuery(""); setActiveIndex(0); }
  }

  async function requestDelete(client: ClientSummary) {
    if (deleteBusy.current) return;
    deleteBusy.current = true;
    setDeleteLoadingId(client.id);
    setError("");
    setNotice("");
    setDeleteError("");
    try {
      // 削除を選んだ時点で最新の年度・明細数を確認する。
      const response = await fetch(`${API_BASE}/portfolio?householdId=${client.id}`, { cache: "no-store" });
      if (!response.ok) throw new Error("削除対象の情報を読み込めませんでした。もう一度お試しください。");
      const portfolio = await response.json() as Portfolio;
      if (portfolio.household.id !== client.id) throw new Error("削除対象を確認できませんでした。");
      setDeleting(portfolio);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "削除対象の情報を読み込めませんでした。");
    } finally {
      setDeleteLoadingId(null);
      deleteBusy.current = false;
    }
  }

  async function deleteClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!deleting || deleteBusy.current) return;
    const confirmationClientCode = String(new FormData(event.currentTarget).get("confirmationClientCode") ?? "");
    if (confirmationClientCode.toUpperCase() !== deleting.household.clientCode.toUpperCase()) return;
    deleteBusy.current = true;
    setSaving(true);
    setDeleteError("");
    try {
      const response = await fetch(`${API_BASE}/clients`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleting.household.id, confirmationClientCode }),
      });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error ?? "顧客を削除できませんでした。");
      setClients((current) => current?.filter((client) => client.id !== deleting.household.id) ?? []);
      setNotice(`${deleting.household.name}を削除しました。`);
      setDeleting(null);
      searchRef.current?.focus();
    } catch (caught) {
      setDeleteError(caught instanceof Error ? caught.message : "顧客を削除できませんでした。");
    } finally {
      setSaving(false);
      deleteBusy.current = false;
    }
  }

  async function createClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/clients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget).entries())),
      });
      const result = await response.json().catch(() => null) as (ClientSummary & { error?: string }) | null;
      if (!response.ok || !result) throw new Error(result?.error ?? "顧客を登録できませんでした。");
      router.push(clientHref(result.id));
    } catch (clientError) {
      setError(clientError instanceof Error ? clientError.message : "顧客を登録できませんでした。");
      setSaving(false);
    }
  }

  if (clients === null) {
    return <main className="initial-loader"><PortalLink /><LoaderCircle className="spin" /><p>顧客一覧を読み込んでいます</p></main>;
  }

  return <div className="client-home">
    <header className="client-home-header">
      <div className="brand"><PortalLink /><span>Personal Asset Balance Sheet</span></div>
    </header>

    <main className="client-home-main">
      <section className="page-heading"><div><h1>顧客一覧</h1></div></section>

      {error ? <div className="error-banner" role="alert"><AlertTriangle />{error}<button onClick={() => setError("")} aria-label="閉じる"><X /></button></div> : null}
      {notice ? <p className="client-delete-notice" role="status">{notice}</p> : null}

      <div className="client-home-toolbar">
        <label className="client-search">
          <span className="sr-only">顧客を検索</span>
          <Search />
          <input
            ref={searchRef}
            type="search"
            role="combobox"
            aria-haspopup="grid"
            aria-expanded
            aria-controls="client-options"
            aria-activedescendant={highlightedIndex >= 0 ? `client-option-${filtered[highlightedIndex].id}` : undefined}
            autoFocus
            autoComplete="off"
            value={query}
            onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }}
            onKeyDown={handleSearchKeys}
            placeholder="顧客名・カナ・顧客コード・担当者で検索"
          />
        </label>
        <button type="button" className="button primary" onClick={() => { setError(""); setCreating(true); }}><UserPlus />顧客を追加</button>
        <Link className="button secondary" href="/backup"><DatabaseBackup />バックアップ</Link>
      </div>
      {/* 件数は画面には出さず、読み上げにだけ残す。 */}
      <p className="sr-only" aria-live="polite">{filtered.length}件の顧客{terms.length > 0 && clients.length !== filtered.length ? `（全${clients.length}件中）` : ""}</p>

      <div className="client-list" id="client-options" role="grid" aria-label="顧客">
        {filtered.map((client, index) => <div
          key={client.id}
          id={`client-option-${client.id}`}
          role="row"
          aria-selected={index === highlightedIndex}
          className={`client-list-row ${index === highlightedIndex ? "highlighted" : ""}`}
          onMouseEnter={() => setActiveIndex(index)}
        >
          <div role="gridcell" className="client-list-open-cell"><Link
            ref={(element) => { itemRefs.current[index] = element; }}
            className="client-list-item"
            href={clientHref(client.id)}
            onFocus={() => setActiveIndex(index)}
          >
          <span className="client-avatar" aria-hidden="true">{client.name.slice(0, 1)}</span>
          <span className="client-list-main">
            <strong><Highlighted text={client.name} terms={terms} /></strong>
            <small>
              <Highlighted text={client.clientCode} terms={terms} />
              {client.nameKana ? <> ・ <Highlighted text={client.nameKana} terms={terms} /></> : null}
              {client.assignedStaff ? <> ・ 担当 <Highlighted text={client.assignedStaff} terms={terms} /></> : " ・ 担当者未設定"}
            </small>
          </span>
          <span className="client-list-year">{client.latestFiscalYear ? `${client.latestFiscalYear}年度` : "年度なし"}</span>
          <ChevronRight />
          </Link></div>
          <div role="gridcell"><ClientRowActions client={client} busy={deleteLoadingId !== null} loading={deleteLoadingId === client.id} onDelete={() => { void requestDelete(client); }} /></div>
        </div>)}
      </div>
      {filtered.length === 0 ? <div className="client-empty"><Search /><strong>該当する顧客がありません</strong><span>{clients.length === 0 ? "「顧客を追加」から登録してください。" : "検索条件を変更してください。"}</span></div> : null}
    </main>

    {creating ? <ClientCreateModal error={error} saving={saving} onClose={() => setCreating(false)} onSubmit={createClient} /> : null}
    {deleting ? <ClientDeleteModal household={deleting.household} snapshotCount={deleting.snapshots.length} positionCount={deleting.snapshots.reduce((count, snapshot) => count + snapshot.positions.length, 0)} error={deleteError} saving={saving} onClose={() => setDeleting(null)} onSubmit={deleteClient} /> : null}
  </div>;
}

function ClientRowActions({ client, busy, loading, onDelete }: { client: ClientSummary; busy: boolean; loading: boolean; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const deleteRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    deleteRef.current?.focus();
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);
  return <div ref={rootRef} className="client-row-actions" onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
  }} onKeyDown={(event) => {
    if (event.key === "Escape") { event.preventDefault(); setOpen(false); triggerRef.current?.focus(); }
  }}>
    <button ref={triggerRef} type="button" className="icon-button client-actions-trigger" aria-label={`${client.name}の操作`} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? `client-menu-${client.id}` : undefined} aria-busy={loading} aria-disabled={busy} onClick={() => { if (!busy) setOpen(!open); }} onKeyDown={(event) => {
      if (!busy && (event.key === "ArrowDown" || event.key === "ArrowUp")) { event.preventDefault(); setOpen(true); }
    }}>{loading ? <LoaderCircle className="spin" /> : <MoreHorizontal />}</button>
    {open ? <div className="client-actions-menu" role="menu" id={`client-menu-${client.id}`} aria-label={`${client.name}の操作`}>
      <button ref={deleteRef} type="button" role="menuitem" onClick={() => { setOpen(false); triggerRef.current?.focus(); onDelete(); }}><Trash2 />顧客を削除</button>
    </div> : null}
  </div>;
}

function ClientCreateModal({ error, saving, onClose, onSubmit }: {
  error: string;
  saving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const currentYear = new Date().getFullYear();
  const [fiscalYear, setFiscalYear] = useState(String(currentYear));
  const [asOfDate, setAsOfDate] = useState(defaultAsOfDate(currentYear));

  function changeFiscalYear(value: string) {
    setFiscalYear(value);
    const year = Number(value);
    if (Number.isInteger(year) && year >= 1900 && year <= 2200) setAsOfDate(defaultAsOfDate(year));
  }

  return <div className="modal-layer" role="presentation"><div className="modal client-switcher-modal" role="dialog" aria-modal="true" aria-labelledby="client-create-title">
    <header><div><p className="eyebrow">CLIENTS</p><h2 id="client-create-title">顧客を追加</h2></div><button type="button" className="icon-button" aria-label="閉じる" onClick={onClose} disabled={saving}><X /></button></header>
    <form className="client-create-form" onSubmit={onSubmit}>
      <p className="client-modal-guidance">新しい顧客専用の貸借対照表を作成します。既存顧客のデータとは分離して保存されます。</p>
      {error ? <p className="client-modal-error" role="alert"><AlertTriangle />{error}</p> : null}
      <div className="form-grid client-create-grid">
        <ClientFields autoFocus />
        <label>開始年度<input name="fiscalYear" type="number" min="1900" max="2200" value={fiscalYear} onChange={(event) => changeFiscalYear(event.target.value)} required /></label>
        <label>B/S基準日<input name="asOfDate" type="date" min={`${fiscalYear}-01-01`} max={`${fiscalYear}-12-31`} value={asOfDate} onChange={(event) => setAsOfDate(event.target.value)} aria-describedby="client-as-of-date-help" required /><small id="client-as-of-date-help" className="field-help">初期値は年度の1月1日です。必要な場合だけ変更してください。</small></label>
      </div>
      <footer>
        <button type="button" className="button secondary" onClick={onClose} disabled={saving}>キャンセル</button>
        <button type="submit" className="button primary" disabled={saving}>{saving ? <LoaderCircle className="spin" /> : <UserPlus />}登録して開く</button>
      </footer>
    </form>
  </div></div>;
}
