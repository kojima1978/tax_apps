import { useMemo, useRef, useCallback, useId, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';

/** グリッドセル定義（座標・サイズは％） */
export interface GridCell {
  top: number;
  left: number;
  width: number;
  height: number;
  kind?: 'cell' | 'input' | 'label'; // cell=枠のみ, input=入力, label=固定文字
  text?: string;                     // label/cell の表示文字
  field?: string;                    // input のフィールドキー
  ariaLabel?: string;                // 入力欄のアクセシブル名
  align?: 'left' | 'center' | 'right';
  fontSize?: number;
  bold?: boolean;
  noWrap?: boolean;                  // 明示改行以外では折り返さない
  cornerLabel?: string;             // 入力欄の左上に表示する固定ラベル
  topRightLabel?: string;            // セルの右上に表示する固定ラベル
  rightLabel?: string;               // セルの右端中央に表示する固定ラベル
  integerDigits?: number;            // 数字のみの最大桁数
  commaInteger?: boolean;            // 整数を3桁区切りカンマで表示
  noLeadingZero?: boolean;           // 先頭の0を許可しない整数入力
  decimalPlaces?: number;            // 小数点以下の最大桁数（フォーカス解除時に固定表示）
  readOnly?: boolean;                 // 自動計算などの編集不可欄
  options?: string[];                 // 選択式入力の候補（空文字は未選択）
  highlightWhen?: (g: (field: string) => string) => boolean; // 自動判定時の強調条件
  diagonal?: 'tlbr' | 'bltr'; // 斜線（入力不可セル: tlbr=＼ 左上→右下, bltr=／ 左下→右上）
  date?: boolean; // 和暦◯年◯月◯日の複合入力（fieldを接頭辞に _g/_y/_m/_d を付与）
  dateRange?: boolean; // 自◯年◯月◯日／至◯年◯月◯日 の期間入力（field_from_*, field_to_*）
  link?: string; // ラベルをリンクとして表示（外部URL）
  multiline?: boolean; // 計算結果を複数行で表示（readOnly前提。\n区切り）
  emphasizeLinePrefix?: string; // 複数行ラベル内で、この文字列から始まる行を強調表示
  highlightLinePrefixes?: (g: (field: string) => string) => string[]; // 複数行ラベル内で条件に合う行を強調表示
  fractionExpression?: {
    terms: { numerator: string; denominator: string }[];
    denominator: string;
  }; // 複数の分数を加算し、さらに共通分母で割る式
  productFractionExpression?: {
    prefixLines: string[];
    numerator: string;
    denominator: string;
  }; // 説明文 × 分数の式
  weightedAverageExpression?: {
    leftLines: string[];
    rightLines: string[];
    rateField: string;
  }; // 中会社の評価額など「左項×割合＋右項×(1－割合)」の式
  simpleFraction?: {
    numerator: string;
    denominator: string;
  }; // 単純な分数
  alternativeFractions?: {
    caption?: string;
    prefix?: string;
    left: { numerator: string; denominator: string };
    right: { numerator: string; denominator: string };
    suffix?: string;
  }; // 2つの分数を「又は」で並べる式
  companyRateExpression?: {
    a: string;
    ratio: string;
    rateField: string;
    sizeField: string;
  }; // 類似業種比準価額の会社規模別斟酌率
  verticalSectionHeading?: {
    number: string;
    text: string;
    compact?: boolean;
  }; // 横書きの番号＋縦書きの見出し（途中に罫線なし）
  employeeBreakdown?: {
    regularField: string;
    regularResultField: string;
    otherField: string;
    otherRateField: string;
    otherResultField: string;
    totalField: string;
  }; // 役員を除く従業員数の換算内訳
}

interface GridFormProps {
  cells: GridCell[];
  g: (f: string) => string;
  u: (f: string, v: string) => void;
  width?: string;
  /** 枠外上部に表示する様式タイトル */
  title?: string;
  /** 枠外下部に表示する参考リンク（計算の根拠等） */
  references?: { label: string; url: string }[];
  /** タイトル行の右側に表示する操作UI（業種選択など） */
  toolbar?: ReactNode;
  /** Enterキーで循環する入力欄のaria-label順 */
  enterLoop?: string[];
  /** input/select の id・name に使用する表識別子 */
  formId?: string;
}

/** 近接する境界線を統合（tol％以内は同一線とみなす） */
function snapLines(values: number[], tol = 0.7): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  const lines: number[] = [];
  for (const v of sorted) {
    const last = lines[lines.length - 1];
    if (last === undefined || v - last > tol) lines.push(v);
  }
  return lines;
}

function nearestIndex(lines: number[], v: number): number {
  let best = 0, bd = Infinity;
  lines.forEach((l, i) => { const d = Math.abs(l - v); if (d < bd) { bd = d; best = i; } });
  return best;
}

function formatCommaInteger(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
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

/** 和暦日付の複合入力ボックス共通スタイル */
const DATE_BOX: CSSProperties = { textAlign: 'center', border: 'none', borderBottom: '1px solid #aaa', outline: 'none', background: 'transparent', fontSize: 'inherit', fontFamily: 'inherit', padding: 0, minWidth: 0 };
const SELECT_ARROW = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%23888' stroke-width='1.5'/%3E%3C/svg%3E")`;

interface DateFieldsProps {
  field: string;
  formId: string;
  g: (f: string) => string;
  u: (f: string, v: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLElement>) => void;
}
/** 和暦(選択)◯年◯月◯日 の入力群（field を接頭辞に _g/_y/_m/_d） */
function DateFields({ field, formId, g, u, onKeyDown }: DateFieldsProps) {
  const num = (s: string) => (
    <input id={`${formId}-${field}_${s}`} name={`${formId}.${field}_${s}`} aria-label={`${field}_${s}`} value={g(`${field}_${s}`)} onChange={(e) => u(`${field}_${s}`, e.target.value.replace(/\D/g, '').slice(0, 2))} onKeyDown={onKeyDown} maxLength={2} inputMode="numeric" style={{ ...DATE_BOX, width: '2em' }} />
  );
  return (
    <>
      <select id={`${formId}-${field}_g`} name={`${formId}.${field}_g`} aria-label={`${field}_g`} value={g(`${field}_g`) || '令和'} onChange={(e) => u(`${field}_g`, e.target.value)} onKeyDown={onKeyDown} style={{ ...DATE_BOX, width: '4.4em', borderBottom: 'none', appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', textAlignLast: 'center', cursor: 'pointer', paddingRight: '9px', backgroundImage: SELECT_ARROW, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1px center', backgroundSize: '7px' }}>
        <option value="令和">令和</option>
        <option value="平成">平成</option>
      </select>
      {num('y')}年{num('m')}月{num('d')}日
    </>
  );
}

/**
 * 測定した矩形（cells）から CSS グリッドを自動導出して描画。
 * 各矩形の left/right を縦線、top/bottom を横線として grid-template を生成し、
 * 各セルを grid-column / grid-row で配置する。背景画像は不要。
 */
export function GridForm({ cells, g, u, width = '100%', title, references, toolbar, enterLoop, formId }: GridFormProps) {
  const generatedId = useId().replace(/:/g, '');
  const inputPrefix = formId ?? `grid-${generatedId}`;
  const { colTmpl, rowTmpl, placed } = useMemo(() => {
    const xs = snapLines(cells.flatMap((c) => [c.left, c.left + c.width]));
    const ys = snapLines(cells.flatMap((c) => [c.top, c.top + c.height]));
    const colTmpl = xs.slice(1).map((x, i) => `${(x - xs[i]!).toFixed(3)}fr`).join(' ');
    const rowTmpl = ys.slice(1).map((y, i) => `${(y - ys[i]!).toFixed(3)}fr`).join(' ');
    const placed = cells.map((c) => ({
      c,
      cs: nearestIndex(xs, c.left) + 1,
      ce: nearestIndex(xs, c.left + c.width) + 1,
      rs: nearestIndex(ys, c.top) + 1,
      re: nearestIndex(ys, c.top + c.height) + 1,
    }));
    return { colTmpl, rowTmpl, placed };
  }, [cells]);

  const gridRef = useRef<HTMLDivElement>(null);
  // Enter で次の入力欄（DOM順＝右→下）へフォーカス移動
  const onEnterNext = useCallback((e: KeyboardEvent<HTMLElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const items = Array.from(gridRef.current?.querySelectorAll<HTMLElement>('input, select') ?? []);
    const currentLabel = e.currentTarget.getAttribute('aria-label');
    if (currentLabel && enterLoop?.includes(currentLabel)) {
      const nextLabel = enterLoop[(enterLoop.indexOf(currentLabel) + 1) % enterLoop.length]!;
      items.find((item) => item.getAttribute('aria-label') === nextLabel)?.focus();
      return;
    }
    const idx = items.indexOf(e.currentTarget);
    if (idx >= 0 && idx + 1 < items.length) items[idx + 1]!.focus();
  }, [enterLoop]);

  return (
    <div style={{ width, margin: '0 auto' }}>
      {title && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '2px 0 4px', fontFamily: '"Noto Sans JP", sans-serif' }}>
          <span style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.3 }}>{title}</span>
          {toolbar}
        </div>
      )}
      <div ref={gridRef} style={{ width: '100%', aspectRatio: '210 / 297', display: 'grid', gridTemplateColumns: colTmpl, gridTemplateRows: rowTmpl, border: '1.5px solid #000', boxSizing: 'border-box', fontFamily: '"Noto Sans JP", sans-serif' }}>
      {placed.map(({ c, cs, ce, rs, re }, i) => {
        // 縦長のラベルは縦書き（帯見出し）。スペースは縦書き時に除去。
        const ratio = c.height / c.width;
        const isVertical = c.kind === 'label' && ratio > 2.5 && !c.verticalSectionHeading;
        const raw = c.text ?? '';
        const text = isVertical ? raw.replace(/[ 　]/g, '') : raw;
        // 文字数に応じて自動縮小（長文ラベルがはみ出さないように）
        const len = raw.length;
        const fontSize = c.fontSize ?? (isVertical ? 8 : len > 40 ? 6 : len > 24 ? 6.5 : len > 12 ? 7.5 : 9);
        const justify = c.align === 'left' ? 'flex-start' : c.align === 'right' ? 'flex-end' : 'center';
        const highlighted = c.highlightWhen?.(g) ?? false;
        return (
          <div key={i} style={{
            gridColumn: `${cs} / ${ce}`,
            gridRow: `${rs} / ${re}`,
            border: '0.5px solid #000',
            position: c.diagonal || c.cornerLabel || c.topRightLabel || c.rightLabel ? 'relative' : undefined,
            display: 'flex',
            alignItems: 'center',
            justifyContent: isVertical ? (c.align === 'center' ? 'center' : 'flex-start') : justify,
            writingMode: isVertical ? 'vertical-rl' : undefined,
            fontSize,
            fontWeight: c.bold || highlighted ? 700 : 400,
            background: highlighted ? '#fff3b0' : undefined,
            boxShadow: highlighted ? 'inset 0 0 0 1.5px #d97706' : undefined,
            padding: '1px 2px', boxSizing: 'border-box', overflow: 'hidden',
            lineHeight: 1.15, wordBreak: c.noWrap ? 'normal' : 'break-all', whiteSpace: c.noWrap ? 'nowrap' : 'normal', textAlign: 'center',
          }}>
            {c.topRightLabel && <span style={{ position: 'absolute', top: 1, right: 2, fontSize: 7, lineHeight: 1, pointerEvents: 'none' }}>{c.topRightLabel}</span>}
            {c.rightLabel && <span style={{ position: 'absolute', top: '50%', right: 2, transform: 'translateY(-50%)', fontSize: 7, lineHeight: 1, pointerEvents: 'none' }}>{c.rightLabel}</span>}
            {c.diagonal ? (
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                <line x1="0" y1={c.diagonal === 'bltr' ? 100 : 0} x2="100" y2={c.diagonal === 'bltr' ? 0 : 100} stroke="#000" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
              </svg>
            ) : c.date && c.field ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, width: '100%', height: '100%', whiteSpace: 'nowrap' }}>
                <DateFields field={c.field} formId={inputPrefix} g={g} u={u} onKeyDown={onEnterNext} />
              </div>
            ) : c.dateRange && c.field ? (
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1, width: '100%', height: '100%', fontSize: '0.95em' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, whiteSpace: 'nowrap' }}>自<DateFields field={`${c.field}_from`} formId={inputPrefix} g={g} u={u} onKeyDown={onEnterNext} /></div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, whiteSpace: 'nowrap' }}>至<DateFields field={`${c.field}_to`} formId={inputPrefix} g={g} u={u} onKeyDown={onEnterNext} /></div>
              </div>
            ) : c.kind === 'input' && c.employeeBreakdown ? (
              <div style={{ width: '100%', height: '100%', display: 'grid', gridTemplateRows: 'repeat(3, minmax(0, 1fr))', alignItems: 'stretch', gap: 0, padding: '2px 3px', boxSizing: 'border-box', fontSize: 6.5, lineHeight: 1.1 }}>
                <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr', alignItems: 'stretch', minHeight: 0 }}>
                  <div style={{ padding: '1px 3px', fontWeight: 700, textAlign: 'left', whiteSpace: 'nowrap' }}>
                    継続従業員 （5時間以上/日）
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '4.5em 1.8em 4em 1em 5em 1em', alignItems: 'center', justifyContent: 'end', gap: 2, padding: '0 3px', whiteSpace: 'nowrap' }}>
                    <input id={`${inputPrefix}-${c.employeeBreakdown.regularField}`} name={`${inputPrefix}.${c.employeeBreakdown.regularField}`} aria-label="継続従業員数" title="1から9999までの整数を入力してください" value={g(c.employeeBreakdown.regularField)} onChange={(e) => { const digits = e.target.value.replace(/\D/g, ''); if (digits.startsWith('0')) return; u(c.employeeBreakdown!.regularField, digits.slice(0, 4)); }} onKeyDown={onEnterNext} inputMode="numeric" pattern="[1-9][0-9]{0,3}" maxLength={4} style={{ ...DATE_BOX, width: '100%', textAlign: 'right' }} />
                    <span>人×</span>
                    <span style={{ textAlign: 'left' }}>1.0</span>
                    <span>=</span>
                    <span style={{ textAlign: 'right' }}>{g(c.employeeBreakdown.regularResultField)}</span>
                    <span>人</span>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr', alignItems: 'stretch', minHeight: 0, borderTop: '1px dashed #777' }}>
                  <div style={{ padding: '1px 3px', fontWeight: 700, textAlign: 'left', whiteSpace: 'nowrap' }}>
                    継続従業員以外 （5時間以下/日）
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '4.5em 1.8em 4em 1em 5em 1em', alignItems: 'center', justifyContent: 'end', gap: 2, padding: '0 3px', whiteSpace: 'nowrap' }}>
                    <input id={`${inputPrefix}-${c.employeeBreakdown.otherField}`} name={`${inputPrefix}.${c.employeeBreakdown.otherField}`} aria-label="継続従業員以外の人数" title="1から9999までの整数を入力してください" value={g(c.employeeBreakdown.otherField)} onChange={(e) => { const digits = e.target.value.replace(/\D/g, ''); if (digits.startsWith('0')) return; u(c.employeeBreakdown!.otherField, digits.slice(0, 4)); }} onKeyDown={onEnterNext} inputMode="numeric" pattern="[1-9][0-9]{0,3}" maxLength={4} style={{ ...DATE_BOX, width: '100%', textAlign: 'right' }} />
                    <span>人×</span>
                    <select id={`${inputPrefix}-${c.employeeBreakdown.otherRateField}`} name={`${inputPrefix}.${c.employeeBreakdown.otherRateField}`} aria-label="継続従業員以外の換算係数" value={g(c.employeeBreakdown.otherRateField)} onChange={(e) => u(c.employeeBreakdown!.otherRateField, e.target.value)} onKeyDown={onEnterNext} style={{ ...DATE_BOX, width: '100%', textAlign: 'left', appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', paddingRight: 8, backgroundImage: SELECT_ARROW, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1px center', backgroundSize: '6px' }}>
                      {Array.from({ length: 9 }, (_, index) => ((index + 1) / 10).toFixed(1)).map((rate) => <option key={rate} value={rate}>{rate}</option>)}
                    </select>
                    <span>=</span>
                    <span style={{ textAlign: 'right' }}>{g(c.employeeBreakdown.otherResultField)}</span>
                    <span>人</span>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr', alignItems: 'stretch', minHeight: 0, borderTop: '1px dashed #777' }}>
                  <div style={{ padding: '1px 3px', fontWeight: 700, textAlign: 'left' }}>合計</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 3px', fontWeight: 700, textAlign: 'right' }}>
                    {g(c.employeeBreakdown.totalField)}人
                  </div>
                </div>
              </div>
            ) : c.kind === 'input' && c.field && c.multiline ? (
              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: c.align === 'left' ? 'flex-start' : 'flex-end', whiteSpace: 'pre-line', textAlign: 'right', overflow: 'hidden', background: c.readOnly ? '#f7f7f7' : undefined, lineHeight: 1.4 }}>
                {g(c.field)}
              </div>
            ) : c.kind === 'input' && c.field && c.options
              ? <select id={`${inputPrefix}-${c.field}-${i}`} name={`${inputPrefix}.${c.field}`} aria-label={c.ariaLabel ?? c.field} value={g(c.field)} onChange={(e) => u(c.field!, e.target.value)} onKeyDown={onEnterNext} style={{ width: '100%', height: '100%', border: 'none', outline: 'none', textAlign: 'left', fontSize: 6, backgroundColor: 'transparent', padding: '0 7px 0 0', boxSizing: 'border-box', fontFamily: 'inherit', appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', backgroundImage: SELECT_ARROW, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1px center', backgroundSize: '5px' }}>
                  {c.options.map((option) => <option key={option || 'blank'} value={option}>{option}</option>)}
                </select>
              : c.kind === 'input' && c.field
              ? <>
                  {c.cornerLabel && <span style={{ position: 'absolute', top: 1, left: 2, fontSize: 7, lineHeight: 1, pointerEvents: 'none' }}>{c.cornerLabel}</span>}
                  <input id={`${inputPrefix}-${c.field}-${i}`} name={`${inputPrefix}.${c.field}`} aria-label={c.ariaLabel ?? c.field} value={c.commaInteger ? formatCommaInteger(g(c.field)) : g(c.field)} onChange={(e) => { const digits = e.target.value.replace(/\D/g, ''); if (c.noLeadingZero && digits.startsWith('0')) return; const next = c.commaInteger ? formatCommaInteger(e.target.value) : c.decimalPlaces !== undefined ? sanitizeDecimal(e.target.value, c.decimalPlaces) : c.integerDigits ? digits.slice(0, c.integerDigits) : e.target.value; u(c.field!, next); }} onBlur={() => { if (!c.readOnly && c.decimalPlaces !== undefined) u(c.field!, formatFixedDecimal(g(c.field!), c.decimalPlaces)); }} onKeyDown={onEnterNext} inputMode={c.decimalPlaces !== undefined ? 'decimal' : c.integerDigits || c.commaInteger ? 'numeric' : undefined} maxLength={c.integerDigits} readOnly={c.readOnly} style={{ width: '100%', height: '100%', border: 'none', outline: 'none', textAlign: c.align ?? 'right', fontSize: 'inherit', background: c.readOnly ? '#f7f7f7' : 'transparent', padding: 0, paddingRight: c.rightLabel ? 10 : 0, boxSizing: 'border-box', fontFamily: 'inherit' }} />
                </>
              : c.kind === 'label' && c.verticalSectionHeading ? (
                <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', width: '100%', height: '100%' }}>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: c.verticalSectionHeading.compact ? undefined : '2.5em', lineHeight: c.verticalSectionHeading.compact ? 1 : undefined, writingMode: 'horizontal-tb' }}>{c.verticalSectionHeading.number}</span>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, writingMode: 'vertical-rl' }}>{c.verticalSectionHeading.text.replace(/[ 　]/g, '')}</span>
                </span>
              ) : c.kind === 'label' && c.companyRateExpression ? (
                <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.2em', width: '98%', height: '100%', lineHeight: 1.15, whiteSpace: 'nowrap' }}>
                  <span style={{ fontSize: '1.15em' }}>{c.companyRateExpression.a} × {c.companyRateExpression.ratio} × {g(c.companyRateExpression.rateField) || '___'}</span>
                  {[
                    { key: 'large', text: '大会社は0.7' },
                    { key: 'medium', text: '中会社は0.6' },
                    { key: 'small', text: '小会社は0.5' },
                  ].map((option) => {
                    const selected = g(c.companyRateExpression!.sizeField) === option.key;
                    return <span key={option.key} style={{ padding: '0 0.35em', fontWeight: selected ? 700 : 400, background: selected ? '#fff3b0' : undefined, boxShadow: selected ? 'inset 0 0 0 0.7px #d97706' : undefined }}>{option.text}</span>;
                  })}
                  <span>とします。</span>
                </span>
              ) : c.kind === 'label' && c.alternativeFractions ? (
                <span style={{ display: 'inline-flex', flexDirection: c.alternativeFractions.caption ? 'column' : 'row', alignItems: 'center', justifyContent: 'center', gap: c.alternativeFractions.caption ? '0.15em' : 0, width: '98%', height: '100%', lineHeight: 1, whiteSpace: 'nowrap' }}>
                  {c.alternativeFractions.caption && <span>{c.alternativeFractions.caption}</span>}
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.35em' }}>
                    {c.alternativeFractions.prefix && <span>{c.alternativeFractions.prefix}</span>}
                    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'stretch', minWidth: '2em' }}>
                      <span style={{ borderBottom: '0.7px solid #000', padding: '0 0.25em 1px' }}>{c.alternativeFractions.left.numerator}</span>
                      <span style={{ paddingTop: 1 }}>{c.alternativeFractions.left.denominator}</span>
                    </span>
                    <span>又は</span>
                    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'stretch', minWidth: '5.5em' }}>
                      <span style={{ borderBottom: '0.7px solid #000', padding: '0 0.25em 1px' }}>{c.alternativeFractions.right.numerator}</span>
                      <span style={{ paddingTop: 1 }}>{c.alternativeFractions.right.denominator}</span>
                    </span>
                    {c.alternativeFractions.suffix && <span>{c.alternativeFractions.suffix}</span>}
                  </span>
                </span>
              ) : c.kind === 'label' && c.simpleFraction ? (
                <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'center', minWidth: '2.5em', lineHeight: 1 }}>
                  <span style={{ borderBottom: '0.7px solid #000', padding: '0 0.45em 1px' }}>{c.simpleFraction.numerator}</span>
                  <span style={{ paddingTop: 1 }}>{c.simpleFraction.denominator}</span>
                </span>
              ) : c.kind === 'label' && c.productFractionExpression ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '1.6em', width: '96%', height: '100%', lineHeight: 1.05, whiteSpace: 'nowrap' }}>
                  <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    {c.productFractionExpression.prefixLines.map((line, index) => <span key={`${line}-${index}`}>{line}</span>)}
                  </span>
                  <span>×</span>
                  <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'stretch', minWidth: '8em' }}>
                    <span style={{ borderBottom: '0.7px solid #000', padding: '0 0.6em 1px' }}>{c.productFractionExpression.numerator}</span>
                    <span style={{ paddingTop: 1 }}>{c.productFractionExpression.denominator}</span>
                  </span>
                </span>
              ) : c.kind === 'label' && c.weightedAverageExpression ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.3em', width: '99%', height: '100%', lineHeight: 1, whiteSpace: 'nowrap' }}>
                  <span>（</span>
                  <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
                    {c.weightedAverageExpression.leftLines.map((line, index) => <span key={`${line}-${index}`}>{line}</span>)}
                  </span>
                  <span>×</span>
                  <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'stretch', minWidth: '4.5em', textAlign: 'center' }}>
                    <span style={{ borderBottom: '0.7px solid #000', padding: '0 0.25em 1px' }}>Lの割合</span>
                    <span style={{ paddingTop: 1 }}>{g(c.weightedAverageExpression.rateField) || '0._'}</span>
                  </span>
                  <span>）＋（</span>
                  <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
                    {c.weightedAverageExpression.rightLines.map((line, index) => <span key={`${line}-${index}`}>{line}</span>)}
                  </span>
                  <span>×（1－</span>
                  <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'stretch', minWidth: '4.5em', textAlign: 'center' }}>
                    <span style={{ borderBottom: '0.7px solid #000', padding: '0 0.25em 1px' }}>Lの割合</span>
                    <span style={{ paddingTop: 1 }}>{g(c.weightedAverageExpression.rateField) || '0._'}</span>
                  </span>
                  <span>））</span>
                </span>
              ) : c.kind === 'label' && c.fractionExpression ? (
                <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'center', width: '94%', height: '100%', lineHeight: 1 }}>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.55em', borderBottom: '0.7px solid #000', padding: '0 0.35em 1px' }}>
                    {c.fractionExpression.terms.map((term, index) => (
                      <span key={`${term.numerator}-${term.denominator}-${index}`} style={{ display: 'contents' }}>
                        {index > 0 && <span>＋</span>}
                        <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'stretch', minWidth: '2em' }}>
                          <span style={{ borderBottom: '0.7px solid #000', paddingBottom: 1 }}>{term.numerator}</span>
                          <span style={{ paddingTop: 1 }}>{term.denominator}</span>
                        </span>
                      </span>
                    ))}
                  </span>
                  <span style={{ paddingTop: 1 }}>{c.fractionExpression.denominator}</span>
                </span>
              ) : c.kind === 'label' ? (
                c.link ? (
                  <a href={c.link} target="_blank" rel="noopener noreferrer" style={{ color: '#1d4ed8', textDecoration: 'underline', whiteSpace: text.includes('\n') ? 'pre-line' : 'normal', width: '100%', textAlign: c.align ?? 'center', display: 'block' }}>{text}</a>
                ) : c.emphasizeLinePrefix || c.highlightLinePrefixes ? (
                  <span style={{ width: '100%', textAlign: c.align ?? 'center' }}>
                    {text.split('\n').map((line, index) => {
                      const prefixes = c.highlightLinePrefixes?.(g) ?? (c.emphasizeLinePrefix ? [c.emphasizeLinePrefix] : []);
                      const emphasized = prefixes.some((prefix) => line.startsWith(prefix));
                      return (
                        <span key={`${line}-${index}`} style={{ display: 'block', minHeight: '1.15em', padding: emphasized ? '1px 3px' : undefined, boxSizing: 'border-box', fontWeight: emphasized ? 700 : undefined, fontSize: emphasized ? '1.15em' : undefined, background: emphasized ? '#fff3b0' : undefined, boxShadow: emphasized ? 'inset 0 0 0 1px #d97706' : undefined }}>
                          {line || '\u00a0'}
                        </span>
                      );
                    })}
                  </span>
                ) : (
                  text.includes('\n') ? <span style={{ whiteSpace: c.noWrap ? 'pre' : 'pre-line', width: '100%', textAlign: c.align ?? 'center' }}>{text}</span> : text
                )
              ) : null}
          </div>
        );
      })}
      </div>
      {references && references.length > 0 && (
        <div style={{ padding: '4px 0 0', fontSize: 10, fontFamily: '"Noto Sans JP", sans-serif', color: '#555', display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
          <span style={{ fontWeight: 600 }}>計算の根拠：</span>
          {references.map((r, i) => (
            <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" style={{ color: '#1d4ed8', textDecoration: 'underline' }}>{r.label}</a>
          ))}
        </div>
      )}
    </div>
  );
}
