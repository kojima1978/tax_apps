import { createContext, useContext, useMemo, useRef, useCallback, useId, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';

/** グリッドセル定義（座標・サイズは％） */
export interface GridCell {
  top: number;
  left: number;
  width: number;
  height: number;
  exactPosition?: boolean;          // 近接する罫線へ吸着せず、測定座標をそのまま使用
  kind?: 'cell' | 'input' | 'label'; // cell=枠のみ, input=入力, label=固定文字
  text?: string;                     // label/cell の表示文字
  field?: string;                    // input のフィールドキー
  ariaLabel?: string;                // 入力欄のアクセシブル名
  semanticRole?: 'group' | 'columnheader' | 'rowheader' | 'presentation';
  groupBorder?: boolean;             // group の外枠セルを描画するか（既存罫線を利用する場合は false）
  align?: 'left' | 'center' | 'right';
  textAlign?: 'left' | 'center' | 'right';
  fontSize?: number;
  forceHorizontal?: boolean;         // 縦長セルでも横書きを維持する
  forceVertical?: boolean;           // セル比率にかかわらず縦書きにする
  bold?: boolean;
  noWrap?: boolean;                  // 明示改行以外では折り返さない
  cornerLabel?: string;             // 入力欄の左上に表示する固定ラベル
  cornerLabelTop?: number;          // 固定ラベルの上端位置（px）
  codeLabel?: string;               // 様式の識別コード（E01/G04等）をセル左上に小さく表示
  topRightLabel?: string;            // セルの右上に表示する固定ラベル
  bottomLabel?: string;              // セル下部に表示する固定注記
  bottomLabelAlign?: 'left' | 'right'; // セル下部の固定注記の配置
  bottomSegments?: { text: string; width: number }[]; // 直下の複数セル幅に合わせた下部注記
  rightLabel?: string;               // セルの右端中央に表示する固定ラベル
  integerDigits?: number;            // 数字のみの最大桁数
  commaInteger?: boolean;            // 整数を3桁区切りカンマで表示
  signedCommaInteger?: boolean;      // マイナスを許可する整数を3桁区切りカンマで表示
  noLeadingZero?: boolean;           // 先頭の0を許可しない整数入力
  decimalPlaces?: number;            // 小数点以下の最大桁数（フォーカス解除時に固定表示）
  readOnly?: boolean;                 // 自動計算などの編集不可欄
  readOnlyWhen?: (g: (field: string) => string) => boolean; // 条件付きの編集不可（例: コード「その他」以外は名称欄をロック）
  jumpTo?: { tab: string; field: string; hint?: string }; // 自動転記欄クリックで入力元へ移動
  contextMenu?: { label: string; copyFrom: string; copyTo: string }[]; // 右クリックメニュー（copyFromの値をcopyToへコピー）
  options?: (string | { value: string; label: string })[]; // 選択式入力の候補（空文字は未選択。value=保存値/label=表示。文字列は両者同一）
  compactSelectedOption?: boolean;    // 選択中の項目はvalue（コード）のみ表示（狭いコード記入枠用。リストを開くと全文表示）
  highlightWhen?: (g: (field: string) => string) => boolean; // 自動判定時の強調条件
  selectValue?: { field: string; value: string }; // セルをクリックして指定値を選択
  toggleField?: string; // セルをクリックして指定フィールドをオン・オフ
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
    suffix?: string; // 式の右に置く記号（様式の「＝」など）
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
  titledFraction?: {
    titleLines: string[];
    numeratorLines: string[];
    denominator: string;
    suffix?: string;
  }; // 表題付きの分数（第4表の2 ㉜の修正比準価額など）
  fractionProductExpression?: {
    left: { numerator: string; denominator: string; valueField?: string };
    right: { numerator: string; denominator: string; valueField?: string };
    suffix?: string;
  }; // 2つの分数を掛ける式
  stackedDivisionExpression?: {
    dividendLines: string[];
    divisor: string;
    suffix?: string;
  }; // 複数行を一塊にした被除数 ÷ 除数の式
  subtractionAmountExpression?: {
    leftLabelLines: string[];
    leftValueField: string;
    rightLabelLines: string[];
    rightYenField: string;
    rightSenField?: string;
    underlineRight?: boolean;
    leftLabelNoWrap?: boolean;
    rightLabelNoWrap?: boolean;
  }; // 金額（自動転記）－金額（円・銭入力）の式
  editableSubtractionExpression?: {
    leftLabelLines: string[];
    leftYenField: string;
    leftSenField?: string;
    rightLabelLines: string[];
    rightYenField: string;
    rightSenField?: string;
    parenthesized?: boolean;
  }; // 入力金額同士を差し引く式
  allocationAdjustmentExpression?: {
    baseLabelLines: string[];
    baseValueField: string;
    paymentLabelLines: string[];
    paymentField: string;
    allocationLabelLines: string[];
    allocationField: string;
    issuedLabelLines: string[];
    issuedField: string;
  }; // 株式の割当て等による修正価額の式
  alternativeFractions?: {
    caption?: string;
    prefix?: string;
    left: { numerator: string; denominator: string };
    right: { numerator: string; denominator: string };
    selectedSide?: 'left' | 'right';
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
  inlineChoices?: {
    selectedKey?: string;
    choices: { key: string; label: string }[];
    separator?: string;
  }; // セル内で選択肢を横並び表示し、選択中の項目だけ囲む
  dragId?: string;
}

interface GridFormProps {
  cells: GridCell[];
  g: (f: string) => string;
  u: (f: string, v: string) => void;
  width?: string;
  /** 枠外上部に表示する様式タイトル */
  title?: string;
  /** 様式ID（例: NTA0VNA170010010）。指定時はタイトル上部に中央配置の「様式ID」枠を表示し、タイトルを中央寄せにする */
  formCode?: string;
  /** グリッドのアスペクト比（省略時 '210 / 297'＝A4全体）。氏名欄を外に出した本表など、A4の一部だけを描くときに縦横比を保つため指定 */
  aspectRatio?: string;
  /** タイトルヘッダーとグリッドの間に差し込む要素（氏名欄など、本表の外に浮く独立枠） */
  headerExtra?: ReactNode;
  /** タイトル行の右側に表示する操作UI（業種選択など） */
  toolbar?: ReactNode;
  /** グリッド上に絶対配置で重ねる操作UI（帯の上に配置する行操作など。自前で位置指定） */
  overlay?: ReactNode;
  /** Enterキーで循環する入力欄のaria-label順 */
  enterLoop?: string[];
  /** input/select の id・name に使用する表識別子 */
  formId?: string;
  /** 自動転記欄（jumpTo付き）クリック時に入力元へ移動する */
  onJump?: (target: { tab: string; field: string }) => void;
  onDragReorder?: (activeId: string, overId: string) => void;
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

/** 入力できる欄か（自動計算＝readOnly や無効化された欄はカーソル移動でスキップする） */
function isEditableField(el: Element): boolean {
  if (el instanceof HTMLInputElement) return !el.readOnly && !el.disabled;
  if (el instanceof HTMLSelectElement) return !el.disabled;
  return false;
}

function nearestIndex(lines: number[], v: number): number {
  let best = 0, bd = Infinity;
  lines.forEach((l, i) => { const d = Math.abs(l - v); if (d < bd) { bd = d; best = i; } });
  return best;
}

function normalizeInteger(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits.replace(/^0+(?=\d)/, '');
}

function formatCommaInteger(value: string): string {
  const digits = normalizeInteger(value);
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatSignedCommaInteger(value: string): string {
  const raw = value.replace(/,/g, '').trim();
  const negative = raw.startsWith('-');
  const digits = normalizeInteger(raw);
  if (negative && digits === '') return '-';
  const formatted = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return negative && formatted !== '' ? `-${formatted}` : formatted;
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
export const PrintRenderContext = createContext(false);

function formattedFieldValue(c: GridCell, g: (field: string) => string): string {
  if (!c.field) return '';
  if (c.signedCommaInteger) return formatSignedCommaInteger(g(c.field));
  if (c.commaInteger) return formatCommaInteger(g(c.field));
  if (c.integerDigits !== undefined || c.noLeadingZero) return normalizeInteger(g(c.field));
  return g(c.field);
}

interface DateFieldsProps {
  field: string;
  formId: string;
  g: (f: string) => string;
  u: (f: string, v: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLElement>) => void;
}
/** 和暦(選択)◯年◯月◯日 の入力群（field を接頭辞に _g/_y/_m/_d） */
function DateFields({ field, formId, g, u, onKeyDown }: DateFieldsProps) {
  const printRendering = useContext(PrintRenderContext);
  if (printRendering) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'baseline', justifyContent: 'center', gap: 1, width: '100%', whiteSpace: 'nowrap' }}>
        <span>{g(`${field}_g`) || '令和'}</span>
        <span>{normalizeInteger(g(`${field}_y`))}</span><span>年</span>
        <span>{normalizeInteger(g(`${field}_m`))}</span><span>月</span>
        <span>{normalizeInteger(g(`${field}_d`))}</span><span>日</span>
      </span>
    );
  }

  const num = (s: string) => (
    <input id={`${formId}-${field}_${s}`} name={`${formId}.${field}_${s}`} aria-label={`${field}_${s}`} value={normalizeInteger(g(`${field}_${s}`))} onChange={(e) => u(`${field}_${s}`, normalizeInteger(e.target.value).slice(0, 2))} onKeyDown={onKeyDown} maxLength={2} inputMode="numeric" style={{ ...DATE_BOX, width: '2em' }} />
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
export function GridForm({ cells, g, u, width = '100%', title, formCode, aspectRatio = '210 / 297', headerExtra, toolbar, overlay, enterLoop, formId, onJump, onDragReorder }: GridFormProps) {
  const printRendering = useContext(PrintRenderContext);
  const generatedId = useId().replace(/:/g, '');
  const inputPrefix = formId ?? `grid-${generatedId}`;
  const { colTmpl, rowTmpl, placed, bounds } = useMemo(() => {
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
    return {
      colTmpl,
      rowTmpl,
      placed,
      bounds: {
        left: xs[0]!,
        top: ys[0]!,
        width: xs[xs.length - 1]! - xs[0]!,
        height: ys[ys.length - 1]! - ys[0]!,
      },
    };
  }, [cells]);

  const gridRef = useRef<HTMLDivElement>(null);
  const dragIdRef = useRef<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; items: NonNullable<GridCell['contextMenu']> } | null>(null);
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
    // 現在位置より後ろで、最初に入力できる欄へ移動（自動計算欄は飛ばす）
    const idx = items.indexOf(e.currentTarget);
    if (idx < 0) return;
    items.slice(idx + 1).find(isEditableField)?.focus();
  }, [enterLoop]);

  return (
    // .gov-page（A4・overflow:hidden）の内側で縦フレックス。ヘッダーは縮まず、本表が残り高さにぴったり収まる。
    <div style={{ width, margin: '0 auto', height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {title && (formCode ? (
        // 様式ID枠つきヘッダー（様式ID＝中央上部、タイトル＝中央寄せ、toolbar＝右上のQRコード位置）
        <div style={{ flexShrink: 0, padding: '2px 0 6px', fontFamily: '"Noto Sans JP", sans-serif' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', minHeight: 22 }}>
            <div style={{ display: 'inline-flex', border: '1px solid #000', fontSize: 11, lineHeight: 1.5 }}>
              <span style={{ padding: '1px 8px', borderRight: '1px solid #000' }}>様式ID</span>
              <span style={{ padding: '1px 14px', letterSpacing: '0.08em' }}>{formCode}</span>
            </div>
            {toolbar && <div className="no-print" style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)' }}>{toolbar}</div>}
          </div>
          <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 13, lineHeight: 1.3, marginTop: 4 }}>{title}</div>
        </div>
      ) : (
        <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '2px 0 4px', fontFamily: '"Noto Sans JP", sans-serif' }}>
          <span style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.3 }}>{title}</span>
          {toolbar}
        </div>
      ))}
      {headerExtra && <div style={{ flexShrink: 0 }}>{headerExtra}</div>}
      {/* aspectRatio は親の高さが不定なときの既定サイズ。親がA4で高さ確定なら flex で残り高さにフィットする */}
      <div ref={gridRef} style={{ width: '100%', aspectRatio, flex: '1 1 auto', minHeight: 0, display: 'grid', gridTemplateColumns: colTmpl, gridTemplateRows: rowTmpl, border: '1.5px solid #000', boxSizing: 'border-box', fontFamily: '"Noto Sans JP", sans-serif', position: 'relative' }}>
      {(() => {
        const renderCell = ({ c, cs, ce, rs, re }: (typeof placed)[number], i: number) => {
        // 縦長のラベルは縦書き（帯見出し）。スペースは縦書き時に除去。
        const ratio = c.height / c.width;
        const isVertical = c.kind === 'label' && !c.verticalSectionHeading && !c.forceHorizontal && (c.forceVertical || ratio > 2.5);
        const raw = c.text ?? '';
        const text = isVertical ? raw.replace(/[ 　]/g, '') : raw;
        // 文字数に応じて自動縮小（長文ラベルがはみ出さないように）
        const len = raw.length;
        const fontSize = c.fontSize ?? (isVertical ? 8 : len > 40 ? 6 : len > 24 ? 6.5 : len > 12 ? 7.5 : 9);
        const justify = c.align === 'left' ? 'flex-start' : c.align === 'right' ? 'flex-end' : 'center';
        const highlighted = c.highlightWhen?.(g) ?? false;
        const readOnly = c.readOnly || (c.readOnlyWhen?.(g) ?? false);
        const selectable = c.selectValue;
        const toggleField = c.toggleField;
        const dragId = c.dragId;
        const isDragHandle = dragId !== undefined;
        const dragOver = isDragHandle && dragOverId === dragId;
        const interactive = selectable || toggleField || isDragHandle;
        const selectCell = () => {
          if (toggleField) {
            u(toggleField, g(toggleField) === '1' ? '' : '1');
          } else if (selectable) {
            // 同じ値を再クリックしたら解除（トグル）
            u(selectable.field, g(selectable.field) === selectable.value ? '' : selectable.value);
          }
        };
        return (
          <div
            key={i}
            className="gf-cell"
            role={isDragHandle ? 'button' : toggleField ? 'checkbox' : selectable ? 'button' : c.semanticRole}
            tabIndex={selectable || toggleField ? 0 : undefined}
            aria-label={interactive ? c.ariaLabel ?? (isDragHandle ? `${text}をドラッグして並び替え` : `${text}を選択`) : c.ariaLabel}
            aria-checked={toggleField ? g(toggleField) === '1' : undefined}
            aria-pressed={selectable ? g(selectable.field) === selectable.value : undefined}
            draggable={isDragHandle}
            onClick={selectable || toggleField ? selectCell : undefined}
            onKeyDown={selectable || toggleField ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                selectCell();
              }
            } : undefined}
            onDragStart={isDragHandle ? (event) => {
              dragIdRef.current = dragId;
              event.dataTransfer.effectAllowed = 'move';
              event.dataTransfer.setData('text/plain', dragId);
            } : undefined}
            onDragOver={isDragHandle ? (event) => {
              const activeId = dragIdRef.current ?? event.dataTransfer.getData('text/plain');
              if (activeId && activeId !== dragId) {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                setDragOverId(dragId);
              }
            } : undefined}
            onDragLeave={isDragHandle ? () => {
              if (dragOverId === dragId) setDragOverId(null);
            } : undefined}
            onDrop={isDragHandle ? (event) => {
              event.preventDefault();
              const activeId = dragIdRef.current ?? event.dataTransfer.getData('text/plain');
              if (activeId && activeId !== dragId) onDragReorder?.(activeId, dragId);
              dragIdRef.current = null;
              setDragOverId(null);
            } : undefined}
            onDragEnd={isDragHandle ? () => {
              dragIdRef.current = null;
              setDragOverId(null);
            } : undefined}
            style={{
            gridColumn: c.exactPosition ? undefined : `${cs} / ${ce}`,
            gridRow: c.exactPosition ? undefined : `${rs} / ${re}`,
            border: isDragHandle ? '0.5px solid #64748b' : '0.5px solid #000',
            position: c.exactPosition ? 'absolute' : c.diagonal || c.cornerLabel || c.codeLabel || c.topRightLabel || c.bottomLabel || c.bottomSegments || c.rightLabel ? 'relative' : undefined,
            top: c.exactPosition ? `${((c.top - bounds.top) / bounds.height) * 100}%` : undefined,
            left: c.exactPosition ? `${((c.left - bounds.left) / bounds.width) * 100}%` : undefined,
            width: c.exactPosition ? `${(c.width / bounds.width) * 100}%` : undefined,
            height: c.exactPosition ? `${(c.height / bounds.height) * 100}%` : undefined,
            zIndex: c.exactPosition ? isDragHandle ? 3 : 1 : undefined,
            display: 'flex',
            alignItems: 'center',
            justifyContent: isVertical ? (c.align === 'center' ? 'center' : 'flex-start') : justify,
            writingMode: isVertical ? 'vertical-rl' : undefined,
            fontSize,
            fontWeight: c.bold || highlighted ? 700 : 400,
            color: isDragHandle ? '#334155' : undefined,
            background: dragOver ? '#dbeafe' : highlighted ? '#fff3b0' : isDragHandle ? '#f8fafc' : undefined,
            boxShadow: dragOver ? 'inset 0 0 0 1.5px #2563eb' : highlighted ? 'inset 0 0 0 1.5px #d97706' : undefined,
            cursor: isDragHandle ? 'grab' : interactive ? 'pointer' : undefined,
            userSelect: interactive ? 'none' : undefined,
            touchAction: isDragHandle ? 'none' : undefined,
            padding: '1px 2px', boxSizing: 'border-box', overflow: 'hidden',
            lineHeight: 1.15, wordBreak: c.noWrap ? 'normal' : 'break-all', whiteSpace: c.noWrap ? 'nowrap' : 'normal', textAlign: 'center',
          }}>
            {c.codeLabel && <span style={{ position: 'absolute', top: 1, left: 2, fontSize: 6, lineHeight: 1, color: '#777', pointerEvents: 'none', zIndex: 1, whiteSpace: 'nowrap' }}>{c.codeLabel}</span>}
            {c.topRightLabel && <span style={{ position: 'absolute', top: 1, right: 2, fontSize: 7, lineHeight: 1, pointerEvents: 'none' }}>{c.topRightLabel}</span>}
            {c.bottomLabel && <span style={{ position: 'absolute', right: 2, bottom: 2, left: 2, fontSize: 6, lineHeight: 1, textAlign: c.bottomLabelAlign ?? 'left', pointerEvents: 'none' }}>{c.bottomLabel}</span>}
            {c.bottomSegments && <span style={{ position: 'absolute', right: 0, bottom: 2, left: 0, display: 'grid', gridTemplateColumns: c.bottomSegments.map((segment) => `${segment.width}fr`).join(' '), fontSize: 6, lineHeight: 1, pointerEvents: 'none' }}>{c.bottomSegments.map((segment, segmentIndex) => <span key={`${segment.text}-${segmentIndex}`} style={{ boxSizing: 'border-box', paddingRight: 2, textAlign: 'right' }}>{segment.text}</span>)}</span>}
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
            ) : c.kind === 'input' && c.subtractionAmountExpression ? (
              <div style={{ display: 'grid', gridTemplateColumns: c.subtractionAmountExpression.leftLabelNoWrap && c.subtractionAmountExpression.rightLabelNoWrap ? 'minmax(0, 1.45fr) 1.5em minmax(0, 1.2fr)' : c.subtractionAmountExpression.leftLabelNoWrap ? 'minmax(0, 1.65fr) 1.5em minmax(0, 1fr)' : 'minmax(0, 1fr) 2em minmax(0, 1.25fr)', alignItems: 'stretch', width: '100%', height: '100%', fontSize: c.subtractionAmountExpression.leftLabelNoWrap || c.subtractionAmountExpression.rightLabelNoWrap ? 5.5 : 6.5, lineHeight: 1.15 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.45em', minWidth: 0 }}>
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', whiteSpace: c.subtractionAmountExpression.leftLabelNoWrap ? 'nowrap' : undefined }}>
                    {c.subtractionAmountExpression.leftLabelLines.map((line) => <span key={line}>{line}</span>)}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'baseline', justifyContent: 'center', gap: 2, minWidth: 0 }}>
                    <span aria-label={c.subtractionAmountExpression.leftValueField} style={{ textAlign: 'right', fontWeight: 700 }}>
                      {g(c.subtractionAmountExpression.leftValueField)}
                    </span>
                    <span>円</span>
                  </span>
                </div>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9 }}>－</span>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.45em', minWidth: 0 }}>
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', whiteSpace: c.subtractionAmountExpression.rightLabelNoWrap ? 'nowrap' : undefined }}>
                    {c.subtractionAmountExpression.rightLabelLines.map((line) => <span key={line}>{line}</span>)}
                  </span>
                  <span style={{ display: 'grid', gridTemplateColumns: c.subtractionAmountExpression.rightSenField ? '5em auto 2.5em auto' : '5em auto', alignItems: 'end', justifyContent: 'center', gap: 2, minWidth: 0 }}>
                    <input id={`${inputPrefix}-${c.subtractionAmountExpression.rightYenField}`} name={`${inputPrefix}.${c.subtractionAmountExpression.rightYenField}`} aria-label={c.subtractionAmountExpression.rightYenField} value={formatCommaInteger(g(c.subtractionAmountExpression.rightYenField))} onChange={(e) => u(c.subtractionAmountExpression!.rightYenField, formatCommaInteger(e.target.value))} onKeyDown={onEnterNext} inputMode="numeric" style={{ width: '100%', minWidth: 0, border: 'none', borderBottom: c.subtractionAmountExpression.underlineRight === false ? 'none' : '1px solid #aaa', outline: 'none', textAlign: 'right', fontSize: 'inherit', background: 'transparent', padding: 0, boxSizing: 'border-box', fontFamily: 'inherit' }} />
                    <span>円</span>
                    {c.subtractionAmountExpression.rightSenField && (
                      <>
                        <input id={`${inputPrefix}-${c.subtractionAmountExpression.rightSenField}`} name={`${inputPrefix}.${c.subtractionAmountExpression.rightSenField}`} aria-label={c.subtractionAmountExpression.rightSenField} value={normalizeInteger(g(c.subtractionAmountExpression.rightSenField)).slice(0, 2)} onChange={(e) => u(c.subtractionAmountExpression!.rightSenField!, normalizeInteger(e.target.value).slice(0, 2))} onKeyDown={onEnterNext} inputMode="numeric" maxLength={2} style={{ width: '100%', minWidth: 0, border: 'none', borderBottom: '1px solid #aaa', outline: 'none', textAlign: 'right', fontSize: 'inherit', background: 'transparent', padding: 0, boxSizing: 'border-box', fontFamily: 'inherit' }} />
                        <span>銭</span>
                      </>
                    )}
                  </span>
                </div>
              </div>
            ) : c.kind === 'input' && c.editableSubtractionExpression ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 1.6em minmax(0, 1fr)', alignItems: 'stretch', width: '100%', height: '100%', fontSize: 6.5, lineHeight: 1.15 }}>
                {[
                  {
                    labelLines: c.editableSubtractionExpression.leftLabelLines,
                    yenField: c.editableSubtractionExpression.leftYenField,
                    senField: c.editableSubtractionExpression.leftSenField,
                  },
                  {
                    labelLines: c.editableSubtractionExpression.rightLabelLines,
                    yenField: c.editableSubtractionExpression.rightYenField,
                    senField: c.editableSubtractionExpression.rightSenField,
                  },
                ].map((amount, index) => (
                  <span key={amount.yenField} style={{ display: 'contents' }}>
                    {index > 0 && <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9 }}>－</span>}
                    <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.45em', minWidth: 0 }}>
                      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        {amount.labelLines.map((line) => <span key={line}>{line}</span>)}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'baseline', justifyContent: 'center', gap: 2, whiteSpace: 'nowrap' }}>
                        {c.editableSubtractionExpression!.parenthesized && <span>（</span>}
                        <input id={`${inputPrefix}-${amount.yenField}`} name={`${inputPrefix}.${amount.yenField}`} aria-label={amount.yenField} value={formatCommaInteger(g(amount.yenField))} onChange={(e) => u(amount.yenField, formatCommaInteger(e.target.value))} onKeyDown={onEnterNext} inputMode="numeric" style={{ width: '4.5em', minWidth: 0, border: 'none', outline: 'none', textAlign: 'right', fontSize: 'inherit', background: 'transparent', padding: 0, boxSizing: 'border-box', fontFamily: 'inherit' }} />
                        <span>円</span>
                        {amount.senField && (
                          <>
                            <input id={`${inputPrefix}-${amount.senField}`} name={`${inputPrefix}.${amount.senField}`} aria-label={amount.senField} value={normalizeInteger(g(amount.senField)).slice(0, 2)} onChange={(e) => u(amount.senField!, normalizeInteger(e.target.value).slice(0, 2))} onKeyDown={onEnterNext} inputMode="numeric" maxLength={2} style={{ width: '2em', minWidth: 0, border: 'none', outline: 'none', textAlign: 'right', fontSize: 'inherit', background: 'transparent', padding: 0, boxSizing: 'border-box', fontFamily: 'inherit' }} />
                            <span>銭</span>
                          </>
                        )}
                        {c.editableSubtractionExpression!.parenthesized && <span>）</span>}
                      </span>
                    </span>
                  </span>
                ))}
              </div>
            ) : c.kind === 'input' && c.allocationAdjustmentExpression ? (
              <div style={{ display: 'grid', gridTemplateColumns: '0.8em minmax(0, 1.2fr) 1.1em minmax(0, 1fr) 1.1em minmax(0, 0.85fr) 0.8em 1.1em minmax(0, 1.15fr)', alignItems: 'stretch', width: '100%', height: '100%', fontSize: 6.2, lineHeight: 1.15 }}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9 }}>（</span>
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.4em', minWidth: 0 }}>
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {c.allocationAdjustmentExpression.baseLabelLines.map((line) => <span key={line}>{line}</span>)}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 2 }}><span>{g(c.allocationAdjustmentExpression.baseValueField)}</span><span>円</span></span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9 }}>＋</span>
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.4em', minWidth: 0 }}>
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {c.allocationAdjustmentExpression.paymentLabelLines.map((line) => <span key={line}>{line}</span>)}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 2 }}>
                    <input id={`${inputPrefix}-${c.allocationAdjustmentExpression.paymentField}`} name={`${inputPrefix}.${c.allocationAdjustmentExpression.paymentField}`} aria-label={c.allocationAdjustmentExpression.paymentField} value={g(c.allocationAdjustmentExpression.paymentField)} onChange={(e) => u(c.allocationAdjustmentExpression!.paymentField, sanitizeDecimal(e.target.value, 2))} onBlur={() => u(c.allocationAdjustmentExpression!.paymentField, formatFixedDecimal(g(c.allocationAdjustmentExpression!.paymentField), 2))} onKeyDown={onEnterNext} inputMode="decimal" style={{ width: '4.5em', minWidth: 0, border: 'none', outline: 'none', textAlign: 'right', fontSize: 'inherit', background: 'transparent', padding: 0, boxSizing: 'border-box', fontFamily: 'inherit' }} />
                    <span>円</span>
                  </span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9 }}>×</span>
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.4em', minWidth: 0 }}>
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {c.allocationAdjustmentExpression.allocationLabelLines.map((line) => <span key={line}>{line}</span>)}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 2 }}>
                    <input id={`${inputPrefix}-${c.allocationAdjustmentExpression.allocationField}`} name={`${inputPrefix}.${c.allocationAdjustmentExpression.allocationField}`} aria-label={c.allocationAdjustmentExpression.allocationField} value={g(c.allocationAdjustmentExpression.allocationField)} onChange={(e) => u(c.allocationAdjustmentExpression!.allocationField, e.target.value)} onKeyDown={onEnterNext} inputMode="decimal" style={{ width: '3.5em', minWidth: 0, border: 'none', outline: 'none', textAlign: 'right', fontSize: 'inherit', background: 'transparent', padding: 0, boxSizing: 'border-box', fontFamily: 'inherit' }} />
                    <span>株</span>
                  </span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9 }}>）</span>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9 }}>÷</span>
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.4em', minWidth: 0 }}>
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {c.allocationAdjustmentExpression.issuedLabelLines.map((line) => <span key={line}>{line}</span>)}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 2, whiteSpace: 'nowrap' }}>
                    <span>（1株＋</span>
                    <input id={`${inputPrefix}-${c.allocationAdjustmentExpression.issuedField}`} name={`${inputPrefix}.${c.allocationAdjustmentExpression.issuedField}`} aria-label={c.allocationAdjustmentExpression.issuedField} value={g(c.allocationAdjustmentExpression.issuedField)} onChange={(e) => u(c.allocationAdjustmentExpression!.issuedField, e.target.value)} onKeyDown={onEnterNext} inputMode="decimal" style={{ width: '3.2em', minWidth: 0, border: 'none', outline: 'none', textAlign: 'right', fontSize: 'inherit', background: 'transparent', padding: 0, boxSizing: 'border-box', fontFamily: 'inherit' }} />
                    <span>株）</span>
                  </span>
                </span>
              </div>
            ) : c.kind === 'input' && c.employeeBreakdown ? (
              <div style={{ width: '100%', height: '100%', display: 'grid', gridTemplateRows: 'repeat(3, minmax(0, 1fr))', alignItems: 'stretch', gap: 0, padding: '2px 3px', boxSizing: 'border-box', fontSize: 6.5, lineHeight: 1.1 }}>
                <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr', alignItems: 'stretch', minHeight: 0 }}>
                  <div style={{ padding: '1px 3px', fontWeight: 700, textAlign: 'left', whiteSpace: 'nowrap' }}>
                    継続従業員 （5時間以上/日）
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '4.5em 1.8em 4em 1em 5em 1em', alignItems: 'center', justifyContent: 'end', gap: 2, padding: '0 3px', whiteSpace: 'nowrap' }}>
                    {printRendering ? <span style={{ ...DATE_BOX, width: '100%', textAlign: 'right' }}>{normalizeInteger(g(c.employeeBreakdown.regularField))}</span> : <input id={`${inputPrefix}-${c.employeeBreakdown.regularField}`} name={`${inputPrefix}.${c.employeeBreakdown.regularField}`} aria-label="継続従業員数" title="0から9999までの整数を入力してください" value={normalizeInteger(g(c.employeeBreakdown.regularField))} onChange={(e) => u(c.employeeBreakdown!.regularField, normalizeInteger(e.target.value).slice(0, 4))} onKeyDown={onEnterNext} inputMode="numeric" pattern="[0-9]{1,4}" maxLength={4} style={{ ...DATE_BOX, width: '100%', textAlign: 'right' }} />}
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
                    {printRendering ? <span style={{ ...DATE_BOX, width: '100%', textAlign: 'right' }}>{normalizeInteger(g(c.employeeBreakdown.otherField))}</span> : <input id={`${inputPrefix}-${c.employeeBreakdown.otherField}`} name={`${inputPrefix}.${c.employeeBreakdown.otherField}`} aria-label="継続従業員以外の人数" title="0から9999までの整数を入力してください" value={normalizeInteger(g(c.employeeBreakdown.otherField))} onChange={(e) => u(c.employeeBreakdown!.otherField, normalizeInteger(e.target.value).slice(0, 4))} onKeyDown={onEnterNext} inputMode="numeric" pattern="[0-9]{1,4}" maxLength={4} style={{ ...DATE_BOX, width: '100%', textAlign: 'right' }} />}
                    <span>人×</span>
                    {printRendering ? <span style={{ ...DATE_BOX, width: '100%', textAlign: 'left' }}>{g(c.employeeBreakdown.otherRateField)}</span> : <select id={`${inputPrefix}-${c.employeeBreakdown.otherRateField}`} name={`${inputPrefix}.${c.employeeBreakdown.otherRateField}`} aria-label="継続従業員以外の換算係数" value={g(c.employeeBreakdown.otherRateField)} onChange={(e) => u(c.employeeBreakdown!.otherRateField, e.target.value)} onKeyDown={onEnterNext} style={{ ...DATE_BOX, width: '100%', textAlign: 'left', appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', paddingRight: 8, backgroundImage: SELECT_ARROW, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1px center', backgroundSize: '6px' }}>
                      {Array.from({ length: 9 }, (_, index) => ((index + 1) / 10).toFixed(1)).map((rate) => <option key={rate} value={rate}>{rate}</option>)}
                    </select>}
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
              ? printRendering ? <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: c.align === 'left' ? 'flex-start' : c.align === 'center' ? 'center' : 'flex-end', overflow: 'hidden', textAlign: c.align ?? 'right', fontSize: 6, backgroundColor: 'transparent', padding: '0 7px 0 0', boxSizing: 'border-box', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>{g(c.field)}</div> : <select id={`${inputPrefix}-${c.field}-${i}`} name={`${inputPrefix}.${c.field}`} aria-label={c.ariaLabel ?? c.field} value={g(c.field)} onChange={(e) => u(c.field!, e.target.value)} onKeyDown={onEnterNext} style={{ width: '100%', height: '100%', border: 'none', outline: 'none', textAlign: 'left', fontSize: 6, backgroundColor: 'transparent', padding: '0 7px 0 0', boxSizing: 'border-box', fontFamily: 'inherit', appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', backgroundImage: SELECT_ARROW, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1px center', backgroundSize: '5px' }}>
                  {c.options.map((option) => {
                    const o = typeof option === 'string' ? { value: option, label: option } : option;
                    const label = c.compactSelectedOption && o.value !== '' && o.value === g(c.field!) ? o.value : o.label;
                    return <option key={o.value || 'blank'} value={o.value}>{label}</option>;
                  })}
                </select>
              : c.kind === 'input' && c.field
              ? <>
                  {c.cornerLabel && <span style={{ position: 'absolute', top: c.cornerLabelTop ?? 1, left: 2, fontSize: 7, lineHeight: 1, pointerEvents: 'none' }}>{c.cornerLabel}</span>}
                  {!printRendering && c.jumpTo && onJump && <span style={{ position: 'absolute', top: 1, right: c.topRightLabel ? 10 : 2, fontSize: 7, lineHeight: 1, color: '#2563eb', pointerEvents: 'none' }} aria-hidden="true">✎</span>}
                  {printRendering ? <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: c.align === 'left' ? 'flex-start' : c.align === 'center' ? 'center' : 'flex-end', overflow: 'hidden', textAlign: c.align ?? 'right', fontSize: 'inherit', background: readOnly ? highlighted ? '#fff3b0' : '#f7f7f7' : 'transparent', padding: 0, paddingRight: c.rightLabel ? 10 : c.topRightLabel ? Math.min(c.topRightLabel.length * 7 + 3, 17) : 0, boxSizing: 'border-box', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>{formattedFieldValue(c, g)}</div> : <input id={`${inputPrefix}-${c.field}-${i}`} name={`${inputPrefix}.${c.field}`} aria-label={c.ariaLabel ?? c.field} title={c.jumpTo?.hint} value={c.signedCommaInteger ? formatSignedCommaInteger(g(c.field)) : c.commaInteger ? formatCommaInteger(g(c.field)) : c.integerDigits !== undefined || c.noLeadingZero ? normalizeInteger(g(c.field)) : g(c.field)} onChange={(e) => { const next = c.decimalPlaces !== undefined ? sanitizeDecimal(e.target.value, c.decimalPlaces) : c.signedCommaInteger ? formatSignedCommaInteger(e.target.value) : c.commaInteger ? formatCommaInteger(e.target.value) : c.integerDigits !== undefined ? normalizeInteger(e.target.value).slice(0, c.integerDigits) : c.noLeadingZero ? normalizeInteger(e.target.value) : e.target.value; u(c.field!, next); }} onBlur={() => { if (!readOnly && c.decimalPlaces !== undefined) u(c.field!, formatFixedDecimal(g(c.field!), c.decimalPlaces)); }} onKeyDown={onEnterNext} onClick={c.jumpTo && onJump ? () => onJump(c.jumpTo!) : undefined} onContextMenu={c.contextMenu ? (e) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, items: c.contextMenu! }); } : undefined} inputMode={c.signedCommaInteger ? 'text' : c.decimalPlaces !== undefined ? 'decimal' : c.integerDigits || c.commaInteger ? 'numeric' : undefined} maxLength={c.integerDigits} readOnly={readOnly} tabIndex={readOnly ? -1 : undefined} style={{ width: '100%', height: '100%', border: 'none', outline: 'none', textAlign: c.align ?? 'right', fontSize: 'inherit', background: readOnly ? highlighted ? '#fff3b0' : '#f7f7f7' : 'transparent', padding: 0, paddingRight: c.rightLabel ? 10 : c.topRightLabel ? Math.min(c.topRightLabel.length * 7 + 3, 17) : 0, boxSizing: 'border-box', fontFamily: 'inherit', cursor: c.jumpTo && onJump ? 'pointer' : undefined }} />}
                </>
              : c.kind === 'label' && c.verticalSectionHeading ? (
                <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', width: '100%', height: '100%' }}>
                  {c.verticalSectionHeading.compact ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, writingMode: 'vertical-rl' }}>
                      {`${c.verticalSectionHeading.number}${c.verticalSectionHeading.text}`.replace(/[ 　]/g, '')}
                    </span>
                  ) : (
                    <>
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '2.5em', writingMode: 'horizontal-tb' }}>{c.verticalSectionHeading.number}</span>
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, writingMode: 'vertical-rl' }}>{c.verticalSectionHeading.text.replace(/[ 　]/g, '')}</span>
                    </>
                  )}
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
                    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'stretch', minWidth: '2em', padding: '0.08em 0.18em', ...(c.alternativeFractions.selectedSide === 'left' ? { background: '#fff3b0', boxShadow: 'inset 0 0 0 0.7px #d97706' } : {}) }}>
                      <span style={{ borderBottom: '0.7px solid #000', padding: '0 0.25em 1px' }}>{c.alternativeFractions.left.numerator}</span>
                      <span style={{ paddingTop: 1 }}>{c.alternativeFractions.left.denominator}</span>
                    </span>
                    <span>又は</span>
                    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'stretch', minWidth: '5.5em', padding: '0.08em 0.18em', ...(c.alternativeFractions.selectedSide === 'right' ? { background: '#fff3b0', boxShadow: 'inset 0 0 0 0.7px #d97706' } : {}) }}>
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
              ) : c.kind === 'label' && c.titledFraction ? (
                <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '96%', height: '100%', lineHeight: 1.15 }}>
                  {c.titledFraction.titleLines.map((line, index) => <span key={`${line}-${index}`}>{line}</span>)}
                  <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'stretch', textAlign: 'center' }}>
                    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', borderBottom: '0.7px solid #000', padding: '0 0.4em 1px' }}>
                      {c.titledFraction.numeratorLines.map((line, index) => <span key={`${line}-${index}`}>{line}</span>)}
                    </span>
                    <span style={{ paddingTop: 1 }}>
                      {c.titledFraction.denominator}
                      {c.titledFraction.suffix && <span style={{ marginLeft: '0.6em' }}>{c.titledFraction.suffix}</span>}
                    </span>
                  </span>
                </span>
              ) : c.kind === 'label' && c.stackedDivisionExpression ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.8em', width: '98%', height: '100%', lineHeight: 1.1, whiteSpace: 'nowrap' }}>
                  <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    {c.stackedDivisionExpression.dividendLines.map((line, index) => <span key={`${line}-${index}`}>{line}</span>)}
                  </span>
                  <span>÷</span>
                  <span>{c.stackedDivisionExpression.divisor}</span>
                  {c.stackedDivisionExpression.suffix && <span>{c.stackedDivisionExpression.suffix}</span>}
                </span>
              ) : c.kind === 'label' && c.fractionProductExpression ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.65em', width: '98%', height: '100%', lineHeight: 1, whiteSpace: 'nowrap' }}>
                  {[c.fractionProductExpression.left, c.fractionProductExpression.right].map((fraction, index) => (
                    <span key={`${fraction.numerator}-${fraction.denominator}`} style={{ display: 'contents' }}>
                      {index > 0 && <span>×</span>}
                      <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'stretch', minWidth: '5em', textAlign: 'center' }}>
                        <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', borderBottom: '0.7px solid #000', padding: '0 0.35em 1px' }}>
                          <span>{fraction.numerator}</span>
                          {fraction.valueField && <span>（{g(fraction.valueField)}）</span>}
                        </span>
                        <span style={{ paddingTop: 1 }}>{fraction.denominator}</span>
                      </span>
                    </span>
                  ))}
                  {c.fractionProductExpression.suffix && <span>{c.fractionProductExpression.suffix}</span>}
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
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-start', gap: '0.3em', width: '99%', height: '100%', lineHeight: 1, whiteSpace: 'nowrap', textAlign: 'left' }}>
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
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.6em', width: '94%', height: '100%', lineHeight: 1 }}>
                  <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'center', flex: 1, minWidth: 0 }}>
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
                  {c.fractionExpression.suffix && <span>{c.fractionExpression.suffix}</span>}
                </span>
              ) : c.kind === 'label' && c.inlineChoices ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.25em', width: '100%', height: '100%', lineHeight: 1, whiteSpace: 'nowrap' }}>
                  {c.inlineChoices.choices.map((choice, index) => {
                    const selected = choice.key === c.inlineChoices?.selectedKey;
                    return (
                      <span key={choice.key} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25em' }}>
                        {index > 0 && <span>{c.inlineChoices?.separator ?? '・'}</span>}
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '4.1em', height: '1.7em', padding: '0 0.25em', border: selected ? '0.8px solid #000' : '0.8px solid transparent', borderRadius: '999px', boxSizing: 'border-box', fontWeight: selected ? 700 : undefined, background: selected ? '#fff8cc' : undefined }}>
                          {choice.label}
                        </span>
                      </span>
                    );
                  })}
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
                        <span key={`${line}-${index}`} style={{ display: 'block', minHeight: '1.15em', padding: emphasized ? '1px 3px' : undefined, boxSizing: 'border-box', fontWeight: emphasized ? 700 : undefined, fontSize: emphasized ? '1.15em' : undefined, color: emphasized ? '#7c2d12' : undefined, background: emphasized ? '#ffed99' : undefined, boxShadow: emphasized ? 'inset 0 0 0 1.5px #c2410c' : undefined }}>
                          <span>{line || '\u00a0'}</span>
                        </span>
                      );
                    })}
                  </span>
                ) : (
                  text.includes('\n') ? <span style={{ whiteSpace: c.noWrap ? 'pre' : 'pre-line', width: c.textAlign ? 'auto' : '100%', textAlign: c.textAlign ?? c.align ?? 'center' }}>{text}</span> : text
                )
              ) : null}
          </div>
        );
        };

        const groupEntries = placed
          .map((entry, index) => ({ entry, index }))
          .filter(({ entry }) => entry.c.semanticRole === 'group');
        const containedBy = (entry: (typeof placed)[number], group: (typeof placed)[number]) => (
          entry !== group
          && entry.c.left >= group.c.left - 0.2
          && entry.c.top >= group.c.top - 0.2
          && entry.c.left + entry.c.width <= group.c.left + group.c.width + 0.2
          && entry.c.top + entry.c.height <= group.c.top + group.c.height + 0.2
        );
        const groupedIndexes = new Set<number>();
        groupEntries.forEach(({ entry: group }) => {
          placed.forEach((entry, index) => {
            if (containedBy(entry, group)) groupedIndexes.add(index);
          });
        });

        return placed.map((entry, index) => {
          if (entry.c.semanticRole !== 'group') {
            return groupedIndexes.has(index) ? null : renderCell(entry, index);
          }
          const members = placed
            .map((candidate, memberIndex) => ({ candidate, memberIndex }))
            .filter(({ candidate }) => containedBy(candidate, entry));
          const borderCell = {
            ...entry,
            c: { ...entry.c, semanticRole: 'presentation' as const, ariaLabel: undefined },
          };
          return (
            <div key={`group-${index}`} role="group" aria-label={entry.c.ariaLabel} style={{ display: 'contents' }}>
              {entry.c.groupBorder === false ? null : renderCell(borderCell, index)}
              {members.map(({ candidate, memberIndex }) => renderCell(candidate, memberIndex))}
            </div>
          );
        });
      })()}
      {overlay}
      </div>
      {ctxMenu && (
        <>
          <div className="no-print" onClick={() => setCtxMenu(null)} onContextMenu={(e) => { e.preventDefault(); setCtxMenu(null); }} style={{ position: 'fixed', inset: 0, zIndex: 1000 }} />
          <div className="no-print" style={{ position: 'fixed', top: ctxMenu.y, left: ctxMenu.x, zIndex: 1001, background: '#fff', border: '0.5px solid #000', boxShadow: '0 2px 8px rgba(0,0,0,0.25)', fontFamily: '"Noto Sans JP", sans-serif', fontSize: 11, minWidth: '12em' }}>
            {ctxMenu.items.map((item, i) => (
              <button key={i} type="button" onClick={() => { u(item.copyTo, g(item.copyFrom)); setCtxMenu(null); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '4px 12px', border: 'none', borderTop: i === 0 ? 'none' : '0.5px solid #eee', background: 'transparent', cursor: 'pointer', whiteSpace: 'nowrap' }}>{item.label}</button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
