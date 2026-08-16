/**
 * 「財産を取得した人」1人分の基本情報を入力する画面。
 *
 * 用紙の上では1人分が縦1列に細長く割り付けられ、2人目からは別の用紙（第1表（続））に移るため、
 * 1人をまとめて登録できる場所が用紙の上に無い。そこで入力はこの画面へ一本化し、
 * 用紙側は読み取り専用（灰色）にしてクリックの入口だけにしている。
 *
 * 入力は打つそばから保存する（付表の明細と違い、下書きは持たない）。この画面が扱うのは
 * 1人分の値のうち基本情報だけで、同じ人の欄には各表の計算値も同居しているため、
 * まとめて書き戻すと関係のない欄まで巻き込む恐れがある。
 */

import { lookupZipAddress } from '../lib/zipAddress';
import {
  PERSON_ADDRESS_PARTS, PERSON_ATTRS, PERSON_BIRTH_PARTS, PERSON_CAUSES, PERSON_FIELDS, PERSON_TEL_PARTS,
  PERSON_ZIP_PARTS, type PersonField,
} from '../forms/person';

/** 数字だけの欄（郵便番号・電話番号）。先頭の0を残す（数値ではなく番号のため） */
const digits = (value: string, maxLength: number): string => value.replace(/\D/g, '').slice(0, maxLength);

export interface PersonPanelProps {
  /** 何人目か（0始まり） */
  index: number;
  /** 財産を取得した人の総数（前後の人へ移るボタンの端の判定に使う） */
  total: number;
  /** この人のフィールド接頭辞（'h0.'） */
  prefix: string;
  g: (field: string) => string;
  u: (field: string, value: string) => void;
  /** 別の人へ移る */
  onSelect: (index: number) => void;
  onClose: () => void;
}

export function PersonPanel({ index, total, prefix, g, u, onSelect, onClose }: PersonPanelProps) {
  const get = (field: string) => g(`${prefix}${field}`);
  const set = (field: string, value: string) => u(`${prefix}${field}`, value);

  /** 郵便番号が7桁そろったら住所の上段を補う（空のときだけ。用紙側の GridForm と同じ扱い） */
  const setZip = (suffix: string, value: string) => {
    set(`zip${suffix}`, value);
    if (get('address') !== '') return;
    const upper = suffix === '_1' ? value : get('zip_1');
    const lower = suffix === '_2' ? value : get('zip_2');
    void lookupZipAddress(upper + lower).then((address) => {
      if (address !== '' && get('address') === '') set('address', address);
    });
  };

  const name = get('name').trim();
  const title = [`${index + 1}人目`, name].filter((part) => part !== '').join(' ');

  const textInput = (field: string, label: string) => (
    <input
      id={`ppanel-${field}`}
      className="dpanel__input"
      value={get(field)}
      aria-label={label}
      onChange={(e) => set(field, e.target.value)}
    />
  );

  const select = (field: string, label: string, options: readonly { value: string; label: string }[]) => (
    <select
      id={`ppanel-${field}`}
      className="dpanel__input"
      value={get(field)}
      aria-label={label}
      onChange={(e) => set(field, e.target.value)}
    >
      <option value="">（未選択）</option>
      {options.map((option) => (option.value === '' ? null : (
        <option key={option.value} value={option.value}>{option.label}</option>
      )))}
    </select>
  );

  const checkbox = (field: string, label: string) => (
    <label className="dpanel__check" key={field}>
      <input
        type="checkbox"
        checked={get(field) === '1'}
        aria-label={label}
        onChange={(e) => set(field, e.target.checked ? '1' : '')}
      />
      <span>{label}</span>
    </label>
  );

  /** 欄の種類ごとの入力（用紙側のセルと同じ区切り・同じ桁数にそろえる） */
  const control = (field: PersonField) => {
    switch (field.control) {
      case 'select':
        return select(field.field, field.name, field.options ?? []);
      case 'flag':
        return <span className="dpanel__checks">{checkbox(field.field, field.checkLabel ?? field.name)}</span>;
      case 'causes':
        return <span className="dpanel__checks">{PERSON_CAUSES.map((cause) => checkbox(cause.field, cause.name))}</span>;
      case 'birth':
        return (
          <span className="dpanel__parts">
            {PERSON_BIRTH_PARTS.map((part) => (
              <span className="dpanel__part" key={part.field}>
                {select(part.field, `生年月日（${part.name}）`, part.options)}
                <span className="dpanel__unit">{part.name === '元号' ? '' : part.name}</span>
              </span>
            ))}
            <span className="dpanel__part">
              <input className="dpanel__input dpanel__input--auto" value={get('age')} readOnly aria-label="年齢（自動計算）" />
              <span className="dpanel__unit">歳</span>
            </span>
          </span>
        );
      case 'zip':
        return (
          <span className="dpanel__parts">
            {PERSON_ZIP_PARTS.map((part, i) => (
              <span className="dpanel__part" key={part.suffix}>
                {i > 0 && <span className="dpanel__slash">―</span>}
                <input
                  className="dpanel__input"
                  value={get(`zip${part.suffix}`)}
                  inputMode="numeric"
                  aria-label={`郵便番号（${part.name}）`}
                  onChange={(e) => setZip(part.suffix, digits(e.target.value, part.maxLength))}
                />
              </span>
            ))}
          </span>
        );
      case 'tel':
        return (
          <span className="dpanel__parts">
            {PERSON_TEL_PARTS.map((part, i) => (
              <span className="dpanel__part" key={part.suffix}>
                {i > 0 && <span className="dpanel__slash">―</span>}
                <input
                  className="dpanel__input"
                  value={get(`tel${part.suffix}`)}
                  inputMode="numeric"
                  aria-label={`電話番号（${part.name}）`}
                  onChange={(e) => set(`tel${part.suffix}`, digits(e.target.value, part.maxLength))}
                />
              </span>
            ))}
          </span>
        );
      case 'address':
        return (
          <span className="dpanel__stack">
            {PERSON_ADDRESS_PARTS.map((part) => (
              <input
                key={part.suffix}
                className="dpanel__input"
                value={get(`address${part.suffix}`)}
                aria-label={`住所（${part.name}）`}
                placeholder={part.name}
                onChange={(e) => set(`address${part.suffix}`, e.target.value)}
              />
            ))}
          </span>
        );
      default:
        return textInput(field.field, field.name);
    }
  };

  const fieldRow = (field: PersonField) => {
    // 複合欄（生年月日・郵便番号など）は入力欄が複数あるので、見出しは特定の欄に結び付けない
    const single = field.control === 'text' || field.control === 'select';
    return (
      <div className="dpanel__row" key={field.field}>
        <label className="dpanel__label" htmlFor={single ? `ppanel-${field.field}` : undefined}>{field.name}</label>
        {control(field)}
        {field.note && <span className="dpanel__note">{field.note}</span>}
      </div>
    );
  };

  return (
    <div className="dpanel no-print" role="dialog" aria-modal="true" aria-label={`財産を取得した人 ${title}`}>
      <div className="dpanel__box">
        <div className="dpanel__head">
          <strong>{title}</strong>
          <span className="dpanel__sub">財産を取得した人（全{total}人）</span>
          <button type="button" className="app-btn" onClick={onClose} aria-label="閉じる">×</button>
        </div>

        <div className="dpanel__body">
          {PERSON_FIELDS.map(fieldRow)}
          <div className="dpanel__section">申告書の他の表で使う情報（様式には印刷しません）</div>
          {PERSON_ATTRS.map(fieldRow)}
        </div>

        <div className="dpanel__foot">
          <button type="button" className="app-btn" onClick={() => onSelect(index - 1)} disabled={index <= 0}>◀ 前の人</button>
          <button type="button" className="app-btn" onClick={() => onSelect(index + 1)} disabled={index >= total - 1}>次の人 ▶</button>
          <span className="dpanel__spacer" />
          <button type="button" className="app-btn app-btn--primary" onClick={onClose}>閉じる</button>
        </div>
      </div>
    </div>
  );
}
