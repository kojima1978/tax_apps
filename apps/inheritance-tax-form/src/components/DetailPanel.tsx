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
import type { DetailExtraField, DetailField, DetailSpec } from '../forms/detail';
import {
  DETAIL_METHOD, DETAIL_RATIO_D, DETAIL_RATIO_N, DETAIL_VALUE_MANUAL,
  type DetailMethod, type Values,
  detailMethod, detailShareAmounts, detailShareCount, detailValue,
  isEmptyDetail, moveDetailShare, num,
} from '../lib/calc';
import { cleanNumeric, displayNumeric, formatSignedCommaInteger } from '../lib/format';
import type { AutoFill } from '../lib/codeLink';

/**
 * 評価方式の選択肢（付表1のみ）。
 * どちらを選んでも欄はすべて入力できる（選ばなかった側の値も参考として残せる）。
 * 方式が決めるのは、用紙の「単価（円）又は倍数」に何を印字するかと、価額の式だけ。
 */
const METHOD_OPTIONS: readonly { value: DetailMethod; label: string }[] = [
  { value: 'route', label: '路線価方式' },
  { value: 'ratio', label: '倍率方式' },
];

/**
 * 価額の入力方法。既定は自動計算（元になる欄がそろうまで空欄のまま）。
 * 直接入力にしても数量・単価・為替はそのまま残り、用紙にも印字される。
 */
const VALUE_MODE_OPTIONS: readonly { manual: boolean; label: string }[] = [
  { manual: false, label: '自動計算' },
  { manual: true, label: '直接入力' },
];

/** 持分割合のように分子・分母で1組になる欄 */
const FRACTIONS: Record<string, string> = { shareN: 'shareD' };

/** 入力欄1つ分（様式の定義から取り出したもの） */
interface PanelField {
  field: string;
  name: string;
  cell: Partial<GridCell>;
  /** コードを選んだときに中身を差し替える欄（用紙側と同じ規則で動かす） */
  autoFill?: AutoFill;
  /** 分母の欄（分数の欄のときだけ） */
  denominator?: PanelField;
}

/**
 * 様式の定義から入力欄の並びを作る。
 * 既定は用紙の並び順そのまま。`spec.panel` がある様式はその並び（グループ分けも）に従う。
 */
function panelFields(spec: DetailSpec): PanelField[][] {
  const paper: DetailField[] = spec.rows.flat().filter((f) => f.field !== undefined);
  const toPanel = (f: DetailField | DetailExtraField): PanelField => ({
    field: f.field!,
    name: f.name ?? f.field!,
    cell: f.cell ?? {},
    ...('autoFill' in f && f.autoFill ? { autoFill: f.autoFill } : {}),
  });
  const byField = new Map<string, PanelField>([
    ...paper.map((f): [string, PanelField] => [f.field!, toPanel(f)]),
    ...(spec.extra ?? []).map((f): [string, PanelField] => [f.field, toPanel(f)]),
  ]);
  const denominators = new Set(Object.values(FRACTIONS));
  const order: readonly (readonly string[])[] = spec.panel
    ?? [paper.map((f) => f.field!)];
  return order.map((group) => group
    .filter((field) => !denominators.has(field))
    .flatMap((field): PanelField[] => {
      const panel = byField.get(field);
      // 様式の定義に無い欄を並びに書いた場合（`detail.test.ts` が拾う）
      if (panel === undefined) return [];
      const denominator = byField.get(FRACTIONS[field] ?? '');
      if (denominator === undefined) return [panel];
      // 分子・分母を1行にまとめるので、見出しからは「の分子」を落とす
      return [{ ...panel, name: panel.name.replace(/の分子$/, ''), denominator }];
    }));
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
  onChange: (value: string) => void;
}

/** 様式の欄の定義（選択式・桁数・小数）に従った入力欄 */
function FieldInput({ id, field, value, onChange }: FieldInputProps) {
  const { cell } = field;
  const groups = cell.optionGroups;
  const options = cell.options;
  if (options !== undefined || groups !== undefined) {
    const item = (option: string | { value: string; label: string }) => (
      typeof option === 'string' ? { value: option, label: option } : option
    );
    return (
      <select id={id} className="dpanel__input" value={value} onChange={(e) => onChange(e.target.value)}>
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
      value={displayNumeric(cell, value)}
      inputMode={cell.commaInteger || cell.integerDigits !== undefined || cell.decimalPlaces !== undefined ? 'numeric' : undefined}
      onChange={(e) => onChange(cleanNumeric(cell, e.target.value))}
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
  const [draft, setDraft] = useState<Values>(() => (
    // 印が付く前に価額だけ手で入れてあった明細は、直接入力として開く
    // （自動計算のまま開くと、読み取り専用の空欄に見えて入力した値が消えたように映る）
    item[DETAIL_VALUE_MANUAL] === undefined && (item.value ?? '') !== ''
    && detailValue(form, { ...item, value: '' }) === ''
      ? { ...item, [DETAIL_VALUE_MANUAL]: '1' }
      : item
  ));
  const fields = useMemo(() => panelFields(spec), [spec]);
  const set = (field: string, value: string) => setDraft((prev) => ({ ...prev, [field]: value }));
  /** 欄の定義に従って入れる（コードの欄なら連動する欄も一緒に書き換える） */
  const setField = (field: PanelField, value: string) => setDraft((prev) => {
    const next: Values = { ...prev, [field.field]: value };
    if (field.autoFill) next[field.autoFill.field] = field.autoFill.byValue[value] ?? '';
    return next;
  });

  const method = detailMethod(draft);
  // 直接入力を選んでいても計算値は出しておく（切り替えたときの初期値に使う）
  const autoValue = useMemo(
    () => detailValue(form, { ...draft, value: '', [DETAIL_VALUE_MANUAL]: '' }),
    [form, draft],
  );
  const valueManual = draft[DETAIL_VALUE_MANUAL] === '1';
  /** 価額の入力方法の切り替え。直接入力にしたときは計算値を初期値として置く */
  const setValueMode = (manual: boolean) => setDraft((prev) => ({
    ...prev,
    [DETAIL_VALUE_MANUAL]: manual ? '1' : '',
    ...(manual && (prev.value ?? '') === '' ? { value: autoValue } : {}),
  }));
  const amounts = useMemo(() => detailShareAmounts(form, draft), [form, draft]);
  // 取得者は最後の1人の次まで並べ、必ず1行は空けておく（そこに次の人を書く）。
  // 空けてある行は並べ替えの対象にしない（まだ誰でもないため）
  const shareCount = detailShareCount(draft);

  /** 自動で決まる欄（価額・按分した取得者の価額）は保存しない。手入力の値が残ると次に開いたとき食い違う */
  const submit = () => {
    const out: Values = { ...draft };
    // 自動計算のときは価額を保存しない（手入力の値が残ると次に開いたとき食い違う）
    if (!valueManual) {
      delete out.value;
      delete out[DETAIL_VALUE_MANUAL];
    }
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
                </label>
              ))}
            </fieldset>
          )}

          {fields.map((group, g) => (
            // グループの区切りは様式の定義が持つ（`spec.panel`）。無い様式は1グループになる
            <div className="dpanel__group" key={group[0]?.field ?? g}>
              {group.map((field) => {
                const id = `dpanel-${field.field}`;
                // 価額はどちらで入れるかを常に選べる。自動計算のうちは読み取り専用
                // （元になる欄がそろっていなければ、そろうまで空欄のまま）
                const chooseMode = field.field === 'value';
                const auto = chooseMode && !valueManual;
                return (
                  <div className="dpanel__row" key={field.field}>
                    <label className="dpanel__label" htmlFor={id}>{field.name}</label>
                    {auto ? (
                      <input className={inputClass(field.cell, true)} value={displayNumeric(field.cell, autoValue)} readOnly aria-label={`${field.name}（自動計算）`} />
                    ) : (
                      <FieldInput
                        id={id}
                        field={field}
                        value={draft[field.field] ?? ''}
                        onChange={(value) => setField(field, value)}
                      />
                    )}
                    {field.denominator && (
                      <>
                        <span className="dpanel__slash">／</span>
                        <FieldInput
                          id={`dpanel-${field.denominator.field}`}
                          field={field.denominator}
                          value={draft[field.denominator.field] ?? ''}
                          onChange={(value) => set(field.denominator!.field, value)}
                        />
                      </>
                    )}
                    {chooseMode && (
                      <span className="dpanel__choice" role="radiogroup" aria-label="価額の入力方法">
                        {VALUE_MODE_OPTIONS.map((option) => (
                          <label
                            key={option.label}
                            className={`dpanel__choice-item${option.manual === valueManual ? ' dpanel__choice-item--on' : ''}`}
                          >
                            <input
                              type="radio"
                              name="detail-value-mode"
                              checked={option.manual === valueManual}
                              onChange={() => setValueMode(option.manual)}
                            />
                            <span>{option.label}</span>
                          </label>
                        ))}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

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
