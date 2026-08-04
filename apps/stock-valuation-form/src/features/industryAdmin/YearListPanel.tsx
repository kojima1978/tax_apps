import { Fragment, useMemo, useState } from 'react';
import type { IndustryCategory, IndustryMonthlyPrice, IndustryYear } from '@/data/industryDataset';
import {
  updateIndustryCategory,
  updateIndustryYear,
  updateMonthlyPrice,
  type UpdateCategoryRequest,
  type UpdateMonthlyPriceRequest,
} from './api';
import { MonthlyCoverageBar } from './MonthlyCoverageBar';
import { monthlyCoverageOf, type MonthlyCoverage } from './monthlyCoverage';

const LEVEL_LABELS = { LARGE: '大', MIDDLE: '中', SMALL: '小' } as const;

/** 基礎情報ビューで触れる数値欄。ラベルと桁の扱いをここ1箇所で決める。 */
const NUMERIC_FIELDS = [
  { key: 'dividend', label: 'B 配当', decimal: true },
  { key: 'profit', label: 'C 利益', decimal: false },
  { key: 'netAsset', label: 'D 純資産', decimal: false },
  { key: 'previousYearAveragePrice', label: '前年平均', decimal: false },
] as const;

type NumericField = (typeof NUMERIC_FIELDS)[number]['key'];

// 内容（description）は帳票側で使わないためデータセットに載っていない。ここでも触らない。
type EditValues = Record<'name' | NumericField, string>;

type Message = { kind: 'ok' | 'error'; text: string };

/**
 * 年分ブロックのチップから開く中身。
 * 基礎情報（業種目のB・C・D・前年平均と年分の出典・備考）か、1ヶ月分の株価一覧か。
 */
type DetailView = { kind: 'basic' } | { kind: 'month'; year: number; month: number };

function viewKeyOf(view: DetailView): string {
  return view.kind === 'basic' ? 'basic' : `month-${view.year}-${view.month}`;
}

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

/**
 * 入力欄1つを数値にする。読めなければメッセージ文字列を返す（呼び出し側がそのまま画面に出す）。
 * 空欄を「未公表」として通したい欄は、呼ぶ前に空欄を弾いて null を選ぶこと。
 */
function parseNumericField(text: string, label: string, decimal = false): number | string {
  const trimmed = text.trim();
  if (trimmed === '') return `${label}は空にできません`;

  const pattern = decimal ? /^-?\d+(\.\d+)?$/ : /^-?\d+$/;
  if (!pattern.test(trimmed)) return `${label}が数値として読めません（"${trimmed}"）`;
  return Number(trimmed);
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

    const parsed = parseNumericField(text, field.label, field.decimal);
    if (typeof parsed === 'string') return parsed;
    request[field.key] = parsed;
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

/** 登録済み年分の一覧と、登録状況チップから開く中身の表示・訂正。 */
export function YearListPanel({ years, onUpdated }: Props) {
  // 開いている年分とその中身。チップが唯一の入口なので、両方まとめて1つの state で持つ。
  const [open, setOpen] = useState<{ gregorianYear: number; view: DetailView } | null>(null);

  const coverages = useMemo(
    () => years.map((year) => ({ year, coverage: monthlyCoverageOf(year) })),
    [years],
  );

  /** 同じチップをもう一度押したら閉じる。 */
  const toggle = (gregorianYear: number, view: DetailView) =>
    setOpen((current) =>
      current
        && current.gregorianYear === gregorianYear
        && viewKeyOf(current.view) === viewKeyOf(view)
        ? null
        : { gregorianYear, view },
    );

  const openViewOf = (gregorianYear: number) =>
    open && open.gregorianYear === gregorianYear ? open.view : null;

  return (
    <div className="admin-panel-body">
      <div className="admin-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th>年分</th><th>西暦</th><th>業種目</th><th>月別株価</th><th>最終月</th><th>出典</th><th>備考</th>
            </tr>
          </thead>
          <tbody>
            {years.map((year) => (
              <tr
                key={year.gregorianYear}
                className={open?.gregorianYear === year.gregorianYear ? 'admin-row-open' : undefined}
              >
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
              </tr>
            ))}
            {years.length === 0 && (
              <tr><td colSpan={7}>年分が登録されていません。</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {coverages.map(({ year, coverage }) => {
        const view = openViewOf(year.gregorianYear);
        return (
          <Fragment key={year.gregorianYear}>
            <div className="admin-coverage-block">
              <div className="admin-coverage-head">
                <strong>{year.label} の月別株価</strong>
                <span className="admin-note">
                  {pendingMonthCountOf(coverage) === 0
                    ? '公表レンジの全月がそろっています'
                    : `未登録・取込漏れ ${pendingMonthCountOf(coverage)} か月`
                      + `（次は ${coverage.next.year}年${coverage.next.month}月分）`}
                </span>
                <span className="admin-note">クリックすると中身を表示します</span>
              </div>
              <MonthlyCoverageBar
                coverage={coverage}
                selected={view?.kind === 'month' ? { year: view.year, month: view.month } : undefined}
                onSelect={(priceYear, priceMonth) =>
                  toggle(year.gregorianYear, { kind: 'month', year: priceYear, month: priceMonth })}
                leading={
                  <BasicInfoChip
                    categoryCount={year.categories.length}
                    selected={view?.kind === 'basic'}
                    onSelect={() => toggle(year.gregorianYear, { kind: 'basic' })}
                  />
                }
              />
            </div>

            {view && (
              <YearDetail key={viewKeyOf(view)} year={year} view={view} onUpdated={onUpdated} />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

interface BasicInfoChipProps {
  categoryCount: number;
  selected: boolean;
  onSelect: () => void;
}

/** 月チップの手前に置く、月に紐づかない値（B・C・D・前年平均）への入口。 */
function BasicInfoChip({ categoryCount, selected, onSelect }: BasicInfoChipProps) {
  const className = [
    'admin-chip',
    'admin-chip-basic',
    selected ? 'admin-chip-selected' : '',
  ].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      className={className}
      title="業種目のB（配当）・C（利益）・D（純資産）・前年平均株価と、この年分の出典・備考"
      aria-pressed={selected}
      onClick={onSelect}
    >
      <span className="admin-chip-month">基礎情報</span>
      <span className="admin-chip-count">{categoryCount}業種目</span>
      <span className="admin-chip-sub">B・C・D</span>
    </button>
  );
}

interface YearDetailProps {
  year: IndustryYear;
  view: DetailView;
  onUpdated: () => Promise<void>;
}

/** チップで選んだ中身。絞り込みとメッセージ表示は基礎情報・月で共用する。 */
function YearDetail({ year, view, onUpdated }: YearDetailProps) {
  const [keyword, setKeyword] = useState('');
  const [message, setMessage] = useState<Message | null>(null);

  const filtered = useMemo(() => {
    const needle = keyword.trim();
    if (needle === '') return year.categories;
    return year.categories.filter(
      (category) => category.name.includes(needle) || String(category.number) === needle,
    );
  }, [year.categories, keyword]);

  const title = view.kind === 'basic'
    ? `${year.label} の基礎情報`
    : `${year.label} ${view.year}年${view.month}月分の株価`;

  return (
    <div className="admin-detail">
      <h3 className="admin-detail-title">{title}</h3>

      {view.kind === 'basic' && (
        <YearMetaRow year={year} onUpdated={onUpdated} onMessage={setMessage} />
      )}

      {view.kind === 'month' && (
        <p className="admin-note">
          新しい月の追加や月まとめての差し替えは「月次株価を取り込む」から行ってください。
        </p>
      )}

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
              {view.kind === 'basic'
                ? NUMERIC_FIELDS.map((field) => <th key={field.key}>{field.label}</th>)
                : <><th>株価</th><th>2年平均</th></>}
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((category) => (
              view.kind === 'basic'
                ? (
                  <CategoryRow
                    key={category.number}
                    gregorianYear={year.gregorianYear}
                    category={category}
                    onUpdated={onUpdated}
                    onMessage={setMessage}
                  />
                )
                : (
                  <MonthPriceRow
                    key={category.number}
                    gregorianYear={year.gregorianYear}
                    category={category}
                    target={{ year: view.year, month: view.month }}
                    onUpdated={onUpdated}
                    onMessage={setMessage}
                  />
                )
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface YearMetaRowProps {
  year: IndustryYear;
  onUpdated: () => Promise<void>;
  onMessage: (message: Message) => void;
}

/** 年分そのものに付く情報。月に紐づかないので基礎情報側に置く。 */
function YearMetaRow({ year, onUpdated, onMessage }: YearMetaRowProps) {
  const [sourceUrl, setSourceUrl] = useState(year.sourceUrl ?? '');
  const [note, setNote] = useState(year.note);
  const [saving, setSaving] = useState(false);

  const changed = sourceUrl !== (year.sourceUrl ?? '') || note !== year.note;

  const save = async () => {
    setSaving(true);
    try {
      await updateIndustryYear(year.gregorianYear, {
        sourceUrl: sourceUrl.trim() === '' ? null : sourceUrl.trim(),
        note,
      });
      await onUpdated();
      onMessage({ kind: 'ok', text: '出典・備考を更新しました' });
    } catch (caught) {
      onMessage({ kind: 'error', text: caught instanceof Error ? caught.message : String(caught) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-row">
      <label className="admin-label admin-label-grow">
        出典URL
        <input className="admin-input" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} />
      </label>
      <label className="admin-label admin-label-grow">
        備考
        <input className="admin-input" value={note} onChange={(event) => setNote(event.target.value)} />
      </label>
      <button type="button" className="app-tool-btn" onClick={save} disabled={!changed || saving}>
        {saving ? '保存中…' : '保存'}
      </button>
    </div>
  );
}

interface CategoryRowProps {
  gregorianYear: number;
  category: IndustryCategory;
  onUpdated: () => Promise<void>;
  onMessage: (message: Message) => void;
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

type PriceValues = { price: string; twoYearAveragePrice: string };

/** 変更のあった欄だけを送る。2年平均の空欄は「未公表」として null を送る。 */
function toPriceRequest(
  price: IndustryMonthlyPrice,
  values: PriceValues,
): UpdateMonthlyPriceRequest | string {
  const request: UpdateMonthlyPriceRequest = {};

  const parsedPrice = parseNumericField(values.price, '株価');
  if (typeof parsedPrice === 'string') return parsedPrice;
  if (parsedPrice !== price.price) request.price = parsedPrice;

  const twoYearText = values.twoYearAveragePrice.trim();
  const parsedTwoYear = twoYearText === '' ? null : parseNumericField(twoYearText, '2年平均');
  if (typeof parsedTwoYear === 'string') return parsedTwoYear;
  if (parsedTwoYear !== price.twoYearAveragePrice) request.twoYearAveragePrice = parsedTwoYear;

  if (Object.keys(request).length === 0) return '変更がありません';
  return request;
}

interface MonthPriceRowProps {
  gregorianYear: number;
  category: IndustryCategory;
  target: { year: number; month: number };
  onUpdated: () => Promise<void>;
  onMessage: (message: Message) => void;
}

/** 業種目1件のうち、選んだ月の株価だけを出す行。行が無い業種目も取込漏れとして並べる。 */
function MonthPriceRow({ gregorianYear, category, target, onUpdated, onMessage }: MonthPriceRowProps) {
  const price = category.monthlyPrices.find(
    (candidate) => candidate.year === target.year && candidate.month === target.month,
  );
  const [values, setValues] = useState<PriceValues | null>(null);
  const [saving, setSaving] = useState(false);

  const head = (
    <>
      <td>{category.number}</td>
      <td>{LEVEL_LABELS[category.level]}</td>
      <td>{category.name}</td>
    </>
  );

  if (!price) {
    return (
      <tr>
        {head}
        <td className="admin-before">未登録</td>
        <td className="admin-before">—</td>
        <td className="admin-before">「月次株価を取り込む」から追加</td>
      </tr>
    );
  }

  const label = `${price.year}年${price.month}月分`;

  const save = async () => {
    if (!values) return;
    const request = toPriceRequest(price, values);
    if (typeof request === 'string') {
      onMessage({ kind: 'error', text: `${category.number} の${label}: ${request}` });
      return;
    }

    setSaving(true);
    try {
      await updateMonthlyPrice(gregorianYear, category.number, price.year, price.month, request);
      await onUpdated();
      onMessage({ kind: 'ok', text: `${category.number} ${category.name} の${label}を更新しました` });
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
        {head}
        <td>{price.price}</td>
        <td>{price.twoYearAveragePrice ?? '—'}</td>
        <td>
          <button
            type="button"
            className="app-tool-btn"
            onClick={() => setValues({
              price: String(price.price),
              twoYearAveragePrice:
                price.twoYearAveragePrice === null ? '' : String(price.twoYearAveragePrice),
            })}
          >
            訂正
          </button>
        </td>
      </tr>
    );
  }

  const update = (key: keyof PriceValues, value: string) =>
    setValues((current) => (current ? { ...current, [key]: value } : current));

  return (
    <tr className="admin-row-editing">
      {head}
      <td>
        <input
          className="admin-input admin-input-narrow"
          value={values.price}
          onChange={(event) => update('price', event.target.value)}
          inputMode="numeric"
        />
      </td>
      <td>
        <input
          className="admin-input admin-input-narrow"
          value={values.twoYearAveragePrice}
          onChange={(event) => update('twoYearAveragePrice', event.target.value)}
          inputMode="numeric"
          placeholder="未公表"
        />
      </td>
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
