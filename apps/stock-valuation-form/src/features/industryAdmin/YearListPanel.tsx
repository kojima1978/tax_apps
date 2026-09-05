import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import type { IndustryCategory, IndustryYear } from '@/data/industryDataset';
import { AdminAlert } from './AdminAlert';
import { fetchIndustryCategories, updateIndustryCategory, type UpdateCategoryRequest } from './api';
import { CategoryFilterRow, useCategoryFilter, type CategoryStatusFilter } from './CategoryFilter';
import { LEVEL_LABELS } from './labels';
import { MonthEditor } from './MonthEditor';
import { CHIP_STATUS_CLASS, ChipStatusCount, MonthlyCoverageBar } from './MonthlyCoverageBar';
import { monthlyCoverageOf, statusOf, type MonthlyCoverage } from './monthlyCoverage';

/** 基礎情報ビューで触れる数値欄。ラベルと桁の扱いをここ1箇所で決める。 */
const NUMERIC_FIELDS = [
  { key: 'dividend', label: 'B 配当', decimal: true },
  { key: 'profit', label: 'C 利益', decimal: false },
  { key: 'netAsset', label: 'D 純資産', decimal: false },
  { key: 'previousYearAveragePrice', label: '前年平均', decimal: false },
] as const;

type NumericField = (typeof NUMERIC_FIELDS)[number]['key'];

/**
 * 内容（description）は帳票で使わないためデータセットには載っていない。
 * 管理画面だけが必要とするので `/industry-categories` から別に取ってきて、ここに混ぜる。
 */
type EditValues = Record<'name' | 'description' | NumericField, string>;

type Message = { kind: 'ok' | 'error'; text: string };

/** 基礎情報の絞り込み。115件のうち「まだ埋まっていない行」へ直接飛べるようにする。 */
const BASIC_STATUS_FILTERS: readonly CategoryStatusFilter[] = [
  {
    id: 'missing-bcd',
    label: 'B・C・D欠け',
    match: (category) =>
      category.dividend === null || category.profit === null || category.netAsset === null,
  },
  {
    id: 'missing-previous',
    label: '前年平均なし',
    match: (category) => category.previousYearAveragePrice === null,
  },
];

/**
 * 年分ブロックのチップから開く中身。
 * 基礎情報（業種目のB・C・D・前年平均）か、1ヶ月分の株価一覧か。
 */
type DetailView = { kind: 'basic' } | { kind: 'month'; year: number; month: number };

function viewKeyOf(view: DetailView): string {
  return view.kind === 'basic' ? 'basic' : `month-${view.year}-${view.month}`;
}

function toEditValues(category: IndustryCategory, description: string | null): EditValues {
  return {
    name: category.name,
    description: description ?? '',
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

/**
 * 変更のあった欄だけを送る。空欄は「触っていない」ではなく不正入力として弾く。
 * `description` は未取得（null）なら送らない。取れていないものを空欄で上書きしないため。
 */
function toUpdateRequest(
  category: IndustryCategory,
  values: EditValues,
  description: string | null,
): UpdateCategoryRequest | string {
  const request: UpdateCategoryRequest = {};

  if (values.name.trim() === '') return '業種目名は空にできません';
  if (values.name !== category.name) request.name = values.name.trim();

  if (description !== null && values.description.trim() !== description.trim()) {
    request.description = values.description.trim();
  }

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
  /** 開いた状態で見せたい年分（西暦）。新規追加の直後にそこへ連れて行くために使う。 */
  focusYear?: number;
}

/** 登録済み年分の一覧と、登録状況チップから開く中身の表示・訂正。 */
export function YearListPanel({ years, onUpdated, focusYear }: Props) {
  // 開いている年分とその中身。チップが唯一の入口なので、両方まとめて1つの state で持つ。
  const [open, setOpen] = useState<{ gregorianYear: number; view: DetailView } | null>(null);
  /*
   * 年分ブロックの開閉。触るまでは null で、既定（最新の年分だけ開く）に従う。
   *
   * 年分が増えるほどチップの列が縦に伸びて、作業対象の年分にたどり着くまでが遠くなる。
   * 普段いじるのは最新の年分なので、そこだけ開いた状態から始める。
   */
  const [expandedRaw, setExpandedRaw] = useState<ReadonlySet<number> | null>(null);

  const coverages = useMemo(
    () => years.map((year) => ({ year, coverage: monthlyCoverageOf(year) })),
    [years],
  );

  const defaultExpanded = useMemo(
    () => new Set(years.slice(0, 1).map((year) => year.gregorianYear)),
    [years],
  );
  const expanded = expandedRaw ?? defaultExpanded;

  // 指定された年分は開いて、そこまで画面を送る。年分が増えても迷子にならないように。
  const focusRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focusYear === undefined) return;
    setExpandedRaw((current) => {
      const base = current ?? defaultExpanded;
      if (base.has(focusYear)) return current;
      const next = new Set(base);
      next.add(focusYear);
      return next;
    });
    // jsdom には scrollIntoView が無い。表示だけの都合なので、無ければ何もしない。
    focusRef.current?.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
  }, [focusYear, defaultExpanded]);

  const toggleYear = (gregorianYear: number) => {
    const collapsing = expanded.has(gregorianYear);
    const next = new Set(expanded);
    if (collapsing) next.delete(gregorianYear);
    else next.add(gregorianYear);
    setExpandedRaw(next);

    // 畳んだ年分の中身は閉じる。見えない場所で編集中のまま残さない。
    if (collapsing) setOpen((current) => (current?.gregorianYear === gregorianYear ? null : current));
  };

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

  if (years.length === 0) {
    return (
      <div className="admin-panel-body">
        <div className="admin-note">年分が登録されていません。「年分を新規追加」から登録してください。</div>
      </div>
    );
  }

  return (
    <div className="admin-panel-body">
      {coverages.map(({ year, coverage }) => {
        const isExpanded = expanded.has(year.gregorianYear);
        const view = isExpanded ? openViewOf(year.gregorianYear) : null;
        const pending = pendingMonthCountOf(coverage);

        return (
          <Fragment key={year.gregorianYear}>
            <div
              className="admin-coverage-block"
              ref={year.gregorianYear === focusYear ? focusRef : undefined}
            >
              {/*
                年分の件数を上の表とチップ列の2箇所に出していたので、同じ数字を見比べる手間があった。
                見出し1行にまとめて、そこが年分の開閉も兼ねる。
              */}
              <button
                type="button"
                className="admin-year-head"
                aria-expanded={isExpanded}
                onClick={() => toggleYear(year.gregorianYear)}
              >
                <span className="admin-year-toggle" aria-hidden="true">{isExpanded ? '▼' : '▶'}</span>
                <strong className="admin-year-label">{year.label}</strong>
                <span className="admin-note">{year.gregorianYear}年</span>
                <span className="admin-year-facts">
                  <span className="admin-badge">業種目 {year.categories.length} 件</span>
                  <span className="admin-badge">月別株価 {monthlyPriceCountOf(year)} 件</span>
                  <span className="admin-badge">最終 {latestMonthOf(year)}</span>
                  {/*
                    「次はどこを取り込むか」は開いたときだけ別行に出していたが、同じことを
                    言う行が2つ並ぶことになる。バッジ側に畳むと行が1つ消えるうえ、
                    畳んだままの年分でも次の月が見える。
                  */}
                  {pending === 0
                    ? <span className="admin-badge admin-badge-new">公表レンジの全月そろい</span>
                    : (
                      <span className="admin-badge admin-badge-changed">
                        未登録・取込漏れ {pending} か月／次は {coverage.next.year}年{coverage.next.month}月分
                      </span>
                    )}
                </span>
              </button>

              {isExpanded && (
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
              )}
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
    CHIP_STATUS_CLASS[status],
    selected ? 'admin-chip-selected' : '',
  ].filter(Boolean).join(' ');

  const title = 'B（配当）・C（利益）・D（純資産）・前年平均株価'
    + ` / ${status === 'none' ? '未登録' : `4項目そろっている業種目 ${count} / ${categoryCount}`}`;

  return (
    /*
      3行目に「B・C・D」を出していたが、title に同じ内容がより詳しく入っている。
      月チップ側が3行目を常用しなくなったので、ここだけ3行あると列全体が
      1行ぶん高いままになる。落として高さを揃える。
    */
    <button type="button" className={className} title={title} aria-pressed={selected} onClick={onSelect}>
      <span className="admin-chip-month">基礎情報</span>
      <ChipStatusCount status={status} count={count} total={categoryCount} />
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

/** 月に紐づかない値（業種目のB・C・D・前年平均・内容）の訂正。 */
function BasicInfoEditor({ year, onUpdated }: { year: IndustryYear; onUpdated: () => Promise<void> }) {
  const [message, setMessage] = useState<Message | null>(null);
  /*
   * 内容説明。データセット（`/industry-dataset`）は帳票用で description を落としているので、
   * この画面を開いたときだけ `/industry-categories` から取り直す。null は未取得。
   */
  const [descriptions, setDescriptions] = useState<ReadonlyMap<number, string> | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);

  const filter = useCategoryFilter(year.categories, BASIC_STATUS_FILTERS);

  useEffect(() => {
    let alive = true;
    setDescriptions(null);
    setDescriptionError(null);

    fetchIndustryCategories(year.gregorianYear)
      .then((categories) => {
        if (alive) setDescriptions(new Map(categories.map((c) => [c.number, c.description])));
      })
      .catch((caught) => {
        if (alive) setDescriptionError(caught instanceof Error ? caught.message : String(caught));
      });

    return () => { alive = false; };
  }, [year.gregorianYear]);

  // 保存できた内容はその場で手元にも反映する（データセットの再取得には載ってこないため）。
  const rememberDescription = useCallback((number: number, description: string) => {
    setDescriptions((current) => {
      if (!current) return current;
      const next = new Map(current);
      next.set(number, description);
      return next;
    });
  }, []);

  return (
    <>
      <CategoryFilterRow filter={filter} total={year.categories.length} />

      {descriptionError && (
        <AdminAlert kind="warn" scrollKey={descriptionError}>
          内容説明を読み込めませんでした（{descriptionError}）。B・C・Dの訂正はこのまま行えます。
        </AdminAlert>
      )}

      {message && (
        <AdminAlert kind={message.kind} scrollKey={message.text}>{message.text}</AdminAlert>
      )}

      <div className="admin-scroll admin-scroll-tall">
        <table className="admin-table">
          <thead>
            <tr>
              <th>番号</th><th>階層</th><th>業種目</th><th>内容</th>
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
                description={descriptions?.get(category.number) ?? null}
                onUpdated={onUpdated}
                onMessage={setMessage}
                onDescriptionSaved={rememberDescription}
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
  /** 内容説明。null は未取得（この行では触らせない）。 */
  description: string | null;
  onUpdated: () => Promise<void>;
  onMessage: (message: Message) => void;
  onDescriptionSaved: (number: number, description: string) => void;
}

function CategoryRow({
  gregorianYear,
  category,
  description,
  onUpdated,
  onMessage,
  onDescriptionSaved,
}: CategoryRowProps) {
  const [values, setValues] = useState<EditValues | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!values) return;
    const request = toUpdateRequest(category, values, description);
    if (typeof request === 'string') {
      onMessage({ kind: 'error', text: `${category.number} ${category.name}: ${request}` });
      return;
    }

    setSaving(true);
    try {
      await updateIndustryCategory(gregorianYear, category.number, request);
      if (request.description !== undefined) {
        onDescriptionSaved(category.number, request.description);
      }
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
        <td className="admin-cell-description" title={description ?? undefined}>
          {description === null ? '…' : description || '—'}
        </td>
        {NUMERIC_FIELDS.map((field) => (
          <td key={field.key} className="admin-num">{category[field.key] ?? '—'}</td>
        ))}
        <td>
          <button
            type="button"
            className="app-tool-btn"
            onClick={() => setValues(toEditValues(category, description))}
          >
            訂正
          </button>
        </td>
      </tr>
    );
  }

  const update = (key: keyof EditValues, value: string) =>
    setValues((current) => (current ? { ...current, [key]: value } : current));

  /*
   * 115行を順に直すとき、欄ごとにボタンへマウスを往復させるのは遅い。
   * 打ち終わったら Enter、間違えたら Esc で次へ進める。
   * 日本語入力の変換確定も Enter なので、変換中は素通しする。
   */
  const handleKeyDown = (event: KeyboardEvent<HTMLTableRowElement>) => {
    if (event.nativeEvent.isComposing || saving) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      void save();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setValues(null);
    }
  };

  return (
    <tr className="admin-row-editing" onKeyDown={handleKeyDown}>
      <td>{category.number}</td>
      <td>{LEVEL_LABELS[category.level]}</td>
      <td>
        {/*
          「訂正」を押した直後はどこにも焦点が無く、そのままでは Enter も Esc も届かない。
          最初の欄に入れておくと、押してすぐ打ち始められる。
        */}
        <input
          className="admin-input"
          value={values.name}
          onChange={(event) => update('name', event.target.value)}
          autoFocus
        />
      </td>
      <td>
        <input
          className="admin-input"
          value={values.description}
          onChange={(event) => update('description', event.target.value)}
          disabled={description === null}
          placeholder={description === null ? '内容説明を読込中…' : 'この業種目の対象となる会社'}
          aria-label={`${category.number} ${category.name} の内容`}
        />
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
        <button
          type="button"
          className="app-tool-btn admin-btn-primary"
          onClick={save}
          disabled={saving}
          title="Enter でも保存できます"
        >
          {saving ? '保存中…' : '保存'}
        </button>
        <button
          type="button"
          className="app-tool-btn"
          onClick={() => setValues(null)}
          disabled={saving}
          title="Esc でも取り消せます"
        >
          取消
        </button>
      </td>
    </tr>
  );
}
