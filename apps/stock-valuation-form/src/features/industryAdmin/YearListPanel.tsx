import { Fragment, useMemo, useState } from 'react';
import type { IndustryCategory, IndustryYear } from '@/data/industryDataset';
import { updateIndustryCategory, type UpdateCategoryRequest } from './api';
import { CategoryFilterRow, useCategoryFilter } from './CategoryFilter';
import { LEVEL_LABELS } from './labels';
import { MonthEditor } from './MonthEditor';
import { CHIP_STATUS_CLASS, MonthlyCoverageBar, chipCountText } from './MonthlyCoverageBar';
import { monthlyCoverageOf, statusOf, type MonthlyCoverage } from './monthlyCoverage';

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
 * 基礎情報（業種目のB・C・D・前年平均）か、1ヶ月分の株価一覧か。
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

/** 基礎情報（B・C・D・前年平均）が欠けなくそろっている業種目の数。 */
function basicInfoCountOf(year: IndustryYear): number {
  return year.categories.filter(
    (category) => NUMERIC_FIELDS.every((field) => category[field.key] !== null),
  ).length;
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
        <table className="admin-table admin-table-fit">
          <thead>
            <tr>
              <th>年分</th><th>西暦</th><th>業種目</th><th>月別株価</th><th>最終月</th>
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
              </tr>
            ))}
            {years.length === 0 && (
              <tr><td colSpan={5}>年分が登録されていません。</td></tr>
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
                    count={basicInfoCountOf(year)}
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
  count: number;
  categoryCount: number;
  selected: boolean;
  onSelect: () => void;
}

/**
 * 月チップの手前に置く、月に紐づかない値（B・C・D・前年平均）への入口。
 * 色と件数の出し方は月チップと揃える（そろっていれば緑、欠けていれば黄）。
 */
function BasicInfoChip({ count, categoryCount, selected, onSelect }: BasicInfoChipProps) {
  const status = statusOf(count, categoryCount);
  const className = [
    'admin-chip',
    'admin-chip-basic',
    CHIP_STATUS_CLASS[status],
    selected ? 'admin-chip-selected' : '',
  ].filter(Boolean).join(' ');

  const title = 'B（配当）・C（利益）・D（純資産）・前年平均株価'
    + ` / ${status === 'none' ? '未登録' : `4項目そろっている業種目 ${count} / ${categoryCount}`}`;

  return (
    <button type="button" className={className} title={title} aria-pressed={selected} onClick={onSelect}>
      <span className="admin-chip-month">基礎情報</span>
      <span className="admin-chip-count">{chipCountText(status, count, categoryCount)}</span>
      <span className="admin-chip-sub">B・C・D</span>
    </button>
  );
}

interface YearDetailProps {
  year: IndustryYear;
  view: DetailView;
  onUpdated: () => Promise<void>;
}

/** チップで選んだ中身。基礎情報はこの場で訂正、月別株価は MonthEditor に任せる。 */
function YearDetail({ year, view, onUpdated }: YearDetailProps) {
  const title = view.kind === 'basic'
    ? `${year.label} の基礎情報`
    : `${year.label} ${view.year}年${view.month}月分の株価`;

  return (
    <div className="admin-detail">
      <h3 className="admin-detail-title">{title}</h3>

      {view.kind === 'basic'
        ? <BasicInfoEditor year={year} onUpdated={onUpdated} />
        : (
          <MonthEditor
            year={year}
            target={{ year: view.year, month: view.month }}
            onUpdated={onUpdated}
          />
        )}
    </div>
  );
}

/** 月に紐づかない値（業種目のB・C・D・前年平均）の訂正。 */
function BasicInfoEditor({ year, onUpdated }: { year: IndustryYear; onUpdated: () => Promise<void> }) {
  const [message, setMessage] = useState<Message | null>(null);
  const filter = useCategoryFilter(year.categories);

  return (
    <>
      <CategoryFilterRow
        keyword={filter.keyword}
        onChange={filter.setKeyword}
        shown={filter.filtered.length}
        total={year.categories.length}
      />

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
              {NUMERIC_FIELDS.map((field) => (
                <th key={field.key} className="admin-num">{field.label}</th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {filter.filtered.map((category) => (
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
    </>
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
          <td key={field.key} className="admin-num">{category[field.key] ?? '—'}</td>
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
        <td key={field.key} className="admin-num">
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

