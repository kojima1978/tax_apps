"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, Search, Table2 } from "lucide-react";
import { useMemo } from "react";
import { type PositionSection, type Snapshot, positionSection, middleClassification, middleClassificationRank, categoryRank, propertyTypeOf, deemedConfig, categoryLabels } from "@/lib/portfolio-view";
import { matchesSearchTerms, searchTerms } from "@/lib/clients";
import { yen, triangleYen } from "@/lib/format";
import { positionCaption, positionKeyInfo } from "@/lib/position-display";
import { detailPageFor } from "@/lib/position-detail-pages";

export function PositionListView({ snapshot, detailHref, taxBurden, onAdd, onBulkManage, saving }: {
  snapshot: Snapshot; detailHref: string; taxBurden: (position: Snapshot["positions"][number]) => number | null;
  onAdd: (section: PositionSection) => void; onBulkManage: () => void; saving: boolean;
}) {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const query = params.get("q") ?? "";
  const section = params.get("listSection") ?? "all";
  const category = params.get("listCategory") ?? "all";
  const sort = params.get("listSort") ?? "classification";
  function change(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value === "" || value === "all" || (key === "listSort" && value === "classification")) next.delete(key); else next.set(key, value);
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  }
  const rows = useMemo(() => {
    const terms = searchTerms(query);
    const filtered = snapshot.positions.filter((p) => (section === "all" || positionSection(p) === section) && (category === "all" || p.category === category) && matchesSearchTerms([p.name, positionKeyInfo(p), positionCaption(p), p.institution, p.note], terms));
    const sectionRank = { ASSET: 0, LIABILITY: 1, CONTINGENT: 2 };
    return filtered.sort((a, b) => sort === "value-desc" ? b.valueJpy - a.valueJpy || a.id - b.id : sort === "value-asc" ? a.valueJpy - b.valueJpy || a.id - b.id : sort === "registered" ? a.id - b.id : sectionRank[positionSection(a)] - sectionRank[positionSection(b)] || (middleClassificationRank.get(middleClassification(a)) ?? 99) - (middleClassificationRank.get(middleClassification(b)) ?? 99) || (categoryRank.get(a.category) ?? 99) - (categoryRank.get(b.category) ?? 99) || (propertyTypeOf(a) === "BUILDING" ? 1 : 0) - (propertyTypeOf(b) === "BUILDING" ? 1 : 0));
  }, [snapshot.positions, query, section, category, sort]);
  const categories = [...new Set(snapshot.positions.map((p) => p.category))];
  function href(position: Snapshot["positions"][number]) {
    const [path, search] = detailHref.split("?");
    const next = new URLSearchParams(search);
    next.set("position", String(position.id)); next.delete("detailGroup");
    const page = detailPageFor(position);
    const root = path.replace(/\/positions(?:\/[^/]+)?$/, "/positions");
    return `${root}${page ? `/${page.key}` : ""}?${next}`;
  }
  return <>
    <h2 className="position-list-print-title">資産・負債一覧</h2>
    <section className="page-heading"><div><h2>資産・負債一覧</h2><p>全区分を横断して比較・検索できます。名称を選ぶと詳細を開きます。</p></div><div className="page-heading-actions"><button className="button secondary" onClick={onBulkManage} disabled={saving}><Table2 />まとめて入力</button><button className="button primary" onClick={() => onAdd(section === "LIABILITY" || section === "CONTINGENT" ? section : "ASSET")} disabled={saving}><Plus />明細を追加</button></div></section>
    <div className="position-list-filters">
      <label className="position-list-search"><span>検索</span><div><Search /><input type="search" aria-label="資産・負債を検索" value={query} onChange={(e) => change("q", e.target.value)} placeholder="名称・所在地・金融機関・受取人" /></div></label>
      <label>区分<select value={section} onChange={(e) => change("listSection", e.target.value)}><option value="all">すべて</option><option value="ASSET">資産</option><option value="LIABILITY">負債</option><option value="CONTINGENT">偶発債務（B/S外）</option></select></label>
      <label>科目<select value={category} onChange={(e) => change("listCategory", e.target.value)}><option value="all">すべて</option>{categories.map((c) => <option key={c} value={c}>{categoryLabels[c] ?? c}</option>)}</select></label>
      <label>表示順<select value={sort} onChange={(e) => change("listSort", e.target.value)}><option value="classification">区分・科目順</option><option value="value-desc">評価額の大きい順</option><option value="value-asc">評価額の小さい順</option><option value="registered">登録順</option></select></label>
    </div>
    <p className="position-result-count" aria-live="polite">{rows.length}件（全{snapshot.positions.length}件中）</p>
    <section className="panel position-summary-panel"><div className="position-summary-scroll"><table className="position-summary-table">
      <thead><tr><th>区分</th><th>科目・名称</th><th>所在地・金融機関・受取人等</th><th className="number">円換算時価</th><th className="number">相続税負担額</th><th><span className="sr-only">詳細</span></th></tr></thead>
      <tbody>{rows.map((p) => { const burden = taxBurden(p); const config = deemedConfig(p); return <tr key={p.id} onClick={(e) => { if (!(e.target as HTMLElement).closest("a")) router.push(href(p)); }}>
        <td data-label="区分"><span className={`position-section-badge section-${positionSection(p)}`}>{positionSection(p) === "ASSET" ? "資産" : positionSection(p) === "LIABILITY" ? "負債" : "B/S外"}</span></td>
        <td data-label="科目・名称"><Link href={href(p)} className="position-summary-name"><span>{positionCaption(p)}</span><strong>{p.name || "名称未登録"}</strong></Link></td>
        <td data-label="所在地等" className="position-summary-info" title={positionKeyInfo(p)}>{positionKeyInfo(p)}</td>
        <td data-label="円換算時価" className="number" title={config ? `${config.surrenderLabel}（現在価値）` : undefined}>{yen.format(p.valueJpy)}{config ? <span className="sr-only">（{config.surrenderLabel}）</span> : null}</td>
        <td data-label="相続税負担額" className="number">{burden === null ? "—" : triangleYen(burden)}</td>
        <td><Link href={href(p)} aria-label={`${p.name}の詳細`} className="position-summary-open">詳細</Link></td>
      </tr>; })}</tbody>
    </table></div>{rows.length === 0 ? <div className="position-detail-empty"><strong>{snapshot.positions.length ? "条件に一致する明細がありません" : "まだ明細が登録されていません"}</strong>{snapshot.positions.length ? <button className="button secondary" onClick={() => { const next = new URLSearchParams(params.toString()); ["q", "listSection", "listCategory"].forEach((k) => next.delete(k)); router.replace(`${pathname}?${next}`, { scroll: false }); }}>絞り込みを解除</button> : <button className="button primary" onClick={() => onAdd("ASSET")}><Plus />明細を追加</button>}</div> : null}</section>
    <p className="position-list-note">円換算時価は現在価値です。生命保険は解約返戻金、退職金は解約手当金を表示します。死亡給付金・受取人・評価根拠は詳細で確認できます。</p>
  </>;
}
