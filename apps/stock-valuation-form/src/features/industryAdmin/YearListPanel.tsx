import { useMemo, useState } from 'react';
import type { IndustryCategory, IndustryYear } from '@/data/industryDataset';
import { updateIndustryCategory, updateIndustryYear, type UpdateCategoryRequest } from './api';
import { MonthlyCoverageBar } from './MonthlyCoverageBar';
import { monthlyCoverageOf, type MonthlyCoverage } from './monthlyCoverage';

const LEVEL_LABELS = { LARGE: '大', MIDDLE: '中', SMALL: '小' } as const;

/** 個別訂正で触れる数値欄。ラベルと桁の扱いをここ1箇所で決める。 */
const NUMERIC_FIELDS = [
  { key: 'dividend', label: 'B 配当', decimal: true },
  { key: 'profit', label: 'C 利益', decimal: false },
  { key: 'netAsset', label: 'D 純資産', decimal: false },
  { key: 'previousYearAveragePrice', label: '前年平均', decimal: false },
] as const;

type NumericField = (typeof NUMERIC_FIELDS)[number]['key'];

// 内容（description）は帳票側で使わないためデータセットに載っていない。ここでも触らない。
type EditValues = Record<'name' | NumericField, string>;

function toEditValues(category: IndustryCategory): EditValues {
  return {
    name: category.name,
    dividend: category.dividend === null ? '' : String(category.dividend),
    profit: category.profit === null ? '' : String(category.profit),
    netAsset: category.netAsset === null ? '' : String(category.netAsset),
    previousYearAveragePrice:
      category.previousYearAveragePrice === null ? '' : String(category.previousYearAveragePrice),
  };
}

/** 変更のあった欄だけを送る。空欄は「触っていない」ではなく不正入力として弾く。 */
function toUpdateRequest(
  category: IndustryCategory,
  values: EditValues,
): UpdateCategoryRequest | string {
  const request: UpdateCategoryRequest = {};

  if (values.name.trim() === '') return '業種目名は空にできません';
  if (values.name !== category.name) request.name = values.name.trim();

  for (const field of NUMERIC_FIELDS) {
    const text = values[field.key].trim();
    const current = category[field.key];
    if (text === (current === null ? '' : String(current))) continue;

    const pattern = field.decimal ? /^-?\d+(\.\d+)?$/ : /^-?\d+$/;
    if (!pattern.test(text)) return `${field.label}が数値として読めません（"${text}"）`;
    request[field.key] = Number(text);
  }

  if (Object.keys(request).length === 0) return '変更がありません';
  return request;
}

/** 月別株価がどこまで入っているか。取込漏れの月を一覧で気付けるようにする。 */
function latestMonthOf(year: IndustryYear): string {
  let latest: { year: number; month: number } | null = null;
  for (const category of year.categories) {
    for (const price of category.monthlyPrices) {
      if (!latest || price.year > latest.year || (price.year === latest.year && price.month > latest.month)) {
        latest = { year: price.year, month: price.month };
      }
    }
  }
  return latest ? `${latest.year}年${latest.month}月分` : '未登録';
}

function monthlyPriceCountOf(year: IndustryYear): number {
  return year.categories.reduce((total, category) => total + category.monthlyPrices.length, 0);
}

/** 公表レンジのうち、全業種目そろっていない月の数。 */
function pendingMonthCountOf(coverage: MonthlyCoverage): number {
  return coverage.months.filter((month) => !month.outOfRange && month.status !== 'full').length;
}

interface Props {
  years: readonly IndustryYear[];
  onUpdated: () => Promise<void>;
}

/** 登録済み年分の一覧と、行を開いての個別訂正。 */
export function YearListPanel({ years, onUpdated }: Props) {
  const [openYear, setOpenYear] = useState<number | null>(null);
  const selected = years.find((year) => year.gregorianYear === openYear);

  const coverages = useMemo(
    () => years.map((year) => ({ year, coverage: monthlyCoverageOf(year) })),
    [years],
  );

  return (
    <div className="admin-panel-body">
      <div className="admin-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th>年分</th><th>西暦</th><th>業種目</th><th>月別株価</th><th>最終月</th><th>出典</th><th>備考</th><th />
            </tr>
          </thead>
          <tbody>
            {years.map((year) => (
              <tr key={year.gregorianYear} className={year.gregorianYear === openYear ? 'admin-row-open' : undefined}>
                <td>{year.label}</td>
                <td>{year.gregorianYear}</td>
                <td>{year.categories.length} 件</td>
                <td>{monthlyPriceCountOf(year)} 件</td>
                <td>{latestMonthOf(year)}</td>
                <td className="admin-cell-url">
                  {year.sourceUrl
                    ? <a href={year.sourceUrl} target="_blank" rel="noreferrer">公表資料</a>
                    : '—'}
                </td>
                <td>{year.note || '—'}</td>
                <td>
                  <button
                    type="button"
                    className="app-tool-btn"
                    onClick={() => setOpenYear(year.gregorianYear === openYear ? null : year.gregorianYear)}
                  >
                    {year.gregorianYear === openYear ? '閉じる' : '個別訂正'}
                  </button>
                </td>
              </tr>
            ))}
            {years.length === 0 && (
              <tr><td colSpan={8}>年分が登録されていません。</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {coverages.map(({ year, coverage }) => (
        <div key={year.gregorianYear} className="admin-coverage-block">
          <div className="admin-coverage-head">
            <strong>{year.label} の月別株価</strong>
            <span className="admin-note">
              {pendingMonthCountOf(coverage) === 0
                ? '公表レンジの全月がそろっています'
                : `未登録・取込漏れ ${pendingMonthCountOf(coverage)} か月`
                  + `（次は ${coverage.next.year}年${coverage.next.month}月分）`}
            </span>
          </div>
          <MonthlyCoverageBar coverage={coverage} />
        </div>
      ))}

      {selected && <YearDetail key={selected.gregorianYear} year={selected} onUpdated={onUpdated} />}
    </div>
  );
}

function YearDetail({ year, onUpdated }: { year: IndustryYear; onUpdated: () => Promise<void> }) {
  const [keyword, setKeyword] = useState('');
  const [sourceUrl, setSourceUrl] = useState(year.sourceUrl ?? '');
  const [note, setNote] = useState(year.note);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [savingMeta, setSavingMeta] = useState(false);

  const filtered = useMemo(() => {
    const needle = keyword.trim();
    if (needle === '') return year.categories;
    return year.categories.filter(
      (category) => category.name.includes(needle) || String(category.number) === needle,
    );
  }, [year.categories, keyword]);

  const metaChanged = sourceUrl !== (year.sourceUrl ?? '') || note !== year.note;

  const saveMeta = async () => {
    setSavingMeta(true);
    setMessage(null);
    try {
      await updateIndustryYear(year.gregorianYear, {
        sourceUrl: sourceUrl.trim() === '' ? null : sourceUrl.trim(),
        note,
      });
      await onUpdated();
      setMessage({ kind: 'ok', text: '出典・備考を更新しました' });
    } catch (caught) {
      setMessage({ kind: 'error', text: caught instanceof Error ? caught.message : String(caught) });
    } finally {
      setSavingMeta(false);
    }
  };

  return (
    <div className="admin-detail">
      <h3 className="admin-detail-title">{year.label} の個別訂正</h3>

      <div className="admin-row">
        <label className="admin-label admin-label-grow">
          出典URL
          <input className="admin-input" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} />
        </label>
        <label className="admin-label admin-label-grow">
          備考
          <input className="admin-input" value={note} onChange={(event) => setNote(event.target.value)} />
        </label>
        <button
          type="button"
          className="app-tool-btn"
          onClick={saveMeta}
          disabled={!metaChanged || savingMeta}
        >
          {savingMeta ? '保存中…' : '保存'}
        </button>
      </div>

      <div className="admin-row">
        <label className="admin-label admin-label-grow">
          業種目を絞り込む
          <input
            className="admin-input"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="業種目名または番号"
          />
        </label>
        <span className="admin-note">{filtered.length} / {year.categories.length} 件</span>
      </div>

      {message && (
        <div className={message.kind === 'ok' ? 'admin-alert admin-alert-ok' : 'admin-alert admin-alert-error'}>
          {message.text}
        </div>
      )}

      <div className="admin-scroll admin-scroll-tall">
        <table className="admin-table">
          <thead>
            <tr>
              <th>番号</th><th>階層</th><th>業種目</th>
              {NUMERIC_FIELDS.map((field) => <th key={field.key}>{field.label}</th>)}
              <th>月別株価</th><th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((category) => (
              <CategoryRow
                key={category.number}
                gregorianYear={year.gregorianYear}
                category={category}
                onUpdated={onUpdated}
                onMessage={setMessage}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface CategoryRowProps {
  gregorianYear: number;
  category: IndustryCategory;
  onUpdated: () => Promise<void>;
  onMessage: (message: { kind: 'ok' | 'error'; text: string }) => void;
}

function CategoryRow({ gregorianYear, category, onUpdated, onMessage }: CategoryRowProps) {
  const [values, setValues] = useState<EditValues | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!values) return;
    const request = toUpdateRequest(category, values);
    if (typeof request === 'string') {
      onMessage({ kind: 'error', text: `${category.number} ${category.name}: ${request}` });
      return;
    }

    setSaving(true);
    try {
      await updateIndustryCategory(gregorianYear, category.number, request);
      await onUpdated();
      onMessage({ kind: 'ok', text: `${category.number} ${category.name} を更新しました` });
      setValues(null);
    } catch (caught) {
      onMessage({ kind: 'error', text: caught instanceof Error ? caught.message : String(caught) });
    } finally {
      setSaving(false);
    }
  };

  if (!values) {
    return (
      <tr>
        <td>{category.number}</td>
        <td>{LEVEL_LABELS[category.level]}</td>
        <td>{category.name}</td>
        {NUMERIC_FIELDS.map((field) => (
          <td key={field.key}>{category[field.key] ?? '—'}</td>
        ))}
        <td>{category.monthlyPrices.length} 月分</td>
        <td>
          <button type="button" className="app-tool-btn" onClick={() => setValues(toEditValues(category))}>
            訂正
          </button>
        </td>
      </tr>
    );
  }

  const update = (key: keyof EditValues, value: string) =>
    setValues((current) => (current ? { ...current, [key]: value } : current));

  return (
    <tr className="admin-row-editing">
      <td>{category.number}</td>
      <td>{LEVEL_LABELS[category.level]}</td>
      <td>
        <input className="admin-input" value={values.name} onChange={(event) => update('name', event.target.value)} />
      </td>
      {NUMERIC_FIELDS.map((field) => (
        <td key={field.key}>
          <input
            className="admin-input admin-input-narrow"
            value={values[field.key]}
            onChange={(event) => update(field.key, event.target.value)}
            inputMode="decimal"
          />
        </td>
      ))}
      <td>{category.monthlyPrices.length} 月分</td>
      <td className="admin-cell-actions">
        <button type="button" className="app-tool-btn admin-btn-primary" onClick={save} disabled={saving}>
          {saving ? '保存中…' : '保存'}
        </button>
        <button type="button" className="app-tool-btn" onClick={() => setValues(null)} disabled={saving}>
          取消
        </button>
      </td>
    </tr>
  );
}
