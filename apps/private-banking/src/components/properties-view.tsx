"use client";

import { AlertTriangle, ChevronLeft, ChevronRight, Download, LoaderCircle, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Highlighted } from "@/components/highlighted";
import { PanelHeader } from "@/components/panel-header";
import { API_BASE } from "@/lib/api";
import { searchTerms } from "@/lib/clients";
import { yen } from "@/lib/format";
import { categoryLabels, propertyTypeLabels, realEstateCategories } from "@/lib/portfolio-view";
import {
  PROPERTY_FILTER_ALL,
  PROPERTY_PAGE_SIZES,
  PROPERTY_PAGE_SIZE_DEFAULT,
  type PropertyFilters,
  type PropertyRow,
  filterProperties,
  propertiesCsv,
  propertiesCsvFileName,
  propertyPage,
} from "@/lib/properties";

/** 絞り込みの選択欄。科目・区分を同じ形で並べる。 */
const filterFields = [
  { key: "category", label: "科目", options: realEstateCategories.map((category) => ({ value: category, label: categoryLabels[category] })) },
  { key: "propertyType", label: "土地・建物", options: Object.entries(propertyTypeLabels).map(([value, label]) => ({ value, label })) },
] as const satisfies ReadonlyArray<{ key: keyof PropertyFilters; label: string; options: ReadonlyArray<{ value: string; label: string }> }>;

/** 面積は㎡までの整数・小数をそのまま出す（未入力は「－」）。 */
const areaText = (area: number | null) => area === null ? "－" : `${area.toLocaleString("ja-JP", { maximumFractionDigits: 2 })}㎡`;

/**
 * 全顧客の不動産一覧。現在年度のB/Sにある不動産の明細を横断で見て、
 * 絞り込んだ結果をそのままCSVへ書き出す。顧客ごとの明細を開き直す手間を省くための画面。
 */
export function PropertiesView() {
  const [rows, setRows] = useState<PropertyRow[] | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<PropertyFilters>({ category: PROPERTY_FILTER_ALL, propertyType: PROPERTY_FILTER_ALL });
  const [pageSize, setPageSize] = useState<number>(PROPERTY_PAGE_SIZE_DEFAULT);
  const [page, setPage] = useState(1);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch(`${API_BASE}/properties`, { cache: "no-store" });
        if (!response.ok) throw new Error();
        setRows(await response.json() as PropertyRow[]);
      } catch {
        setRows([]);
        setError("不動産の一覧を読み込めませんでした。画面を更新してください。");
      }
    })();
  }, []);

  const terms = useMemo(() => searchTerms(query), [query]);
  const filtered = useMemo(() => filterProperties(rows ?? [], terms, filters), [rows, terms, filters]);
  const total = useMemo(() => filtered.reduce((sum, row) => sum + row.valueJpy, 0), [filtered]);
  const clientCount = useMemo(() => new Set(filtered.map((row) => row.householdId)).size, [filtered]);
  const narrowed = terms.length > 0 || filters.category !== PROPERTY_FILTER_ALL || filters.propertyType !== PROPERTY_FILTER_ALL;
  // 描画するのはこのページのぶんだけ。全件を並べると行数に比例して表示が遅くなる。
  const paged = useMemo(() => propertyPage(filtered, page, pageSize), [filtered, page, pageSize]);

  // 絞り込んだ結果をそのまま書き出す（画面に出ているものと中身を一致させる）。
  const downloadCsv = () => {
    const url = URL.createObjectURL(new Blob([propertiesCsv(filtered)], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = propertiesCsvFileName();
    link.click();
    URL.revokeObjectURL(url);
  };

  return <>
    <div className="page-heading"><h1>不動産一覧</h1></div>
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
    </div>
    {error ? <p className="backup-message error" role="alert"><AlertTriangle />{error}</p> : null}
    <article className="panel properties-panel">
      <PanelHeader
        title="登録している不動産"
        subtitle="各顧客の現在年度のB/Sにある不動産です"
        action={<div className="position-table-tools" aria-label="不動産一覧の絞り込み">
          {filterFields.map((field) => <label key={field.key}>
            <span>{field.label}</span>
            <select
              value={filters[field.key]}
              onChange={(event) => { setFilters((current) => ({ ...current, [field.key]: event.target.value })); setPage(1); }}
            >
              <option value={PROPERTY_FILTER_ALL}>すべて</option>
              {field.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>)}
          <label>
            <span>表示件数</span>
            <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}>
              {PROPERTY_PAGE_SIZES.map((size) => <option key={size} value={size}>{size}件</option>)}
            </select>
          </label>
        </div>}
      />
      <div className="table-scroll">
        {rows === null ? <p className="properties-loading" role="status"><LoaderCircle className="spin" />読み込み中です…</p> : <table className="properties-table">
          <thead><tr>
            <th>顧客</th><th>科目・区分</th><th>名称・所在地</th><th>地目・用途</th>
            <th className="number">面積</th><th className="number">持分</th><th className="number">評価額</th>
          </tr></thead>
          <tbody>
            {filtered.length === 0
              ? <tr className="properties-empty-row"><td colSpan={7}>{rows.length === 0 ? "不動産の明細はまだ登録されていません。" : "条件に一致する不動産はありません。"}</td></tr>
              : paged.rows.map((row) => <tr key={row.positionId}>
                <td data-label="顧客">
                  <Link className="properties-client-link" href={`/customers/${row.householdId}/positions`}>
                    <strong><Highlighted text={row.clientName} terms={terms} /></strong>
                  </Link>
                  <small><Highlighted text={row.clientCode} terms={terms} />／{row.fiscalYear}年度</small>
                </td>
                <td data-label="科目・区分"><span className="category-tag">{row.categoryLabel}</span>{row.propertyTypeLabel}</td>
                <td data-label="名称・所在地">
                  <strong><Highlighted text={row.name} terms={terms} /></strong>
                  <small><Highlighted text={row.address} terms={terms} /></small>
                </td>
                <td data-label="地目・用途"><Highlighted text={row.useLabel || "－"} terms={terms} /></td>
                <td data-label="面積" className="number">{areaText(row.area)}</td>
                <td data-label="持分" className="number">{row.ownership}</td>
                <td data-label="評価額" className="number">{yen.format(row.valueJpy)}</td>
              </tr>)}
          </tbody>
          <tfoot><tr>
            <th scope="row" colSpan={6}>{narrowed ? "絞り込みの合計" : "合計"}（{filtered.length}件・{clientCount}名）</th>
            <td className="number">{yen.format(total)}</td>
          </tr></tfoot>
        </table>}
      </div>
      {filtered.length === 0 ? null : <nav className="properties-pager" aria-label="不動産一覧のページ切り替え">
        <p>{filtered.length}件中 {paged.from + 1}〜{paged.from + paged.rows.length}件目</p>
        <div>
          <button type="button" className="button secondary" onClick={() => setPage(paged.current - 1)} disabled={paged.current <= 1}>
            <ChevronLeft />前へ
          </button>
          <span aria-live="polite">{paged.current} / {paged.last}ページ</span>
          <button type="button" className="button secondary" onClick={() => setPage(paged.current + 1)} disabled={paged.current >= paged.last}>
            次へ<ChevronRight />
          </button>
        </div>
      </nav>}
    </article>
  </>;
}
