"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, Columns3, Pencil, Plus, Table2, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { detailGroup, positionDetailFields } from "@/lib/position-display";
import { DETAIL_PAGES, defaultColumns, detailColumns, detailPageFor, matchesDetailPage, parseColumnPreferences, type ColumnPreferences, type DetailPage } from "@/lib/position-detail-pages";
import { type Position, type PositionSection, type Snapshot, positionSection, propertyTypeOf, valuationDetailLine, assetGroupOf } from "@/lib/portfolio-view";
import { yen, triangleYen } from "@/lib/format";

type Props = {
  snapshot: Snapshot; taxBurden: (p: Position) => number | null;
  onAdd: (s: PositionSection, category?: string, propertyType?: "LAND" | "BUILDING") => void;
  onBulkManage: () => void; onEdit: (p: Position) => void; onDelete: (p: Position) => void;
  onReorder: (s: PositionSection, ids: number[]) => Promise<boolean>; saving: boolean; spotlightId?: number | null;
};
export function PositionDetailsView(props: Props) {
  const params = useSearchParams(); const pathname = usePathname(); const router = useRouter();
  const root = pathname.replace(/\/positions(?:\/[^/]+)?$/, "/positions");
  const target = props.snapshot.positions.find((p) => p.id === props.spotlightId);
  const legacyGroup = params.get("detailGroup");
  const fallback = props.snapshot.positions.find((p) => !legacyGroup || detailGroup(p) === legacyGroup) ?? props.snapshot.positions[0];
  const page = DETAIL_PAGES.find((p) => pathname.endsWith(`/positions/${p.key}`)) ?? (target ? detailPageFor(target) : undefined) ?? (fallback ? detailPageFor(fallback) : undefined) ?? DETAIL_PAGES[0];
  const search = params.toString();
  useEffect(() => {
    if (pathname !== root) return;
    const next = new URLSearchParams(search); next.delete("detailGroup");
    router.replace(`${root}/${page.key}${next.size ? `?${next}` : ""}`, { scroll: false });
  }, [pathname, root, page.key, search, router]);
  return <CategoryTable key={`${page.key}-${props.snapshot.id}`} {...props} page={page} root={root} />;
}

function CategoryTable({ page, root, snapshot, taxBurden, onAdd, onBulkManage, onEdit, onDelete, onReorder, saving, spotlightId }: Props & { page: DetailPage; root: string }) {
  const params = useSearchParams(); const router = useRouter();
  const columns = useMemo(() => detailColumns(page), [page]);
  const [preferences, setPreferences] = useState(() => defaultColumns(columns));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [storageNotice, setStorageNotice] = useState("");
  const storageKey = `pb.position-columns.v1.${page.key}`;
  useEffect(() => {
    try {
      // 保存した列設定は初回描画の後にブラウザから読み込む。
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPreferences(parseColumnPreferences(localStorage.getItem(storageKey), columns));
    } catch { /* 保存が利用できない環境でも標準表示を使える。 */ }
  }, [storageKey, columns]);
  function update(next: ColumnPreferences) {
    setPreferences(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); setStorageNotice("この科目の列設定を保存しました。"); }
    catch { setStorageNotice("このブラウザでは列設定を保存できません。今回の表示には適用しています。"); }
  }
  const orderedColumns = preferences.order.map((key) => columns.find((c) => c.key === key)).filter((c): c is typeof columns[number] => Boolean(c));
  const visibleColumns = orderedColumns.filter((c) => preferences.visible.includes(c.key));
  const rows = snapshot.positions.filter((p) => matchesDetailPage(p, page));
  const nextParams = new URLSearchParams(params.toString()); nextParams.delete("position"); nextParams.delete("detailGroup");
  const suffix = nextParams.size ? `?${nextParams}` : "";
  const listHref = `${root.replace(/\/positions$/, "/position-list")}${suffix}`;
  const groupOf = (p: DetailPage) => p.section === "ASSET" ? assetGroupOf(p.category) ?? "その他資産" : p.section === "LIABILITY" ? "負債" : "偶発債務";
  const groups = [...new Set(DETAIL_PAGES.map(groupOf))];
  function reorderColumn(key: string, delta: number) {
    const order = [...preferences.order]; const from = order.indexOf(key); const to = from + delta;
    if (key === "name" || to <= 0 || to >= order.length) return;
    [order[from], order[to]] = [order[to], order[from]]; update({ ...preferences, order });
  }
  function neighbor(p: Position, delta: number) {
    const group = snapshot.positions.filter((item) => positionSection(item) === positionSection(p) && item.category === p.category && propertyTypeOf(item) === propertyTypeOf(p));
    return group[group.findIndex((item) => item.id === p.id) + delta];
  }
  function move(p: Position, delta: number) {
    const target = neighbor(p, delta); if (!target || saving) return;
    const section = positionSection(p); const ordered = snapshot.positions.filter((item) => positionSection(item) === section);
    const from = ordered.findIndex((item) => item.id === p.id); const to = ordered.findIndex((item) => item.id === target.id);
    const [moved] = ordered.splice(from, 1); ordered.splice(to, 0, moved); void onReorder(section, ordered.map((item) => item.id));
  }
  const add = () => onAdd(page.section, page.category, page.propertyType);
  function cell(p: Position, key: string) {
    if (key === "name") return <button className="position-name-button" onClick={() => onEdit(p)} disabled={saving} aria-label={`${p.name}を修正`}>{p.name || "名称未登録"}</button>;
    if (key === "value") return yen.format(p.valueJpy);
    if (key === "tax") { const burden = taxBurden(p); return burden === null ? "—" : triangleYen(burden); }
    if (key === "method") return p.valuationMethod || "金額を直接入力";
    if (key === "formula") return valuationDetailLine(p) || "—";
    if (key === "currency") return p.currency;
    if (key === "original") return `${p.originalAmount.toLocaleString("ja-JP")} ${p.currency}`;
    if (key === "fx") return p.fxRate.toLocaleString("ja-JP");
    return new Map(positionDetailFields(p)).get(key) || "—";
  }
  return <>
    <section className="page-heading"><div><h2>資産・負債詳細</h2><p>{page.label}の情報を表で比較・編集できます。</p></div><div className="page-heading-actions"><Link className="button secondary" href={listHref}>一覧へ戻る</Link><button className="button secondary" onClick={onBulkManage} disabled={saving}><Table2 />まとめて入力</button><button className="button primary" onClick={add} disabled={saving}><Plus />明細を追加</button></div></section>
    <div className="category-table-toolbar"><label className="detail-category-select">科目別ページ<select aria-label="科目別ページ" value={page.key} onChange={(e) => router.push(`${root}/${e.target.value}${suffix}`, { scroll: false })}>{groups.map((group) => <optgroup key={group} label={group}>{DETAIL_PAGES.filter((p) => groupOf(p) === group).map((p) => <option key={p.key} value={p.key}>{p.label}（{snapshot.positions.filter((item) => matchesDetailPage(item, p)).length}件）</option>)}</optgroup>)}</select></label><button className="button secondary" aria-expanded={settingsOpen} aria-controls="detail-column-settings" onClick={() => setSettingsOpen((v) => !v)}><Columns3 />表示する列</button></div>
    <nav className="detail-category-links" aria-label="同じ区分の科目">{DETAIL_PAGES.filter((p) => groupOf(p) === groupOf(page)).map((p) => <Link key={p.key} href={`${root}/${p.key}${suffix}`} aria-current={p.key === page.key ? "page" : undefined}>{p.label}<span>{snapshot.positions.filter((item) => matchesDetailPage(item, p)).length}</span></Link>)}</nav>
    {settingsOpen ? <section id="detail-column-settings" className="panel detail-column-settings" aria-label="列の表示設定"><header><div><h3>{page.label}の列設定</h3><p>名称と金額は常に表示します。設定は科目ごとにこのブラウザに保存します。</p></div><button className="button secondary" onClick={() => update(defaultColumns(columns))}>標準表示に戻す</button></header><div className="detail-column-options">{orderedColumns.map((c, index) => <div key={c.key} className="detail-column-option"><label><input type="checkbox" aria-label={`${c.label}を表示`} checked={preferences.visible.includes(c.key)} disabled={c.required} onChange={(e) => update({ ...preferences, visible: e.target.checked ? [...preferences.visible, c.key] : preferences.visible.filter((key) => key !== c.key) })} />{c.label}</label><label className="column-width-label">幅<input type="number" aria-label={`${c.label}の列幅`} min={90} max={600} step={10} value={preferences.widths[c.key]} onChange={(e) => { const width = Number(e.target.value); if (width >= 90 && width <= 600) update({ ...preferences, widths: { ...preferences.widths, [c.key]: width } }); }} /><span>px</span></label><button className="icon-button" aria-label={`${c.label}の列を前へ`} disabled={c.key === "name" || index <= 1} onClick={() => reorderColumn(c.key, -1)}><ArrowUp /></button><button className="icon-button" aria-label={`${c.label}の列を後ろへ`} disabled={c.key === "name" || index === orderedColumns.length - 1} onClick={() => reorderColumn(c.key, 1)}><ArrowDown /></button></div>)}</div>{storageNotice ? <p role="status">{storageNotice}</p> : null}</section> : null}
    <p className="position-result-count">{page.label}・{rows.length}件・{snapshot.fiscalYear}年度{snapshot.isCurrent ? "（現在）" : "（過年度）"}{page.section === "CONTINGENT" ? "・B/S外" : ""}</p>
    <section className="panel category-table-panel"><div className="category-table-scroll" role="region" aria-label={`${page.label}の明細表（横スクロールできます）`} tabIndex={0}><table className="category-detail-table" style={{ width: visibleColumns.reduce((sum, c) => sum + preferences.widths[c.key], 0) + 170 }}><caption className="sr-only">{page.label}の明細</caption><colgroup>{visibleColumns.map((c) => <col key={c.key} style={{ width: preferences.widths[c.key] }} />)}<col style={{ width: 170 }} /></colgroup><thead><tr>{visibleColumns.map((c) => <th key={c.key} scope="col" className={c.key === "name" ? "fixed-name" : undefined}>{c.label}</th>)}<th scope="col">操作・並び順</th></tr></thead><tbody>{rows.map((p) => <tr id={`position-${p.id}`} key={p.id} className={spotlightId === p.id ? "is-spotlight" : undefined}>{visibleColumns.map((c) => <td key={c.key} data-column={c.key} className={`${c.key === "name" ? "fixed-name" : ""} ${["value", "tax", "original", "fx"].includes(c.key) ? "number" : ""}`}>{cell(p, c.key)}</td>)}<td><div className="category-row-actions"><button className="icon-button" aria-label={`${p.name}を修正（操作）`} disabled={saving} onClick={() => onEdit(p)}><Pencil /></button><button className="icon-button danger" aria-label={`${p.name}を削除`} disabled={saving} onClick={() => onDelete(p)}><Trash2 /></button><button className="icon-button" aria-label={`${p.name}を前へ移動`} disabled={saving || !neighbor(p, -1)} onClick={() => move(p, -1)}><ArrowUp /></button><button className="icon-button" aria-label={`${p.name}を後ろへ移動`} disabled={saving || !neighbor(p, 1)} onClick={() => move(p, 1)}><ArrowDown /></button></div></td></tr>)}</tbody></table></div>{rows.length === 0 ? <div className="position-detail-empty"><strong>この科目の明細はまだありません</strong><button className="button primary" onClick={add} disabled={saving}><Plus />明細を追加</button></div> : null}</section>
    <p className="position-list-note">横にスクロールして各項目を確認できます。名称列は左側に固定しています。金額・科目固有の情報は「修正」から編集できます。</p>
  </>;
}
