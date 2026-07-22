"use client";

import { AlertTriangle, ChevronRight, LoaderCircle, Search, UserPlus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ClientFields } from "@/components/client-fields";
import { PortalLink } from "@/components/portal-link";
import { API_BASE } from "@/lib/api";
import { ClientSummary, filterClients, highlightRanges, searchTerms } from "@/lib/clients";

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

      <div className="client-home-toolbar">
        <label className="client-search">
          <span className="sr-only">顧客を検索</span>
          <Search />
          <input
            type="search"
            role="combobox"
            aria-expanded
            aria-controls="client-options"
            aria-activedescendant={highlightedIndex >= 0 ? `client-option-${filtered[highlightedIndex].id}` : undefined}
            autoFocus
            autoComplete="off"
            value={query}
            onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }}
            onKeyDown={handleSearchKeys}
            placeholder="顧客名・かな・顧客コード・担当者で検索"
          />
        </label>
        <button type="button" className="button primary" onClick={() => { setError(""); setCreating(true); }}><UserPlus />顧客を追加</button>
      </div>
      {/* 件数は画面には出さず、読み上げにだけ残す。 */}
      <p className="sr-only" aria-live="polite">{filtered.length}件の顧客{terms.length > 0 && clients.length !== filtered.length ? `（全${clients.length}件中）` : ""}</p>

      <div className="client-list" id="client-options" role="listbox" aria-label="顧客">
        {filtered.map((client, index) => <Link
          key={client.id}
          id={`client-option-${client.id}`}
          ref={(element) => { itemRefs.current[index] = element; }}
          role="option"
          aria-selected={index === highlightedIndex}
          tabIndex={-1}
          className={`client-list-item ${index === highlightedIndex ? "highlighted" : ""}`}
          href={clientHref(client.id)}
          onMouseEnter={() => setActiveIndex(index)}
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
        </Link>)}
      </div>
      {filtered.length === 0 ? <div className="client-empty"><Search /><strong>該当する顧客がありません</strong><span>{clients.length === 0 ? "「顧客を追加」から登録してください。" : "検索条件を変更してください。"}</span></div> : null}
    </main>

    {creating ? <ClientCreateModal error={error} saving={saving} onClose={() => setCreating(false)} onSubmit={createClient} /> : null}
  </div>;
}

function ClientCreateModal({ error, saving, onClose, onSubmit }: {
  error: string;
  saving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const currentYear = new Date().getFullYear();
  return <div className="modal-layer" role="presentation"><div className="modal client-switcher-modal" role="dialog" aria-modal="true" aria-labelledby="client-create-title">
    <header><div><p className="eyebrow">CLIENTS</p><h2 id="client-create-title">顧客を追加</h2></div><button type="button" className="icon-button" aria-label="閉じる" onClick={onClose} disabled={saving}><X /></button></header>
    <form className="client-create-form" onSubmit={onSubmit}>
      <p className="client-modal-guidance">新しい顧客専用の貸借対照表を作成します。既存顧客のデータとは分離して保存されます。</p>
      {error ? <p className="client-modal-error" role="alert"><AlertTriangle />{error}</p> : null}
      <div className="form-grid client-create-grid">
        <ClientFields autoFocus />
        <label>開始年度<input name="fiscalYear" type="number" min="1900" max="2200" defaultValue={currentYear} required /></label>
      </div>
      <footer>
        <button type="button" className="button secondary" onClick={onClose} disabled={saving}>キャンセル</button>
        <button type="submit" className="button primary" disabled={saving}>{saving ? <LoaderCircle className="spin" /> : <UserPlus />}登録して開く</button>
      </footer>
    </form>
  </div></div>;
}
