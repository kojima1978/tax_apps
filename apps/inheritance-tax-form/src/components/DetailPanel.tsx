/**
 * 付表（財産の明細書）の明細1件を入力する画面。
 *
 * 用紙の上には割合を書く枠が無く（様式にあるのは「取得した人の番号」と「取得財産の価額」だけ）、
 * さらに1組には3人までしか並ばないため、1つの財産をまとめて扱える場所が用紙の上に無い。
 * そこで入力はこの画面へ一本化し、用紙は結果の表示とクリックの入口だけにしている。
 *
 * 入力欄の並びは様式の定義（`DetailSpec`）から機械的に作る。様式ごとの欄を
 * ここに書き写すと、罫線側と二重管理になって必ずずれるため。
 */

import { useMemo, useState } from 'react';
import type { GridCell } from './ui/GridForm';
import { SortableList } from './ui/SortableList';
import type { DetailField, DetailSpec } from '../forms/detail';
import {
  DETAIL_METHOD, DETAIL_RATIO_D, DETAIL_RATIO_N, type DetailMethod, type Values,
  detailMethod, detailShareAmounts, detailShareCount, detailUnusedFields, detailValue,
  isEmptyDetail, moveDetailShare, num,
} from '../lib/calc';
import { formatCommaInteger, formatSignedCommaInteger, normalizeInteger, sanitizeDecimal } from '../lib/format';

/** 評価方式の選択肢（付表1のみ） */
const METHOD_OPTIONS: readonly { value: DetailMethod; label: string; note: string }[] = [
  { value: 'route', label: '路線価方式', note: '面積 × 単価 × 持分割合' },
  { value: 'ratio', label: '倍率方式', note: '固定資産税評価額 × 倍数 × 持分割合' },
];

/** 持分割合のように分子・分母で1組になる欄 */
const FRACTIONS: Record<string, string> = { shareN: 'shareD' };

/** 入力欄1つ分（様式の定義から取り出したもの） */
interface PanelField {
  field: string;
  name: string;
  cell: Partial<GridCell>;
  /** 分母の欄（分数の欄のときだけ） */
  denominator?: PanelField;
}

/** 様式の定義から入力欄の並びを作る（用紙の並び順のまま） */
function panelFields(spec: DetailSpec): PanelField[] {
  const flat: DetailField[] = spec.rows.flat().filter((f) => f.field !== undefined);
  const byField = new Map(flat.map((f) => [f.field!, f]));
  const toPanel = (f: DetailField): PanelField => ({ field: f.field!, name: f.name ?? f.field!, cell: f.cell ?? {} });
  const denominators = new Set(Object.values(FRACTIONS));
  return flat
    .filter((f) => !denominators.has(f.field!))
    .map((f) => {
      const pair = FRACTIONS[f.field!];
      const denominator = pair === undefined ? undefined : byField.get(pair);
      if (denominator === undefined) return toPanel(f);
      // 分子・分母を1行にまとめるので、見出しからは「の分子」を落とす
      const panel = toPanel(f);
      return { ...panel, name: panel.name.replace(/の分子$/, ''), denominator: toPanel(denominator) };
    });
}

/**
 * 欄の種類に応じて入力を整える（用紙側の GridForm と同じ扱いにする）。
 * 価額の欄は打っている最中からカンマを入れる。保存されるのもこの形だが、
 * 読むときは `num()` がカンマと△を落とすので計算には影響しない。
 */
function clean(cell: Partial<GridCell>, raw: string): string {
  if (cell.commaInteger) return formatCommaInteger(raw);
  if (cell.signedCommaInteger) return formatSignedCommaInteger(raw);
  if (cell.integerDigits !== undefined) return normalizeInteger(raw).slice(0, cell.integerDigits);
  if (cell.decimalPlaces !== undefined) return sanitizeDecimal(raw, cell.decimalPlaces);
  return raw;
}

/** 保存済みの値の表示形（カンマの無い古い値も用紙と同じ見た目にする） */
function display(cell: Partial<GridCell>, value: string): string {
  if (cell.commaInteger) return formatCommaInteger(value);
  if (cell.signedCommaInteger) return formatSignedCommaInteger(value);
  return value;
}

/** 数字の欄は右詰めにする（用紙側と同じく、桁を揃えないと読めないため） */
function isNumericCell(cell: Partial<GridCell>): boolean {
  return cell.commaInteger === true || cell.signedCommaInteger === true
    || cell.decimalPlaces !== undefined || cell.align === 'right';
}

/** 数字欄の入力ボックスの class */
function inputClass(cell: Partial<GridCell>, auto = false): string {
  return `dpanel__input${isNumericCell(cell) ? ' dpanel__input--num' : ''}${auto ? ' dpanel__input--auto' : ''}`;
}

interface FieldInputProps {
  id: string;
  field: PanelField;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

/** 様式の欄の定義（選択式・桁数・小数）に従った入力欄 */
function FieldInput({ id, field, value, disabled, onChange }: FieldInputProps) {
  const { cell } = field;
  const groups = cell.optionGroups;
  const options = cell.options;
  if (options !== undefined || groups !== undefined) {
    const item = (option: string | { value: string; label: string }) => (
      typeof option === 'string' ? { value: option, label: option } : option
    );
    return (
      <select id={id} className="dpanel__input" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
        <option value="">（未選択）</option>
        {options?.map((option) => {
          const { value: v, label } = item(option);
          return v === '' ? null : <option key={v} value={v}>{label}</option>;
        })}
        {groups?.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </optgroup>
        ))}
      </select>
    );
  }
  return (
    <input
      id={id}
      className={inputClass(cell)}
      value={display(cell, value)}
      disabled={disabled}
      inputMode={cell.commaInteger || cell.integerDigits !== undefined || cell.decimalPlaces !== undefined ? 'numeric' : undefined}
      onChange={(e) => onChange(clean(cell, e.target.value))}
    />
  );
}

export interface DetailPanelProps {
  /** 付表の様式ID */
  form: string;
  spec: DetailSpec;
  /** 明細の通し番号（末尾より後なら新しい明細） */
  index: number;
  /** 編集前の明細（新規のときは空） */
  item: Values;
  /** 「財産を取得した人の番号」の選択肢（第1表の人） */
  heirs: readonly { value: string; label: string }[];
  /** 前項複写のもと（この明細より前にある、空でない最後の明細）。無ければ undefined */
  previous?: Values;
  onSubmit: (item: Values) => void;
  onDelete: () => void;
  onCancel: () => void;
}

export function DetailPanel({
  form, spec, index, item, heirs, previous, onSubmit, onDelete, onCancel,
}: DetailPanelProps) {
  const [draft, setDraft] = useState<Values>(item);
  const fields = useMemo(() => panelFields(spec), [spec]);
  const set = (field: string, value: string) => setDraft((prev) => ({ ...prev, [field]: value }));

  const method = detailMethod(draft);
  const unused = useMemo(() => new Set(detailUnusedFields(form, draft)), [form, draft]);
  const autoValue = useMemo(() => detailValue(form, { ...draft, value: '' }), [form, draft]);
  const amounts = useMemo(() => detailShareAmounts(form, draft), [form, draft]);
  // 取得者は最後の1人の次まで並べ、必ず1行は空けておく（そこに次の人を書く）。
  // 空けてある行は並べ替えの対象にしない（まだ誰でもないため）
  const shareCount = detailShareCount(draft);

  /** 自動で決まる欄（価額・按分した取得者の価額）は保存しない。手入力の値が残ると次に開いたとき食い違う */
  const submit = () => {
    const out: Values = { ...draft };
    if (autoValue !== '') delete out.value;
    amounts.forEach((amount, i) => { if (amount !== undefined) delete out[`amount${i}`]; });
    onSubmit(out);
  };

  /**
   * 前項複写。前の明細をそのまま写して、違うところだけ直してもらう。
   * 同じ地番の土地を利用区分ごとに分けて書くなど、隣り合う明細はほとんど同じ内容になる。
   */
  const copyPrevious = () => {
    if (previous === undefined) return;
    if (!isEmptyDetail(draft) && !window.confirm('今の入力内容を、前の明細の内容で置き換えます。よろしいですか？')) return;
    setDraft({ ...previous });
  };

  const distribute = () => {
    const filled = Array.from({ length: shareCount + 1 }, (_, i) => i).filter((i) => (draft[`who${i}`] ?? '') !== '');
    if (filled.length === 0) return;
    setDraft((prev) => {
      const next = { ...prev };
      for (const i of filled) {
        next[`${DETAIL_RATIO_N}${i}`] = '1';
        next[`${DETAIL_RATIO_D}${i}`] = String(filled.length);
      }
      return next;
    });
  };

  /** 取得者1人分の入力欄（並べ替えで動く単位。末尾の空き行にも同じものを使う） */
  const shareRow = (i: number) => {
    const amount = amounts[i];
    return (
      <div className="dpanel__share">
        <select
          className="dpanel__input"
          value={draft[`who${i}`] ?? ''}
          aria-label={`取得者${i + 1}`}
          onChange={(e) => set(`who${i}`, e.target.value)}
        >
          <option value="">（未選択）</option>
          {heirs.map((heir) => <option key={heir.value} value={heir.value}>{heir.label}</option>)}
        </select>
        <span className="dpanel__fraction">
          <input
            className="dpanel__input"
            value={draft[`${DETAIL_RATIO_N}${i}`] ?? ''}
            inputMode="numeric"
            aria-label={`取得者${i + 1}の割合の分子`}
            onChange={(e) => set(`${DETAIL_RATIO_N}${i}`, e.target.value.replace(/\D/g, ''))}
          />
          <span className="dpanel__slash">／</span>
          <input
            className="dpanel__input"
            value={draft[`${DETAIL_RATIO_D}${i}`] ?? ''}
            inputMode="numeric"
            aria-label={`取得者${i + 1}の割合の分母`}
            onChange={(e) => set(`${DETAIL_RATIO_D}${i}`, e.target.value.replace(/\D/g, ''))}
          />
        </span>
        {amount === undefined ? (
          <input
            className="dpanel__input dpanel__input--num"
            value={formatSignedCommaInteger(draft[`amount${i}`] ?? '')}
            inputMode="numeric"
            aria-label={`取得者${i + 1}の取得財産の価額`}
            onChange={(e) => set(`amount${i}`, formatSignedCommaInteger(e.target.value))}
          />
        ) : (
          <input className="dpanel__input dpanel__input--num dpanel__input--auto" value={formatSignedCommaInteger(amount)} readOnly aria-label={`取得者${i + 1}の取得財産の価額（自動計算）`} />
        )}
      </div>
    );
  };

  return (
    <div className="dpanel no-print" role="dialog" aria-modal="true" aria-label={`${spec.title} 明細${index + 1}`}>
      <div className="dpanel__box">
        <div className="dpanel__head">
          <strong>明細{index + 1}</strong>
          <span className="dpanel__sub">{spec.subtitle.replace('\n', '')}</span>
          <button type="button" className="app-btn" onClick={onCancel} aria-label="閉じる">×</button>
        </div>

        <div className="dpanel__body">
          {form === 'table11f1' && (
            <fieldset className="dpanel__methods">
              <legend>評価方式</legend>
              {METHOD_OPTIONS.map((option) => (
                <label key={option.value} className="dpanel__method">
                  <input
                    type="radio"
                    name="detail-method"
                    checked={method === option.value}
                    onChange={() => set(DETAIL_METHOD, option.value)}
                  />
                  <span>{option.label}</span>
                  <span className="dpanel__note">{option.note}</span>
                </label>
              ))}
            </fieldset>
          )}

          {fields.map((field) => {
            const id = `dpanel-${field.field}`;
            const disabled = unused.has(field.field);
            const auto = field.field === 'value' && autoValue !== '';
            return (
              <div className="dpanel__row" key={field.field}>
                <label className="dpanel__label" htmlFor={id}>{field.name}</label>
                {auto ? (
                  <input className={inputClass(field.cell, true)} value={display(field.cell, autoValue)} readOnly aria-label={`${field.name}（自動計算）`} />
                ) : (
                  <FieldInput
                    id={id}
                    field={field}
                    value={draft[field.field] ?? ''}
                    disabled={disabled}
                    onChange={(value) => set(field.field, value)}
                  />
                )}
                {field.denominator && (
                  <>
                    <span className="dpanel__slash">／</span>
                    <FieldInput
                      id={`dpanel-${field.denominator.field}`}
                      field={field.denominator}
                      value={draft[field.denominator.field] ?? ''}
                      disabled={disabled}
                      onChange={(value) => set(field.denominator!.field, value)}
                    />
                  </>
                )}
                {disabled && <span className="dpanel__note">この方式では使いません</span>}
                {auto && <span className="dpanel__note">自動計算（元の欄を空にすると手入力）</span>}
              </div>
            );
          })}

          <div className="dpanel__shares">
            <div className="dpanel__shares-head">
              <strong>分割が確定した財産</strong>
              <button type="button" className="app-btn" onClick={distribute}>均等に分ける</button>
            </div>
            <div className="dpanel__share dpanel__share--head sortlist__pad">
              <span>財産を取得した人</span>
              <span>割合</span>
              <span>取得財産の価額（円）</span>
            </div>
            <SortableList
              items={Array.from({ length: shareCount }, (_, i) => shareRow(i))}
              labelOf={(i) => `取得者${i + 1}`}
              onMove={(from, to) => setDraft((prev) => moveDetailShare(prev, from, to))}
            />
            <div className="sortlist__pad">{shareRow(shareCount)}</div>
            <p className="dpanel__note">
              割合を入れると価額を按分します（端数は先頭の人へ寄せ、合計は
              {num(detailValue(form, draft)).toLocaleString()} 円に一致します）。
              代償財産を支払う人の分は「△」を付けて負数で記入します（記載例62ページ）。
            </p>
          </div>
        </div>

        <div className="dpanel__foot">
          <button type="button" className="app-btn app-btn--danger" onClick={onDelete}>この明細を削除</button>
          <button
            type="button"
            className="app-btn"
            onClick={copyPrevious}
            disabled={previous === undefined}
            title={previous === undefined ? '前に入力済みの明細がありません' : undefined}
          >
            前項複写
          </button>
          <span className="dpanel__spacer" />
          <button type="button" className="app-btn" onClick={onCancel}>取消</button>
          <button type="button" className="app-btn app-btn--primary" onClick={submit}>確定</button>
        </div>
      </div>
    </div>
  );
}
