import { useMemo, useState } from 'react';
import type { IndustryYear } from '@/data/industryDataset';
import { importMonthlyPrices } from './api';
import { PasteTableEditor } from './PasteTableEditor';
import {
  extractMonthlyPriceRows,
  previewMonthlyPrices,
  MONTHLY_PRICE_FIELDS,
  type MonthlyPriceField,
} from './parsePastedTable';
import { usePastedTable } from './usePastedTable';

const PLACEHOLDER = `国税庁の「業種目別株価等」の表をコピーして貼り付けてください。
例（タブ区切り）:
1\t763\t579
2\t812\t604`;

const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);

const STATUS_LABELS = { new: '新規', changed: '変更', same: '据置' } as const;

interface Props {
  years: readonly IndustryYear[];
  onImported: () => Promise<void>;
}

/** 差分の1セル。値が変わる欄だけ「登録済み → 取込後」を出す（変わらない欄に矢印を出さない）。 */
function DiffValue({ before, after }: { before?: number | null; after: number | null }) {
  return (
    <>
      {before !== undefined && before !== after && (
        <span className="admin-before">{before ?? '—'} → </span>
      )}
      {after ?? '—'}
    </>
  );
}

/** 月次株価の一括取込。年分と対象年月を選び、貼り付け→差分確認→登録の順に進む。 */
export function MonthlyPriceImportPanel({ years, onImported }: Props) {
  const [gregorianYear, setGregorianYear] = useState(() => years[0]?.gregorianYear ?? 0);
  const year = years.find((candidate) => candidate.gregorianYear === gregorianYear) ?? years[0];

  const [priceYear, setPriceYear] = useState(() => years[0]?.gregorianYear ?? 0);
  const [priceMonth, setPriceMonth] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const paste = usePastedTable<MonthlyPriceField>(MONTHLY_PRICE_FIELDS);

  const extracted = useMemo(
    () => extractMonthlyPriceRows(paste.table, paste.assignment),
    [paste.table, paste.assignment],
  );
  const preview = useMemo(
    () => previewMonthlyPrices(extracted.rows, year, priceYear, priceMonth),
    [extracted.rows, year, priceYear, priceMonth],
  );

  // 公表は前年11月・12月分も含むため、年分の年とその前年を選べるようにする。
  const priceYearOptions = useMemo(() => {
    if (!year) return [];
    const label = (offset: number) => {
      const eraYear = year.eraYear - offset;
      const gregorian = year.gregorianYear - offset;
      // 元号をまたぐ前年（令和元年分の前年など）は西暦だけで示す。
      return eraYear >= 1
        ? { value: gregorian, label: `${year.era}${eraYear}年（${gregorian}）` }
        : { value: gregorian, label: `${gregorian}年` };
    };
    return [label(1), label(0)];
  }, [year]);

  const blocked = extracted.errors.length > 0 || preview.unknownNumbers.length > 0;
  const canSubmit = year !== undefined && preview.diffs.length > 0 && !blocked && !submitting;

  const handleSubmit = async () => {
    if (!year) return;
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const response = await importMonthlyPrices(year.gregorianYear, {
        year: priceYear,
        month: priceMonth,
        rows: preview.diffs.map((diff) => ({
          number: diff.number,
          price: diff.after.price,
          twoYearAveragePrice: diff.after.twoYearAveragePrice,
        })),
      });
      await onImported();
      setResult(
        `${response.year.label}に${response.priceYear}年${response.priceMonth}月分を取り込みました`
          + `（新規 ${response.created} 件 / 更新 ${response.updated} 件）`,
      );
      paste.clear();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setSubmitting(false);
    }
  };

  if (!year) {
    return <p className="admin-note">年分が登録されていないため取り込めません。先に年分を追加してください。</p>;
  }

  return (
    <div className="admin-panel-body">
      <div className="admin-row">
        <label className="admin-label">
          取込先の年分
          <select
            className="admin-select"
            value={gregorianYear}
            onChange={(event) => {
              const next = Number(event.target.value);
              setGregorianYear(next);
              setPriceYear(next);
            }}
          >
            {years.map((candidate) => (
              <option key={candidate.gregorianYear} value={candidate.gregorianYear}>
                {candidate.label}
              </option>
            ))}
          </select>
        </label>

        <label className="admin-label">
          対象年
          <select
            className="admin-select"
            value={priceYear}
            onChange={(event) => setPriceYear(Number(event.target.value))}
          >
            {priceYearOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label className="admin-label">
          対象月
          <select
            className="admin-select"
            value={priceMonth}
            onChange={(event) => setPriceMonth(Number(event.target.value))}
          >
            {MONTHS.map((month) => (
              <option key={month} value={month}>{month}月</option>
            ))}
          </select>
        </label>
      </div>

      <PasteTableEditor state={paste} fields={MONTHLY_PRICE_FIELDS} placeholder={PLACEHOLDER} />

      {/* 貼り付ける前は「列が未割当」等の警告を出しても仕方がないので、本文が入ってから見せる。 */}
      {paste.table.rows.length > 0 && (
        <div className="admin-preview">
          <div className="admin-summary">
            <span>読み取り {extracted.rows.length} 行</span>
            <span className="admin-badge admin-badge-new">新規 {preview.diffs.filter((d) => d.status === 'new').length}</span>
            <span className="admin-badge admin-badge-changed">変更 {preview.diffs.filter((d) => d.status === 'changed').length}</span>
            <span className="admin-badge">据置 {preview.diffs.filter((d) => d.status === 'same').length}</span>
            {extracted.skipped.length > 0 && <span className="admin-note">見出し等の読み飛ばし {extracted.skipped.length} 行</span>}
          </div>

          {extracted.errors.length > 0 && (
            <div className="admin-alert admin-alert-error">
              <strong>取り込めない行があります（{extracted.errors.length}件）</strong>
              <ul>
                {extracted.errors.slice(0, 10).map((issue) => (
                  <li key={`${issue.line}-${issue.reason}`}>
                    {issue.line > 0 ? `${issue.line}行目: ` : ''}{issue.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {preview.unknownNumbers.length > 0 && (
            <div className="admin-alert admin-alert-error">
              {year.label}に存在しない業種目番号が含まれています（
              {preview.unknownNumbers.slice(0, 20).join(', ')}
              {preview.unknownNumbers.length > 20 ? ` ほか${preview.unknownNumbers.length - 20}件` : ''}
              ）。取込先の年分が正しいか確認してください。
            </div>
          )}

          {preview.missingNumbers.length > 0 && (
            <div className="admin-alert admin-alert-warn">
              貼り付けに含まれていない業種目番号があります（
              {preview.missingNumbers.slice(0, 20).join(', ')}
              {preview.missingNumbers.length > 20 ? ` ほか${preview.missingNumbers.length - 20}件` : ''}
              ）。このまま取り込むと、その業種目の{priceMonth}月分は未公表のままになります。
            </div>
          )}

          {preview.diffs.length > 0 && (
            <div className="admin-scroll admin-scroll-tall">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>番号</th><th>業種目</th><th>状態</th><th>株価</th><th>2年平均</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.diffs.map((diff) => (
                    <tr key={diff.number} className={diff.status === 'same' ? 'admin-row-muted' : undefined}>
                      <td>{diff.number}</td>
                      <td>{diff.name}</td>
                      <td>{STATUS_LABELS[diff.status]}</td>
                      <td><DiffValue before={diff.before?.price} after={diff.after.price} /></td>
                      <td>
                        <DiffValue
                          before={diff.before?.twoYearAveragePrice}
                          after={diff.after.twoYearAveragePrice}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {error && <div className="admin-alert admin-alert-error">{error}</div>}
      {result && <div className="admin-alert admin-alert-ok">{result}</div>}

      <div className="admin-actions">
        <button type="button" className="app-tool-btn" onClick={paste.clear}>貼り付けをクリア</button>
        <button type="button" className="app-tool-btn admin-btn-primary" onClick={handleSubmit} disabled={!canSubmit}>
          {submitting ? '取込中…' : `${priceYear}年${priceMonth}月分として取り込む`}
        </button>
      </div>
    </div>
  );
}
