"use client";

import { AlertTriangle, Building2, ChevronRight, CircleUserRound, DatabaseBackup, LayoutDashboard, LoaderCircle, Menu, Search, Trash2, Upload, UserCog, UserPlus, WalletCards, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActionMenu, type ActionMenuItem } from "@/components/action-menu";
import { ClientFields } from "@/components/client-fields";
import { Highlighted } from "@/components/highlighted";
import { ListPager, PageSizeSelect } from "@/components/list-pager";
import { ClientDeleteModal } from "@/components/client-delete-modal";
import { DateInput } from "@/components/date-input";
import { AppBrand, PortalLink } from "@/components/portal-link";
import { API_BASE } from "@/lib/api";
import { CLIENT_SORT_DEFAULT, CLIENT_SORT_MODES, type ClientSortMode, ClientSummary, filterClients, searchTerms, sharedFiscalYear, showsUnassignedStaff, sortClients } from "@/lib/clients";
import { PAGE_SIZE_DEFAULT, pageSlice } from "@/lib/pagination";
import { defaultAsOfDate } from "@/lib/snapshot-date";
import { type Portfolio } from "@/lib/portfolio-view";
import { compactYen } from "@/lib/format";
import { useModalDialog } from "@/components/use-modal-dialog";

/** 顧客ページのうち、一覧から最初に開く画面。 */
export const CLIENT_HOME_SECTION = "balance";

export const clientHref = (householdId: number) => `/customers/${householdId}/${CLIENT_HOME_SECTION}`;
const qualityIssuesFor = (client: ClientSummary) => client.qualityIssues ?? [];

export function ClientList() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientSummary[] | null>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_DEFAULT);
  const [sortMode, setSortMode] = useState<ClientSortMode>(CLIENT_SORT_DEFAULT);
  const [qualityFilter, setQualityFilter] = useState<"all" | "attention" | "critical">("all");
  const [creating, setCreating] = useState(false);
  const [qualityClient, setQualityClient] = useState<ClientSummary | null>(null);
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
  const matched = useMemo(() => filterClients(clients ?? [], terms), [clients, terms]);
  // 以降はすべて「絞り込んで並べ替えた後」のこの1本だけを見る。矢印キーでの移動・
  // ページ送り・件数が並び替えと食い違わないようにするため。
  const qualityMatched = useMemo(() => matched.filter((client) => qualityFilter === "all"
    || (qualityFilter === "attention" && qualityIssuesFor(client).length > 0)
    || (qualityFilter === "critical" && qualityIssuesFor(client).some((issue) => issue.severity === "critical"))), [matched, qualityFilter]);
  const filtered = useMemo(() => sortClients(qualityMatched, sortMode), [qualityMatched, sortMode]);
  const qualityFilterLabel = qualityFilter === "attention" ? "要確認" : qualityFilter === "critical" ? "重要な不備" : "";
  const listIsFiltered = terms.length > 0 || qualityFilter !== "all";
  // 次の2つは絞り込みの前（全件）で決める。検索のたびに欄が出入りすると行の形が変わるため。
  const sharedYear = useMemo(() => sharedFiscalYear(clients ?? []), [clients]);
  const showsUnassigned = useMemo(() => showsUnassignedStaff(clients ?? []), [clients]);
  // 絞り込みで件数が減っても範囲外を指さないようにする。
  const highlightedIndex = filtered.length === 0 ? -1 : Math.min(activeIndex, filtered.length - 1);
  // 描画するのはこのページのぶんだけ。ページは選択中の行から決めるので、
  // 矢印キーでの移動は絞り込んだ全件を通して回り、ページは後から付いてくる。
  const paged = useMemo(() => pageSlice(filtered, Math.floor(Math.max(highlightedIndex, 0) / pageSize) + 1, pageSize), [filtered, highlightedIndex, pageSize]);

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
      <AppBrand />
    </header>

    <main className="client-home-main">
      <section className="page-heading"><div><h1>顧客一覧</h1></div></section>

      <section className="client-overview" aria-label="顧客管理の状況">
        <button type="button" aria-pressed={qualityFilter === "all"} onClick={() => { setQualityFilter("all"); setActiveIndex(0); }}><span>管理顧客</span><strong>{clients.length}件</strong></button>
        <button type="button" aria-pressed={qualityFilter === "attention"} onClick={() => { setQualityFilter("attention"); setActiveIndex(0); }}><span>要確認</span><strong>{clients.filter((client) => qualityIssuesFor(client).length > 0).length}件</strong></button>
        <button type="button" aria-pressed={qualityFilter === "critical"} onClick={() => { setQualityFilter("critical"); setActiveIndex(0); }}><span>重要な不備</span><strong>{clients.filter((client) => qualityIssuesFor(client).some((issue) => issue.severity === "critical")).length}件</strong></button>
        <div><span>純資産合計</span><strong>{compactYen(clients.reduce((sum, client) => sum + (client.netWorth ?? 0), 0))}</strong></div>
      </section>

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
            placeholder="顧客名・カナ・顧客コード・担当者・関連法人で検索"
          />
        </label>
        <button type="button" className="button primary" onClick={() => { setError(""); setCreating(true); }}><UserPlus />顧客を追加</button>
        {/* 担当者の台帳はここだけから開く。顧客の欄では選ぶだけにして、名前の揺れを1箇所で止める。 */}
        <Link className="button secondary client-toolbar-secondary" href="/staff"><UserCog />担当者</Link>
        <Link className="button secondary client-toolbar-secondary" href="/settings"><UserCog />共通設定</Link>
        <Link className="button secondary client-toolbar-secondary" href="/properties"><Building2 />不動産一覧</Link>
        <Link className="button secondary client-toolbar-secondary" href="/backup"><DatabaseBackup />バックアップ</Link>
        <Link className="button secondary client-toolbar-secondary" href="/restore"><Upload />データ復元</Link>
        <ActionMenu
          id="client-toolbar-menu"
          label="その他の操作"
          className="client-toolbar-mobile-menu"
          triggerClassName="button secondary"
          trigger={<><Menu />その他</>}
          items={[
            { key: "staff", label: "担当者", icon: UserCog, href: "/staff" },
            { key: "settings", label: "共通設定", icon: UserCog, href: "/settings" },
            { key: "properties", label: "不動産一覧", icon: Building2, href: "/properties" },
            { key: "backup", label: "バックアップ", icon: DatabaseBackup, href: "/backup" },
            { key: "restore", label: "データ復元", icon: Upload, href: "/restore" },
          ]}
        />
      </div>
      {/* 削除の通知が role="status" を使うので、件数は aria-live だけで読み上げる。 */}
      <div className="client-list-tools">
        <p className="client-count" aria-live="polite">
          {qualityFilterLabel ? `${qualityFilterLabel}・` : null}
          {listIsFiltered ? `${filtered.length}件（全${clients.length}件中）` : `全${clients.length}件`}
          {sharedYear ? `・すべて${sharedYear}年度` : null}
        </p>
        <div className="position-table-tools">
          <label>
            <span>確認状況</span>
            <select aria-label="顧客の確認状況" value={qualityFilter} onChange={(event) => { setQualityFilter(event.target.value as typeof qualityFilter); setActiveIndex(0); }}>
              <option value="all">すべて</option>
              <option value="attention">要確認</option>
              <option value="critical">重要な不備</option>
            </select>
          </label>
          <label>
            <span>表示順</span>
            <select aria-label="顧客一覧の表示順" value={sortMode} onChange={(event) => { setSortMode(event.target.value as ClientSortMode); setActiveIndex(0); }}>
              {CLIENT_SORT_MODES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <PageSizeSelect value={pageSize} onChange={(size) => { setPageSize(size); setActiveIndex(0); }} />
        </div>
      </div>

      <div className="client-list" id="client-options" role="grid" aria-label="顧客">
        {paged.rows.map((client, indexInPage) => { const index = paged.from + indexInPage; return <div
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
          {/* 1行に収める。イニシャルの丸は情報を持たないので置かず、その位置に顧客コードを出す。 */}
          <span className="client-list-code"><Highlighted text={client.clientCode} terms={terms} /></span>
          <strong className="client-list-name"><Highlighted text={client.name} terms={terms} /></strong>
          {/* カナ・担当者・関連法人は列ごとに固定幅で置く（値が無い行も空けたまま。頭の位置が行ごとに動かないため）。
              関連法人は社名そのものが何の列かを示すので語を付けないが、担当者は氏名だけでは分からないので「担当」を残す。 */}
          <small className="client-list-kana">{client.nameKana ? <Highlighted text={client.nameKana} terms={terms} /> : null}</small>
          <small className="client-list-staff">
            {client.assignedStaff ? <>担当 <Highlighted text={client.assignedStaff} terms={terms} /></> : showsUnassigned ? "担当者未設定" : null}
          </small>
          <small className="client-list-company">{client.relatedCompany ? <Highlighted text={client.relatedCompany} terms={terms} /> : null}</small>
          <span className="client-list-financial"><strong>{compactYen(client.netWorth ?? 0)}</strong><small>純資産</small></span>
          <span className="client-list-updated"><strong>{client.latestUpdatedAt ? new Date(client.latestUpdatedAt).toLocaleDateString("ja-JP") : "未更新"}</strong><small>最終更新</small></span>
          {/* 全件同じ年度なら件数の横に1回だけ出しているので、行には出さない。 */}
          {sharedYear ? null : <span className="client-list-year">{client.latestFiscalYear ? `${client.latestFiscalYear}年度` : "年度なし"}</span>}
          <ChevronRight />
          </Link></div>
          <div role="gridcell" className="client-list-quality-cell">
            {qualityIssuesFor(client).length > 0 ? <button
              type="button"
              className={`client-quality-badge client-quality-button ${qualityIssuesFor(client).some((issue) => issue.severity === "critical") ? "critical" : "warning"}`}
              aria-label={`${client.name}の確認事項を表示（${qualityIssuesFor(client).length}件）`}
              aria-haspopup="dialog"
              onClick={() => setQualityClient(client)}
            ><AlertTriangle aria-hidden="true" />要確認 {qualityIssuesFor(client).length}件</button>
              : <span className="client-quality-badge complete">確認済み</span>}
          </div>
          <div role="gridcell"><ClientRowActions client={client} busy={deleteLoadingId !== null} loading={deleteLoadingId === client.id} onDelete={() => { void requestDelete(client); }} /></div>
        </div>; })}
      </div>
      {filtered.length === 0 ? null : <ListPager
        label="顧客一覧のページ切り替え"
        total={filtered.length}
        from={paged.from}
        shown={paged.rows.length}
        current={paged.current}
        last={paged.last}
        onChange={(page) => setActiveIndex((page - 1) * pageSize)}
      />}
      {filtered.length === 0 ? <div className="client-empty"><Search /><strong>該当する顧客がありません</strong><span>{clients.length === 0 ? "「顧客を追加」から登録してください。" : "検索条件を変更してください。"}</span></div> : null}
    </main>

    {creating ? <ClientCreateModal error={error} saving={saving} onClose={() => setCreating(false)} onSubmit={createClient} /> : null}
    {qualityClient ? <ClientQualityModal client={qualityClient} onClose={() => setQualityClient(null)} /> : null}
    {deleting ? <ClientDeleteModal household={deleting.household} snapshotCount={deleting.snapshots.length} positionCount={deleting.snapshots.reduce((count, snapshot) => count + snapshot.positions.length, 0)} error={deleteError} saving={saving} onClose={() => setDeleting(null)} onSubmit={deleteClient} /> : null}
  </div>;
}

function ClientQualityModal({ client, onClose }: { client: ClientSummary; onClose: () => void }) {
  const { dialogRef, onKeyDown } = useModalDialog<HTMLDivElement>({ onEscape: onClose });
  const issues = [...qualityIssuesFor(client)].sort((a, b) => Number(b.severity === "critical") - Number(a.severity === "critical"));
  return <div className="modal-layer" role="presentation" onKeyDown={onKeyDown}>
    <div ref={dialogRef} tabIndex={-1} className="modal client-quality-modal" role="dialog" aria-modal="true" aria-labelledby="client-quality-title" aria-describedby="client-quality-help">
      <header><div><h2 id="client-quality-title">{client.name}の確認事項</h2><p>{client.clientCode}{client.latestFiscalYear ? `・${client.latestFiscalYear}年度` : ""}</p></div><button type="button" className="icon-button" aria-label="閉じる" onClick={onClose}><X /></button></header>
      <div className="client-quality-content">
        <p id="client-quality-help">項目を選ぶと修正画面を開きます。</p>
        <ul className="client-quality-issues">{issues.map((issue) => <li key={issue.code}>
          <Link className={`client-quality-issue ${issue.severity}`} href={`/customers/${client.id}/${issue.href}`} aria-label={`${issue.label}：修正画面を開く`}>
            <AlertTriangle aria-hidden="true" /><span><small>{issue.severity === "critical" ? "重要な不備" : "要確認"}</small><strong>{issue.label}</strong></span><span className="client-quality-fix">修正する<ChevronRight aria-hidden="true" /></span>
          </Link>
        </li>)}</ul>
      </div>
      <footer><button type="button" className="button secondary" onClick={onClose}>閉じる</button></footer>
    </div>
  </div>;
}

/**
 * 顧客行の「⋯」メニューから直接開ける画面。顧客を開いてからサイドバーで選び直す手間を省く。
 * 並びと名前は顧客を開いた後のサイドバー（dashboard.tsx の SECTIONS）に揃える ──
 * 同じ行き先が2通りの順で並んでいると、どちらの画面でも読み直すことになる。
 */
const CLIENT_MENU_LINKS = [
  { section: "profile", label: "本人情報", icon: CircleUserRound },
  { section: "balance", label: "貸借対照表", icon: LayoutDashboard },
  { section: "position-list", label: "資産・負債一覧", icon: WalletCards },
  { section: "positions", label: "資産・負債詳細", icon: WalletCards },
] as const;

function ClientRowActions({ client, busy, loading, onDelete }: { client: ClientSummary; busy: boolean; loading: boolean; onDelete: () => void }) {
  const items: ActionMenuItem[] = [
    ...CLIENT_MENU_LINKS.map(({ section, label, icon }) => ({ key: section, label, icon, href: `/customers/${client.id}/${section}` })),
    { key: "delete", label: "顧客を削除", icon: Trash2, danger: true, onSelect: onDelete },
  ];
  return <ActionMenu id={`client-menu-${client.id}`} label={`${client.name}の操作`} items={items} busy={busy} loading={loading} className="client-row-actions" />;
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
  const { dialogRef, onKeyDown } = useModalDialog<HTMLDivElement>({ onEscape: () => { if (!saving) onClose(); }, initialFocus: 'input[name="name"]' });

  function changeFiscalYear(value: string) {
    setFiscalYear(value);
    const year = Number(value);
    if (Number.isInteger(year) && year >= 1900 && year <= 2200) setAsOfDate(defaultAsOfDate(year));
  }

  return <div className="modal-layer" role="presentation" onKeyDown={onKeyDown}><div ref={dialogRef} tabIndex={-1} className="modal client-switcher-modal" role="dialog" aria-modal="true" aria-labelledby="client-create-title" aria-busy={saving}>
    <header><div><h2 id="client-create-title">顧客を追加</h2></div><button type="button" className="icon-button" aria-label="閉じる" onClick={onClose} disabled={saving}><X /></button></header>
    <form className="client-create-form" onSubmit={onSubmit}>
      <p className="client-modal-guidance">新しい顧客専用の貸借対照表を作成します。既存顧客のデータとは分離して保存されます。</p>
      {error ? <p className="client-modal-error" role="alert"><AlertTriangle />{error}</p> : null}
      <div className="form-grid client-create-grid">
        <ClientFields />
        <label>開始年度<input name="fiscalYear" type="number" min="1900" max="2200" value={fiscalYear} onChange={(event) => changeFiscalYear(event.target.value)} required /></label>
        <div className="date-field">
          <label htmlFor="client-as-of-date">B/S基準日</label>
          <DateInput id="client-as-of-date" name="asOfDate" label="B/S基準日" min={`${fiscalYear}-01-01`} max={`${fiscalYear}-12-31`} value={asOfDate} onChange={setAsOfDate} describedBy="client-as-of-date-help" required />
          <small id="client-as-of-date-help" className="field-help">初期値は年度の1月1日です。必要な場合だけ変更してください。</small>
        </div>
      </div>
      <footer>
        <button type="button" className="button secondary" onClick={onClose} disabled={saving}>キャンセル</button>
        <button type="submit" className="button primary" disabled={saving}>{saving ? <LoaderCircle className="spin" /> : <UserPlus />}登録して開く</button>
      </footer>
    </form>
  </div></div>;
}
