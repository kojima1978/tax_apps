"use client";

import { AlertTriangle, Download, LoaderCircle, Printer, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { propertyPlanOptions } from "@/lib/property-plan";
import { BackToClientList } from "@/components/back-to-client-list";
import { Highlighted } from "@/components/highlighted";
import { ListPager, PageSizeSelect } from "@/components/list-pager";
import { PanelHeader } from "@/components/panel-header";
import { API_BASE } from "@/lib/api";
import { searchTerms } from "@/lib/clients";
import { yen } from "@/lib/format";
import { PAGE_SIZE_DEFAULT, pageSlice } from "@/lib/pagination";
import { categoryLabels, propertyAreaText, propertyTypeLabels, realEstateCategories } from "@/lib/portfolio-view";
import {
  PROPERTY_FILTER_ALL,
  PROPERTY_SORT_DEFAULT,
  PROPERTY_SORT_MODES,
  type PropertyFilters,
  type PropertyRow,
  type PropertySortMode,
  filterProperties,
  propertiesCsv,
  propertiesCsvFileName,
  propertyPositionHref,
  sortProperties,
} from "@/lib/properties";

type PropertyYearMode = "current" | "all" | `${number}`;
type PropertiesResponse = { rows: PropertyRow[]; fiscalYears: number[] };

/** 絞り込みの選択欄。科目・区分を同じ形で並べる。 */
const filterFields = [
  { key: "category", label: "科目", options: realEstateCategories.map((category) => ({ value: category, label: categoryLabels[category] })) },
  { key: "propertyType", label: "土地・建物", options: Object.entries(propertyTypeLabels).map(([value, label]) => ({ value, label })) },
  { key: "plan", label: "今後の方針", options: [...propertyPlanOptions, { value: "DISPOSAL", label: "売却・処分予定" }] },
] as const satisfies ReadonlyArray<{ key: keyof PropertyFilters; label: string; options: ReadonlyArray<{ value: string; label: string }> }>;

/** 面積は㎡までの整数・小数をそのまま出す（未入力は「－」）。 */
const areaText = (area: number | null) => area === null ? "－" : propertyAreaText(area);

/** 金額の未入力は「－」。0円の入力と区別する（路線価方式の土地は固定資産税評価額を持たない）。 */
const yenText = (value: number | null) => value === null ? "－" : yen.format(value);

/**
 * 持分はスラッシュの後だけ折り返せるようにする。分母の大きい行（9,006/534,683 など）が
 * 1行で収まらないと列がその幅まで広がってしまうため。数字の途中では切らない。
 */
const ownershipText = (ownership: string) => {
  const [numerator, ...rest] = ownership.split("/");
  return rest.length === 0 ? ownership : <>{numerator}/<wbr />{rest.join("/")}</>;
};

/**
 * 全顧客の不動産一覧。選択した年度条件のB/Sにある不動産の明細を横断で見て、
 * 絞り込んだ結果をそのままCSVへ書き出す。顧客ごとの明細を開き直す手間を省くための画面。
 */
export function PropertiesView() {
  const [rows, setRows] = useState<PropertyRow[] | null>(null);
  const [error, setError] = useState("");
  const [yearMode, setYearMode] = useState<PropertyYearMode>("current");
  const [fiscalYears, setFiscalYears] = useState<number[]>([]);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<PropertyFilters>({ category: PROPERTY_FILTER_ALL, propertyType: PROPERTY_FILTER_ALL });
  const [sortMode, setSortMode] = useState<PropertySortMode>(PROPERTY_SORT_DEFAULT);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_DEFAULT);
  const [page, setPage] = useState(1);
  const [includePlan, setIncludePlan] = useState(false);
  const [printing, setPrinting] = useState(false);
  const router = useRouter();

  // 印刷時はページ送りで隠れている明細も含め、絞り込み結果をすべて出す。
  useEffect(() => {
    const before = () => flushSync(() => setPrinting(true));
    const after = () => setPrinting(false);
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => { window.removeEventListener("beforeprint", before); window.removeEventListener("afterprint", after); };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(`${API_BASE}/properties?year=${encodeURIComponent(yearMode)}`, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error();
        const result = await response.json() as PropertiesResponse;
        setRows(result.rows);
        setFiscalYears(result.fiscalYears);
      } catch {
        if (controller.signal.aborted) return;
        setRows([]);
        setError("不動産の一覧を読み込めませんでした。画面を更新してください。");
      }
    })();
    return () => controller.abort();
  }, [yearMode]);

  const terms = useMemo(() => searchTerms(query), [query]);
  const planCounts = useMemo(() => {
    const candidates = filterProperties(rows ?? [], terms, { ...filters, plan: PROPERTY_FILTER_ALL });
    return { total: candidates.length, counts: Object.fromEntries(propertyPlanOptions.map((option) => [option.value, candidates.filter((row) => row.plan === option.value).length])) };
  }, [rows, terms, filters]);
  const matched = useMemo(() => filterProperties(rows ?? [], terms, filters), [rows, terms, filters]);
  // 並び替えは絞り込みの後ろに1段だけ入れ、下流（合計・CSV・ページ送り）へは filtered だけを渡す。
  const filtered = useMemo(() => sortProperties(matched, sortMode), [matched, sortMode]);
  const total = useMemo(() => filtered.reduce((sum, row) => sum + row.valueJpy, 0), [filtered]);
  const clientCount = useMemo(() => new Set(filtered.map((row) => row.householdId)).size, [filtered]);
  const narrowed = terms.length > 0 || filters.category !== PROPERTY_FILTER_ALL || filters.propertyType !== PROPERTY_FILTER_ALL || Boolean(filters.plan && filters.plan !== PROPERTY_FILTER_ALL);
  // 描画するのはこのページのぶんだけ。全件を並べると行数に比例して表示が遅くなる。
  const paged = useMemo(() => pageSlice(filtered, page, pageSize), [filtered, page, pageSize]);
  const yearSubtitle = yearMode === "current"
    ? "各顧客の現在年度のB/Sにある不動産です"
    : yearMode === "all"
      ? "登録されている全年度の不動産です（同じ物件が年度ごとに表示される場合があります）"
      : `${yearMode}年度のB/Sにある不動産です`;
  const printFilters = filterFields.flatMap((field) => {
    const value = filters[field.key];
    return value && value !== PROPERTY_FILTER_ALL ? [`${field.label}：${field.options.find((option) => option.value === value)?.label ?? value}`] : [];
  });

  // 絞り込んだ結果をそのまま書き出す（画面に出ているものと中身を一致させる）。
  const downloadCsv = () => {
    const url = URL.createObjectURL(new Blob([propertiesCsv(filtered, includePlan)], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = propertiesCsvFileName();
    link.click();
    URL.revokeObjectURL(url);
  };

  return <div className="properties-page">
    <div className="page-heading"><div><BackToClientList /><h1>不動産一覧</h1></div></div>
    <div className="client-home-toolbar">
      <label className="client-search">
        <Search />
        <span className="sr-only">不動産の検索</span>
        <input
          type="search"
          value={query}
          onChange={(event) => { setQuery(event.target.value); setPage(1); }}
          placeholder="顧客名・所在地・名称・地目・担当者で検索"
        />
      </label>
      <button type="button" className="button secondary" onClick={downloadCsv} disabled={filtered.length === 0}>
        <Download />CSVで書き出す
      </button>
      <button type="button" className="button secondary" onClick={() => window.print()} disabled={filtered.length === 0}><Printer />印刷・PDF</button>
      <label className="property-plan-export-option"><input type="checkbox" checked={includePlan} onChange={(event) => setIncludePlan(event.target.checked)} />希望時期・メモ付きで出力</label>
    </div>
    {error ? <p className="backup-message error" role="alert"><AlertTriangle />{error}</p> : null}
    <article className="panel properties-panel">
      <PanelHeader
        title="登録している不動産"
        subtitle={yearSubtitle}
        action={<div className="position-table-tools" aria-label="不動産一覧の絞り込みと並び順">
          <label>
            <span>対象年度</span>
            <select
              value={yearMode}
              onChange={(event) => {
                setRows(null);
                setError("");
                setYearMode(event.target.value as PropertyYearMode);
                setPage(1);
              }}
            >
              <option value="current">各顧客の現在年度</option>
              {fiscalYears.map((year) => <option key={year} value={year}>{year}年度</option>)}
              <option value="all">全年度</option>
            </select>
          </label>
          {filterFields.map((field) => <label key={field.key}>
            <span>{field.label}</span>
            <select
              value={filters[field.key] ?? PROPERTY_FILTER_ALL}
              onChange={(event) => { setFilters((current) => ({ ...current, [field.key]: event.target.value })); setPage(1); }}
            >
              <option value={PROPERTY_FILTER_ALL}>すべて</option>
              {field.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>)}
          <label>
            <span>表示順</span>
            <select value={sortMode} onChange={(event) => { setSortMode(event.target.value as PropertySortMode); setPage(1); }}>
              {PROPERTY_SORT_MODES.map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}
            </select>
          </label>
          <PageSizeSelect value={pageSize} onChange={(size) => { setPageSize(size); setPage(1); }} />
        </div>}
      />
      <div className="property-plan-filters" role="group" aria-label="方針で絞り込み">
        <button type="button" aria-pressed={!filters.plan || filters.plan === PROPERTY_FILTER_ALL} onClick={() => { setFilters((current) => ({ ...current, plan: PROPERTY_FILTER_ALL })); setPage(1); }} disabled={rows === null}>すべて <span>{planCounts.total}件</span></button>
        {propertyPlanOptions.map((option) => <button key={option.value} type="button" aria-pressed={filters.plan === option.value} onClick={() => { setFilters((current) => ({ ...current, plan: option.value })); setPage(1); }} disabled={rows === null}>{option.label} <span>{planCounts.counts[option.value]}件</span></button>)}
      </div>
      <div className="properties-print-heading"><h2>不動産一覧{includePlan ? "（希望時期・メモ付き）" : ""}</h2><p>{yearSubtitle}</p>{printFilters.length || query.trim() ? <p>{[...printFilters, ...(query.trim() ? [`検索：${query.trim()}`] : [])].join("／")}</p> : null}</div>
      <div className="table-scroll" role="region" aria-label="不動産一覧。横にスクロールできます" tabIndex={0}>
        {rows === null ? <p className="properties-loading" role="status"><LoaderCircle className="spin" />読み込み中です…</p> : <table className="properties-table">
          <thead><tr>
            <th colSpan={5} scope="colgroup" className="properties-plan-group">今後の方針</th>
            <th rowSpan={2} scope="col" className="properties-client-column">顧客</th><th rowSpan={2} scope="col" className="properties-category-column">科目・区分</th><th rowSpan={2} scope="col">名称・所在地</th><th rowSpan={2} scope="col" className="properties-use-column">地目・用途</th>
            <th rowSpan={2} scope="col" className="number properties-area-column">面積</th><th rowSpan={2} scope="col" className="number properties-share-column">持分</th>
            <th rowSpan={2} scope="col" className="number properties-fixed-value-column">固定資産税評価額</th><th rowSpan={2} scope="col" className="number properties-value-column">評価額（円）</th>
            {includePlan ? <th rowSpan={2} scope="col" className="property-plan-column property-plan-memo-column">希望時期・メモ</th> : null}
          </tr><tr>{propertyPlanOptions.map((option) => <th key={option.value} scope="col" className="properties-plan-choice">{option.label}</th>)}</tr></thead>
          <tbody>
            {filtered.length === 0
              ? <tr className="properties-empty-row"><td colSpan={includePlan ? 14 : 13}>{rows.length === 0 ? "不動産の明細はまだ登録されていません。" : "条件に一致する不動産はありません。"}</td></tr>
              : (printing ? filtered : paged.rows).map((row) => <tr key={row.positionId} className="properties-row" onClick={(event) => {
                // 行のどこを押してもその明細へ送る。行の中のリンク（顧客名・名称）はそちらを優先する。
                if ((event.target as HTMLElement).closest("a")) return;
                router.push(propertyPositionHref(row));
              }}>
                {propertyPlanOptions.map((option) => <td key={option.value} className={`properties-plan-mark${row.plan === option.value ? " is-selected" : ""}`} data-label={option.label}><span aria-hidden="true">{row.plan === option.value ? "●" : "○"}</span>{row.plan === option.value ? <span className="sr-only">今後の方針：{option.label}</span> : null}</td>)}
                <td data-label="顧客">
                  <Link className="properties-client-link" href={`/customers/${row.householdId}/positions`}>
                    <strong><Highlighted text={row.clientName} terms={terms} /></strong>
                  </Link>
                  <small><Highlighted text={row.clientCode} terms={terms} />／{row.fiscalYear}年度</small>
                </td>
                <td data-label="科目・区分"><span className="category-tag">{row.categoryLabel}</span>{row.propertyTypeLabel}</td>
                <td data-label="名称・所在地">
                  <Link className="properties-position-link" href={propertyPositionHref(row)}>
                    <strong><Highlighted text={row.name} terms={terms} /></strong>
                  </Link>
                  <small><Highlighted text={row.address} terms={terms} /></small>
                </td>
                <td data-label="地目・用途"><Highlighted text={row.useLabel || "－"} terms={terms} /></td>
                <td data-label="面積" className="number">{areaText(row.area)}</td>
                <td data-label="持分" className="number properties-share-column">{ownershipText(row.ownership)}</td>
                <td data-label="固定資産税評価額" className="number">{yenText(row.fixedAssetTaxValue)}</td>
                <td data-label="評価額（円）" className="number">{yen.format(row.valueJpy)}</td>
                {includePlan ? <td data-label="希望時期・メモ" className="property-plan-column property-plan-memo-column"><div className="property-plan-print-details">{row.planTiming ? <p>希望時期：{row.planTiming}</p> : null}{row.planNote ? <p>{row.planNote}</p> : null}{!row.planTiming && !row.planNote ? "—" : null}</div></td> : null}
              </tr>)}
          </tbody>
          <tfoot><tr>
            <th scope="row" colSpan={12}>{narrowed ? "絞り込みの合計" : "合計"}（{filtered.length}件・{clientCount}名）</th>
            <td className="number">{yen.format(total)}</td>
            {includePlan ? <td className="property-plan-column property-plan-memo-column" /> : null}
          </tr></tfoot>
        </table>}
      </div>
      {filtered.length === 0 ? null : <ListPager
        label="不動産一覧のページ切り替え"
        total={filtered.length}
        from={paged.from}
        shown={paged.rows.length}
        current={paged.current}
        last={paged.last}
        onChange={setPage}
      />}
    </article>
  </div>;
}
