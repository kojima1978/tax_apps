import { useCallback, useContext, useId, useMemo, useRef, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { PrintRenderContext } from './printContext';

/**
 * グリッドセル定義（座標・サイズは様式全体に対する％）。
 * 株式評価明細書アプリの GridForm を、相続税申告書 第1表で使う機能だけに絞って移植したもの。
 */
export interface GridCell {
  top: number;
  left: number;
  width: number;
  height: number;
  kind?: 'cell' | 'input' | 'label'; // cell=枠のみ, input=入力, label=固定文字
  text?: string;                     // label/cell の表示文字（\n で改行）
  field?: string;                    // input のフィールドキー
  ariaLabel?: string;                // 入力欄のアクセシブル名
  semanticRole?: 'group' | 'columnheader' | 'rowheader' | 'presentation';
  groupBorder?: boolean;             // group の外枠セルを描画するか（既存罫線を使う場合は false）
  align?: 'left' | 'center' | 'right';
  fontSize?: number;
  forceHorizontal?: boolean;         // 縦長セルでも横書きを維持する
  forceVertical?: boolean;           // セル比率にかかわらず縦書きにする
  bold?: boolean;
  noWrap?: boolean;                  // 明示改行以外では折り返さない
  noBorder?: boolean;                // 様式に罫線が無い領域（提出日の行など）
  dashed?: boolean;                  // 破線枠（生年月日の元号コード注記）
  outline?: boolean;                 // 他のセルに重ねて描く太枠（被相続人ブロックの外枠）。入力を妨げない
  codeLabel?: string;                // 様式の識別コード（E01/G04等）をセル左上に小さく表示
  cornerLabel?: string;              // 入力欄の左上に表示する固定ラベル（枠を持たないコード欄）
  rightLabel?: string;               // セルの右端中央に表示する固定ラベル（末尾の「000」など）
  integerDigits?: number;            // 数字のみの最大桁数
  commaInteger?: boolean;            // 整数を3桁区切りカンマで表示
  signedCommaInteger?: boolean;      // マイナス（△）を許可する整数を3桁区切りカンマで表示
  decimalPlaces?: number;            // 小数点以下の最大桁数（フォーカス解除時に固定表示）
  readOnly?: boolean;                // 自動計算などの編集不可欄
  options?: (string | { value: string; label: string })[]; // 選択式入力の候補（空文字は未選択）
  compactSelectedOption?: boolean;   // 選択中の項目はコードのみ表示（狭いコード記入枠用）
  /** 選択に連動して別の欄も書き換える（細目コード → 細目の名称）。書き換えた後も手入力できる */
  autoFill?: { field: string; byValue: Record<string, string> };
  highlightWhen?: (g: (field: string) => string) => boolean; // 自動判定時の強調条件
  selectValue?: { field: string; value: string }; // セルをクリックして指定値を選択
  toggleField?: string;              // セルをクリックして指定フィールドをオン・オフ
  diagonal?: 'tlbr' | 'bltr';        // 斜線（記入不要欄: tlbr=＼ 左上→右下, bltr=／ 左下→右上）
  date?: boolean;                    // ◯年◯月◯日（fieldを接頭辞に _y/_m/_d）
  dateSuffix?: string;               // 日付入力の後ろに置く固定文字（「提出」など）
  zip?: boolean;                     // 郵便番号（field_1「―」field_2）
  tel?: boolean;                     // 電話番号（field_1「―」field_2「―」field_3）
}

interface GridFormProps {
  cells: GridCell[];
  g: (f: string) => string;
  u: (f: string, v: string) => void;
  /** 枠外上部に表示する様式タイトル */
  title?: string;
  /** タイトルの下に1行細く添える副題（第2表の「相続税の総額の計算書」など）。formCode 指定時のみ */
  subtitle?: string;
  /** 様式ID。指定時はタイトル上部に中央配置の「様式ID」枠を表示する */
  formCode?: string;
  /** グリッドのアスペクト比（省略時 '210 / 297'＝A4全体）。本表がA4の一部だけを占める場合に指定 */
  aspectRatio?: string;
  /** タイトル行の右側に表示する操作UI */
  toolbar?: ReactNode;
  /** グリッドの下（枠外）に置く注記など */
  footer?: ReactNode;
  /** input/select の id・name に使用する表識別子 */
  formId?: string;
}

/** 半角・全角（U+3000）スペース。縦書きラベルでは字間が空きすぎるため取り除く。 */
const SPACES = new RegExp('[ 　]', 'g');

/** 様式の書体（main.css と揃える。Webフォントが読めない環境では OS の日本語フォントに落とす） */
const FORM_FONT = '"Noto Sans JP", "Yu Gothic", "MS PGothic", sans-serif';

/**
 * 近接する境界線を統合（tol％以内は同一線とみなす）。
 * 実測値の誤差は最大でも 0.05％ 程度なのに対し、様式には高さ 0.66％ の帯（見出し帯の上の
 * 空白帯）が実在する。tol を大きく取るとその帯が潰れて 0 幅の行になるため 0.3％ とする。
 */
function snapLines(values: number[], tol = 0.3): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  const lines: number[] = [];
  for (const v of sorted) {
    const last = lines[lines.length - 1];
    if (last === undefined || v - last > tol) lines.push(v);
  }
  return lines;
}

/**
 * 文字サイズの自動決定に使う様式の描画寸法（px）。
 * グリッドは画面でも印刷でも A4 幅から余白を引いた約 733px 幅で描かれる（実測値）。
 */
const NOMINAL_W = 733;
const NOMINAL_H = 989;
const FONT_STEPS = [9, 8.5, 8, 7.5, 7, 6.5, 6, 5.5, 5];
const LINE_HEIGHT = 1.15;
/** 全角＝1em、半角＝0.6em として行の長さを見積もる */
const HALF_WIDTH = /[\x20-\x7E｡-ﾟ]/;

function emWidth(line: string): number {
  let em = 0;
  for (const ch of line) em += HALF_WIDTH.test(ch) ? 0.6 : 1;
  return em;
}

/**
 * セルに収まる最大の文字サイズを選ぶ。
 * 様式は同じ幅の枠に文字数の違うラベルを詰め込むため、文字数だけで決めると
 * 狭い枠（「算出税額（第３表⑬）」など）がはみ出す。枠の実寸から行数を見積もって決める。
 */
function fitFontSize(text: string, c: GridCell, vertical: boolean): number {
  const w = (c.width / 100) * NOMINAL_W - 5;   // 左右パディング2px＋罫線
  const h = (c.height / 100) * NOMINAL_H - 3;  // 上下パディング1px＋罫線
  // 縦書きでは行が伸びる向きが高さ、行が積まれる向きが幅になる
  const along = vertical ? h : w;
  const across = vertical ? w : h;
  const lines = text.split('\n').map(emWidth);
  const fits = (size: number) => {
    const capacity = along / size;
    const rows = c.noWrap
      ? (Math.max(...lines) <= capacity ? lines.length : Infinity)
      : lines.reduce((n, em) => n + Math.max(1, Math.ceil(em / capacity)), 0);
    return rows * size * LINE_HEIGHT <= across;
  };
  return FONT_STEPS.find(fits) ?? FONT_STEPS[FONT_STEPS.length - 1]!;
}

function nearestIndex(lines: number[], v: number): number {
  let best = 0, bd = Infinity;
  lines.forEach((l, i) => { const d = Math.abs(l - v); if (d < bd) { bd = d; best = i; } });
  return best;
}

/** 入力できる欄か（自動計算＝readOnly の欄はカーソル移動でスキップする） */
function isEditableField(el: Element): boolean {
  if (el instanceof HTMLInputElement) return !el.readOnly && !el.disabled;
  if (el instanceof HTMLSelectElement) return !el.disabled;
  return false;
}

function selectedOptionLabel(options: NonNullable<GridCell['options']>, value: string): string {
  const option = options.find((candidate) => (
    typeof candidate === 'string' ? candidate === value : candidate.value === value
  ));
  return typeof option === 'string' ? option : option?.label ?? '';
}

function normalizeInteger(value: string): string {
  return value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
}

function formatCommaInteger(value: string): string {
  return normalizeInteger(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** 様式では還付額の頭に「△」を付ける。入力は - / △ のどちらでも受け付け、表示は △ に統一する。 */
function formatSignedCommaInteger(value: string): string {
  const raw = value.replace(/,/g, '').trim();
  const negative = raw.startsWith('-') || raw.startsWith('△');
  const digits = normalizeInteger(raw);
  if (negative && digits === '') return '△';
  const formatted = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return negative && formatted !== '' ? `△${formatted}` : formatted;
}

function sanitizeDecimal(value: string, places: number): string {
  const normalized = value.replace(/[^\d.]/g, '');
  const [integer = '', ...fractions] = normalized.split('.');
  const fraction = fractions.join('').slice(0, places);
  return normalized.includes('.') ? `${integer}.${fraction}` : integer;
}

function formatFixedDecimal(value: string, places: number): string {
  const sanitized = sanitizeDecimal(value, places);
  if (!sanitized || sanitized === '.') return '';
  return Number(sanitized).toFixed(places);
}

/** 複合入力（日付・郵便番号・電話番号）の入力ボックス共通スタイル */
const SUB_BOX: CSSProperties = { textAlign: 'center', border: 'none', borderBottom: '1px solid #aaa', outline: 'none', background: 'transparent', fontSize: 'inherit', fontFamily: 'inherit', padding: 0, minWidth: 0 };
const SELECT_ARROW = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%23888' stroke-width='1.5'/%3E%3C/svg%3E")`;

interface SubInputProps {
  field: string;
  formId: string;
  width: string;
  maxLength: number;
  ariaLabel: string;
  g: (f: string) => string;
  u: (f: string, v: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLElement>) => void;
}
/** 複合入力の中の数字1マス */
function SubInput({ field, formId, width, maxLength, ariaLabel, g, u, onKeyDown }: SubInputProps) {
  const printRendering = useContext(PrintRenderContext);
  const value = normalizeInteger(g(field));
  if (printRendering) return <span style={{ display: 'inline-block', width, textAlign: 'center' }}>{value}</span>;
  return (
    <input
      id={`${formId}-${field}`}
      name={`${formId}.${field}`}
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => u(field, normalizeInteger(e.target.value).slice(0, maxLength))}
      onKeyDown={onKeyDown}
      maxLength={maxLength}
      inputMode="numeric"
      style={{ ...SUB_BOX, width }}
    />
  );
}

/**
 * 測定した矩形（cells）から CSS グリッドを自動導出して描画する。
 * 各矩形の left/right を縦罫線、top/bottom を横罫線として grid-template を生成し、
 * 各セルを grid-column / grid-row で配置する。背景画像は不要。
 */
export function GridForm({ cells, g, u, title, subtitle, formCode, aspectRatio = '210 / 297', toolbar, footer, formId }: GridFormProps) {
  const printRendering = useContext(PrintRenderContext);
  const generatedId = useId().replace(/:/g, '');
  const inputPrefix = formId ?? `grid-${generatedId}`;

  const { colTmpl, rowTmpl, placed } = useMemo(() => {
    const xs = snapLines(cells.flatMap((c) => [c.left, c.left + c.width]));
    const ys = snapLines(cells.flatMap((c) => [c.top, c.top + c.height]));
    return {
      colTmpl: xs.slice(1).map((x, i) => `${(x - xs[i]!).toFixed(3)}fr`).join(' '),
      rowTmpl: ys.slice(1).map((y, i) => `${(y - ys[i]!).toFixed(3)}fr`).join(' '),
      placed: cells.map((c) => ({
        c,
        cs: nearestIndex(xs, c.left) + 1,
        ce: nearestIndex(xs, c.left + c.width) + 1,
        rs: nearestIndex(ys, c.top) + 1,
        re: nearestIndex(ys, c.top + c.height) + 1,
      })),
    };
  }, [cells]);

  const gridRef = useRef<HTMLDivElement>(null);
  // Enter で次の入力欄（DOM順＝右→下）へフォーカス移動
  const onEnterNext = useCallback((e: KeyboardEvent<HTMLElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const items = Array.from(gridRef.current?.querySelectorAll<HTMLElement>('input, select') ?? []);
    const idx = items.indexOf(e.currentTarget as HTMLElement);
    if (idx < 0) return;
    items.slice(idx + 1).find(isEditableField)?.focus();
  }, []);

  const renderCell = ({ c, cs, ce, rs, re }: (typeof placed)[number], i: number) => {
    // 縦長のラベルは縦書き（帯見出し）。スペース（全角 U+3000 を含む）は縦書き時に除去。
    const ratio = c.height / c.width;
    const isVertical = c.kind === 'label' && !c.forceHorizontal && (c.forceVertical || ratio > 2.5);
    const raw = c.text ?? '';
    const text = isVertical ? raw.replace(SPACES, '') : raw;
    // 枠の実寸に合わせて自動縮小（長文ラベルがはみ出さないように）
    const fontSize = c.fontSize ?? fitFontSize(text, c, isVertical);
    const justify = c.align === 'left' ? 'flex-start' : c.align === 'right' ? 'flex-end' : 'center';
    const highlighted = c.highlightWhen?.(g) ?? false;
    const interactive = c.selectValue || c.toggleField;
    const selectCell = () => {
      if (c.toggleField) u(c.toggleField, g(c.toggleField) === '1' ? '' : '1');
      else if (c.selectValue) u(c.selectValue.field, g(c.selectValue.field) === c.selectValue.value ? '' : c.selectValue.value);
    };

    return (
      <div
        key={i}
        className="gf-cell"
        role={c.toggleField ? 'checkbox' : c.selectValue ? 'button' : c.semanticRole}
        tabIndex={interactive ? 0 : undefined}
        aria-label={interactive ? c.ariaLabel ?? `${text}を選択` : c.ariaLabel}
        aria-checked={c.toggleField ? g(c.toggleField) === '1' : undefined}
        aria-pressed={c.selectValue ? g(c.selectValue.field) === c.selectValue.value : undefined}
        onClick={interactive ? selectCell : undefined}
        onKeyDown={interactive ? (event) => {
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectCell(); }
        } : undefined}
        style={{
          gridColumn: `${cs} / ${ce}`,
          gridRow: `${rs} / ${re}`,
          border: c.noBorder ? 'none' : c.outline ? '1.5px solid #000' : c.dashed ? '1px dashed #000' : '0.5px solid #000',
          // outline は既存セルの上に重ねる飾り枠。クリックを吸わないようにする
          pointerEvents: c.outline ? 'none' : undefined,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isVertical ? (c.align === 'center' ? 'center' : 'flex-start') : justify,
          writingMode: isVertical ? 'vertical-rl' : undefined,
          fontSize,
          fontWeight: c.bold || highlighted ? 700 : 400,
          background: highlighted ? '#fff3b0' : undefined,
          boxShadow: highlighted ? 'inset 0 0 0 1.5px #d97706' : undefined,
          cursor: interactive ? 'pointer' : undefined,
          userSelect: interactive ? 'none' : undefined,
          padding: '1px 2px', boxSizing: 'border-box', overflow: 'hidden',
          lineHeight: 1.15, wordBreak: c.noWrap ? 'normal' : 'break-all', whiteSpace: c.noWrap ? 'nowrap' : 'normal', textAlign: 'center',
        }}
      >
        {c.codeLabel && <span style={{ position: 'absolute', top: 1, left: 2, fontSize: 6, lineHeight: 1, color: '#777', pointerEvents: 'none', zIndex: 1, whiteSpace: 'nowrap' }}>{c.codeLabel}</span>}
        {c.rightLabel && <span style={{ position: 'absolute', top: '50%', right: 2, transform: 'translateY(-50%)', fontSize: 7, lineHeight: 1, pointerEvents: 'none' }}>{c.rightLabel}</span>}
        {c.diagonal ? (
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
            <line x1="0" y1={c.diagonal === 'bltr' ? 100 : 0} x2="100" y2={c.diagonal === 'bltr' ? 0 : 100} stroke="#000" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
          </svg>
        ) : c.date && c.field ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 1, width: '100%', whiteSpace: 'nowrap' }}>
            <SubInput field={`${c.field}_y`} formId={inputPrefix} width="2em" maxLength={2} ariaLabel={`${c.ariaLabel ?? c.field}（年）`} g={g} u={u} onKeyDown={onEnterNext} />年
            <SubInput field={`${c.field}_m`} formId={inputPrefix} width="2em" maxLength={2} ariaLabel={`${c.ariaLabel ?? c.field}（月）`} g={g} u={u} onKeyDown={onEnterNext} />月
            <SubInput field={`${c.field}_d`} formId={inputPrefix} width="2em" maxLength={2} ariaLabel={`${c.ariaLabel ?? c.field}（日）`} g={g} u={u} onKeyDown={onEnterNext} />日
            {c.dateSuffix && <span style={{ paddingLeft: '0.6em' }}>{c.dateSuffix}</span>}
          </span>
        ) : c.zip && c.field ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4, width: '100%', whiteSpace: 'nowrap' }}>
            <SubInput field={`${c.field}_1`} formId={inputPrefix} width="3.2em" maxLength={3} ariaLabel={`${c.ariaLabel ?? c.field}（上3桁）`} g={g} u={u} onKeyDown={onEnterNext} />―
            <SubInput field={`${c.field}_2`} formId={inputPrefix} width="4.2em" maxLength={4} ariaLabel={`${c.ariaLabel ?? c.field}（下4桁）`} g={g} u={u} onKeyDown={onEnterNext} />
          </span>
        ) : c.tel && c.field ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4, width: '100%', whiteSpace: 'nowrap' }}>
            <SubInput field={`${c.field}_1`} formId={inputPrefix} width="4em" maxLength={5} ariaLabel={`${c.ariaLabel ?? c.field}（市外局番）`} g={g} u={u} onKeyDown={onEnterNext} />―
            <SubInput field={`${c.field}_2`} formId={inputPrefix} width="4em" maxLength={4} ariaLabel={`${c.ariaLabel ?? c.field}（市内局番）`} g={g} u={u} onKeyDown={onEnterNext} />―
            <SubInput field={`${c.field}_3`} formId={inputPrefix} width="4em" maxLength={4} ariaLabel={`${c.ariaLabel ?? c.field}（加入者番号）`} g={g} u={u} onKeyDown={onEnterNext} />
          </span>
        ) : c.kind === 'input' && c.field && c.options ? (
          printRendering
            ? <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: justify, overflow: 'hidden' }}>{c.compactSelectedOption ? g(c.field) : selectedOptionLabel(c.options, g(c.field))}</div>
            : (
              <select
                id={`${inputPrefix}-${c.field}-${i}`}
                name={`${inputPrefix}.${c.field}`}
                aria-label={`${c.ariaLabel ?? c.field}${g(c.field) ? `：${selectedOptionLabel(c.options, g(c.field))}` : ''}`}
                title={selectedOptionLabel(c.options, g(c.field)) || undefined}
                value={g(c.field)}
                onChange={(e) => {
                  u(c.field!, e.target.value);
                  if (c.autoFill) u(c.autoFill.field, c.autoFill.byValue[e.target.value] ?? '');
                }}
                onKeyDown={onEnterNext}
                style={{ width: '100%', height: '100%', border: 'none', outline: 'none', textAlign: 'left', fontSize: 'inherit', background: 'transparent', padding: '0 7px 0 0', boxSizing: 'border-box', fontFamily: 'inherit', appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', backgroundImage: SELECT_ARROW, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1px center', backgroundSize: '5px', cursor: 'pointer' }}
              >
                {c.options.map((option) => {
                  const o = typeof option === 'string' ? { value: option, label: option } : option;
                  const label = c.compactSelectedOption && o.value !== '' && o.value === g(c.field!) ? o.value : o.label;
                  return <option key={o.value || 'blank'} value={o.value}>{label}</option>;
                })}
              </select>
            )
        ) : c.kind === 'input' && c.field ? (
          <>
            {c.cornerLabel && <span style={{ position: 'absolute', top: 1, left: 2, fontSize: 6, lineHeight: 1, color: '#777', pointerEvents: 'none', zIndex: 1, whiteSpace: 'nowrap' }}>{c.cornerLabel}</span>}
            {printRendering ? (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: c.align === 'left' ? 'flex-start' : c.align === 'center' ? 'center' : 'flex-end', overflow: 'hidden', background: 'transparent', paddingRight: c.rightLabel ? 22 : 0, boxSizing: 'border-box', whiteSpace: 'nowrap' }}>
                {c.signedCommaInteger ? formatSignedCommaInteger(g(c.field)) : c.commaInteger ? formatCommaInteger(g(c.field)) : c.integerDigits !== undefined ? normalizeInteger(g(c.field)) : g(c.field)}
              </div>
            ) : (
              <input
                id={`${inputPrefix}-${c.field}-${i}`}
                name={`${inputPrefix}.${c.field}`}
                aria-label={c.ariaLabel ?? c.field}
                value={c.signedCommaInteger ? formatSignedCommaInteger(g(c.field)) : c.commaInteger ? formatCommaInteger(g(c.field)) : c.integerDigits !== undefined ? normalizeInteger(g(c.field)) : g(c.field)}
                onChange={(e) => {
                  const next = c.decimalPlaces !== undefined ? sanitizeDecimal(e.target.value, c.decimalPlaces)
                    : c.signedCommaInteger ? formatSignedCommaInteger(e.target.value)
                    : c.commaInteger ? formatCommaInteger(e.target.value)
                    : c.integerDigits !== undefined ? normalizeInteger(e.target.value).slice(0, c.integerDigits)
                    : e.target.value;
                  u(c.field!, next);
                }}
                onBlur={() => { if (!c.readOnly && c.decimalPlaces !== undefined) u(c.field!, formatFixedDecimal(g(c.field!), c.decimalPlaces)); }}
                onKeyDown={onEnterNext}
                inputMode={c.signedCommaInteger ? 'text' : c.decimalPlaces !== undefined ? 'decimal' : c.integerDigits || c.commaInteger ? 'numeric' : undefined}
                maxLength={c.integerDigits}
                readOnly={c.readOnly}
                tabIndex={c.readOnly ? -1 : undefined}
                style={{ width: '100%', height: '100%', border: 'none', outline: 'none', textAlign: c.align ?? 'right', fontSize: 'inherit', background: c.readOnly ? '#f7f7f7' : 'transparent', padding: 0, paddingRight: c.rightLabel ? 22 : 0, boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
            )}
          </>
        ) : c.kind === 'label' || c.text ? (
          text.includes('\n')
            ? <span style={{ whiteSpace: c.noWrap ? 'pre' : 'pre-line', width: '100%', textAlign: c.align ?? 'center' }}>{text}</span>
            : text
        ) : null}
      </div>
    );
  };

  // semanticRole:'group' のセルは、その矩形に収まる子セルをまとめて role="group" で包む
  const rendered = useMemo(() => {
    const containedBy = (entry: (typeof placed)[number], group: (typeof placed)[number]) => (
      entry !== group
      && entry.c.left >= group.c.left - 0.2
      && entry.c.top >= group.c.top - 0.2
      && entry.c.left + entry.c.width <= group.c.left + group.c.width + 0.2
      && entry.c.top + entry.c.height <= group.c.top + group.c.height + 0.2
    );
    const groups = placed.filter((entry) => entry.c.semanticRole === 'group');
    const grouped = new Set<number>();
    groups.forEach((group) => placed.forEach((entry, index) => { if (containedBy(entry, group)) grouped.add(index); }));
    return { containedBy, grouped };
    // renderCell は毎レンダー再生成されるため依存に入れない（配置計算だけをメモ化する）
  }, [placed]);

  return (
    <div style={{ width: '100%', margin: '0 auto', height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {title && (formCode ? (
        <div style={{ flexShrink: 0, padding: '2px 0 6px', fontFamily: FORM_FONT }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', minHeight: 22 }}>
            <div style={{ display: 'inline-flex', border: '1px solid #000', fontSize: 11, lineHeight: 1.5 }}>
              <span style={{ padding: '1px 8px', borderRight: '1px solid #000' }}>様式ID</span>
              <span style={{ padding: '1px 14px', letterSpacing: '0.08em' }}>{formCode}</span>
            </div>
            {toolbar && <div className="no-print" style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)' }}>{toolbar}</div>}
          </div>
          <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 13, lineHeight: 1.3, marginTop: 4 }}>{title}</div>
          {subtitle && <div style={{ textAlign: 'center', fontSize: 11, lineHeight: 1.3, marginTop: 2 }}>{subtitle}</div>}
        </div>
      ) : (
        <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '2px 0 4px', fontFamily: FORM_FONT }}>
          <span style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.3 }}>{title}</span>
          {toolbar}
        </div>
      ))}
      <div
        ref={gridRef}
        style={{ width: '100%', aspectRatio, flex: '1 1 auto', minHeight: 0, display: 'grid', gridTemplateColumns: colTmpl, gridTemplateRows: rowTmpl, boxSizing: 'border-box', fontFamily: FORM_FONT, position: 'relative' }}
      >
        {placed.map((entry, index) => {
          if (entry.c.semanticRole !== 'group') return rendered.grouped.has(index) ? null : renderCell(entry, index);
          const members = placed
            .map((candidate, memberIndex) => ({ candidate, memberIndex }))
            .filter(({ candidate }) => rendered.containedBy(candidate, entry));
          return (
            <div key={`group-${index}`} role="group" aria-label={entry.c.ariaLabel} style={{ display: 'contents' }}>
              {entry.c.groupBorder === false ? null : renderCell({ ...entry, c: { ...entry.c, semanticRole: 'presentation', ariaLabel: undefined } }, index)}
              {members.map(({ candidate, memberIndex }) => renderCell(candidate, memberIndex))}
            </div>
          );
        })}
      </div>
      {footer && <div style={{ flexShrink: 0 }}>{footer}</div>}
    </div>
  );
}
