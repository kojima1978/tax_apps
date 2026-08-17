import { useCallback, useContext, useId, useMemo, useRef, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { PrintRenderContext } from './printContext';
import { lookupZipAddress } from '../../lib/zipAddress';
import { cleanNumeric, displayNumeric, fixNumeric, normalizeInteger } from '../../lib/format';
import { suffixedName, type AutoFill, type CodeSuffix } from '../../lib/codeLink';

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
  textField?: string;                // 自動計算値を固定文字として表示するフィールド
  numberedNotes?: readonly { number: string; body: string }[]; // （注）付きの番号注記（本文はぶら下げインデント）
  field?: string;                    // input のフィールドキー
  ariaLabel?: string;                // 入力欄のアクセシブル名
  semanticRole?: 'group' | 'columnheader' | 'rowheader' | 'presentation';
  groupBorder?: boolean;             // group の外枠セルを描画するか（既存罫線を使う場合は false）
  align?: 'left' | 'center' | 'right';
  leftAlignAfterBlankLine?: boolean;  // 空行より後の注記だけを左寄せにする
  fontSizeAfterBlankLine?: number;    // 空行より後の注記だけに使う文字サイズ
  noWrapAfterBlankLine?: boolean;     // 空行より後の注記を1行で表示する
  flexDirection?: CSSProperties['flexDirection']; // 特定セル内の配置方向（丸番号の縦中央配置など）
  alignItems?: CSSProperties['alignItems'];       // 特定セル内の交差軸配置
  fontSize?: number;
  forceHorizontal?: boolean;         // 縦長セルでも横書きを維持する
  forceVertical?: boolean;           // セル比率にかかわらず縦書きにする
  verticalLr?: boolean;              // 縦書きの列が左から右へ進む（第4表の縦書き帯）
  bold?: boolean;
  noWrap?: boolean;                  // 明示改行以外では折り返さない
  /** 枠に入りきらない入力値をセル内で折り返す（銘柄など長い名称の欄）。1行入力の input ではなく textarea で描く */
  multiline?: boolean;
  noBorder?: boolean;                // 様式に罫線が無い領域（提出日の行など）
  noBorderTop?: boolean;             // 上罫線だけを描かない（隣接する計算欄と一体に見せる注記行）
  noBorderBottom?: boolean;          // 下罫線だけを描かない（下段の数式欄と一体に見せる見出し行）
  noBorderRight?: boolean;           // 右罫線だけを描かない（括弧セルへ連続する注記行）
  noBorderLeft?: boolean;            // 左罫線だけを描かない（数式の演算子セルなど）
  rightBrace?: boolean;              // 計算結果と下限額をまとめる縦長の右括弧
  dashed?: boolean;                  // 破線枠（生年月日の元号コード注記）
  outline?: boolean;                 // 他のセルに重ねて描く太枠（被相続人ブロックの外枠）。入力を妨げない
  borderWidth?: number;              // 個別に指定する罫線幅（px）
  borderRightWidth?: number;         // 右罫線だけに指定する幅（px）
  borderBottomWidth?: number;        // 下罫線だけに指定する幅（px）
  borderLeftWidth?: number;          // 左罫線だけに指定する幅（px）
  codeLabel?: string;                // 様式の識別コード（E01/G04等）をセル左上に小さく表示
  centeredPrefix?: string;           // 複数行見出しの左側で高さ中央に表示する項番
  cornerLabel?: string;              // 入力欄の左上に表示する固定ラベル（枠を持たないコード欄）
  rightLabel?: string;               // セルの右端中央に表示する固定ラベル（末尾の「000」など）
  integerDigits?: number;            // 数字のみの最大桁数
  commaInteger?: boolean;            // 整数を3桁区切りカンマで表示
  commaNumber?: boolean;             // 整数部だけ3桁区切りにし、小数はそのまま表示（整数にも小数にもなる欄）
  signedCommaInteger?: boolean;      // マイナス（△）を許可する整数を3桁区切りカンマで表示
  decimalPlaces?: number;            // 小数点以下の最大桁数（フォーカス解除時に固定表示）
  readOnly?: boolean;                // 自動計算などの編集不可欄
  /** クリックすると呼び出し側へ返す識別子（付表の明細を別画面で開く）。印刷では無効 */
  action?: string;
  navigateToForm?: string | ((g: (field: string) => string) => string | undefined); // 転記元の様式ID（入力値に応じた切替可）
  invalidWhen?: (g: (field: string) => string) => boolean; // 入力値の組合せが不正なときのエラー表示
  invalidMessage?: string;           // エラー理由（title・アクセシブル名）
  options?: (string | { value: string; label: string })[]; // 選択式入力の候補（空文字は未選択）
  optionGroups?: readonly { label: string; options: readonly { value: string; label: string }[] }[]; // optgroup 付きの選択肢
  compactSelectedOption?: boolean;   // 印刷はコードのみ（狭いコード記入枠用。画面では選択肢の名称ごと出す）
  stackedSelectedOption?: boolean;   // 画面では選択値のコードと名称を上下2段で表示
  /** 選択に連動して別の欄も書き換える（細目コード → 細目の名称）。書き換えた後も手入力できる */
  autoFill?: AutoFill;
  /**
   * コードの欄に合わせて、**用紙の上の表示だけ**名称の末尾に語を補う
   * （金融機関等コードが「1 銀行」なら「みずほ」を「みずほ銀行」と出す）。
   * 保存する値も入力画面の表示も打ったままなので、`readOnly` の欄にだけ効く。
   */
  suffixByCode?: CodeSuffix;
  /**
   * 記入条件のツールチップ（`title`）。様式にも記載要領にも書かれておらず
   * 記載例にしか出てこない条件（「国内の口座で管理されていたものは記入不要」など）を添える。
   */
  hint?: string;
  highlightWhen?: (g: (field: string) => string) => boolean; // 自動判定時の強調条件
  selectValue?: { field: string; value: string }; // セルをクリックして指定値を選択
  toggleField?: string;              // セルをクリックして指定フィールドをオン・オフ
  diagonal?: 'tlbr' | 'bltr';        // 斜線（記入不要欄: tlbr=＼ 左上→右下, bltr=／ 左下→右上）
  /**
   * 画面だけの入力欄。印刷では中身を隠し、様式どおりの斜線（記入不要）に戻す。
   * 被相続人の郵便番号のように、様式には書かないが入力補助には要る欄で使う。
   */
  printDiagonal?: 'tlbr' | 'bltr';
  date?: boolean;                    // ◯年◯月◯日（fieldを接頭辞に _y/_m/_d）
  dateSuffix?: string;               // 日付入力の後ろに置く固定文字（「提出」など）
  zip?: boolean;                     // 郵便番号（field_1「―」field_2）
  /** 郵便番号が7桁埋まったら住所欄（指定フィールド）を補う。既に入力されていれば上書きしない */
  zipAddress?: string;
  tel?: boolean;                     // 電話番号（field_1「―」field_2「―」field_3）
  /** 枠の高さは変えずに中を上下2段に割る（住所欄）。下段は field に「2」を付けたフィールド */
  twoLine?: { top: string; bottom: string };
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
  /** 転記元の様式へ移動する */
  onNavigate?: (formId: string) => void;
  /** `action` を持つセルがクリックされた */
  onAction?: (action: string) => void;
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
/**
 * 求めた文字サイズの覚え書き。同じ文言・同じ枠は毎回同じ答えになるうえ、
 * 様式のラベルは再描画のたびに全セル分ここを通るので、計算し直さない。
 */
const fontSizeCache = new Map<string, number>();

function fitFontSize(text: string, c: GridCell, vertical: boolean): number {
  const key = `${text} ${c.width} ${c.height} ${vertical ? 1 : 0}${c.noWrap ? 1 : 0}`;
  const cached = fontSizeCache.get(key);
  if (cached !== undefined) return cached;
  const size = measureFontSize(text, c, vertical);
  fontSizeCache.set(key, size);
  return size;
}

function measureFontSize(text: string, c: GridCell, vertical: boolean): number {
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

/**
 * 入力欄に出す文字。数字欄の整形に加え、`suffixByCode` の欄は末尾の語を補う。
 * 語を補うのは表示だけなので、手で打ち直せる欄（`readOnly` でない）には効かせない。
 */
function inputText(c: GridCell, g: (field: string) => string, readOnly: boolean): string {
  const raw = g(c.field!);
  const value = displayNumeric(c, raw);
  return readOnly && c.suffixByCode ? suffixedName(value, g(c.suffixByCode.field), c.suffixByCode) : value;
}

/** 複合入力（日付・郵便番号・電話番号）の入力ボックス共通スタイル */
const SUB_BOX: CSSProperties = { textAlign: 'center', border: 'none', borderBottom: '1px solid #aaa', outline: 'none', background: 'transparent', fontSize: 'inherit', fontFamily: 'inherit', padding: 0, minWidth: 0 };
const SELECT_ARROW = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%23888' stroke-width='1.5'/%3E%3C/svg%3E")`;

/** 記入不要欄の斜線。印刷だけ斜線に戻すセル（printDiagonal）でも使う */
function DiagonalLine({ dir, className }: { dir: 'tlbr' | 'bltr'; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={className} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <line x1="0" y1={dir === 'bltr' ? 100 : 0} x2="100" y2={dir === 'bltr' ? 0 : 100} stroke="#000" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

interface SubInputProps {
  field: string;
  formId: string;
  width: string;
  maxLength: number;
  ariaLabel: string;
  g: (f: string) => string;
  u: (f: string, v: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLElement>) => void;
  /** 先頭の0を残す（郵便番号「0640941」・市外局番「03」など、数値ではなく番号の欄） */
  keepZeros?: boolean;
  /** false のとき下線を表示しない（日付欄など） */
  underline?: boolean;
  /** 入力を別画面へ一本化した欄（人物ブロック）。表示だけにする */
  readOnly?: boolean;
}
/** 複合入力の中の数字1マス */
function SubInput({ field, formId, width, maxLength, ariaLabel, g, u, onKeyDown, keepZeros, underline = true, readOnly }: SubInputProps) {
  const printRendering = useContext(PrintRenderContext);
  const digits = (raw: string) => (keepZeros ? raw.replace(/\D/g, '') : normalizeInteger(raw));
  const value = digits(g(field));
  if (printRendering || readOnly) return <span style={{ display: 'inline-block', width, textAlign: 'center' }}>{value}</span>;
  return (
    <input
      id={`${formId}-${field}`}
      name={`${formId}.${field}`}
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => u(field, digits(e.target.value).slice(0, maxLength))}
      onKeyDown={onKeyDown}
      maxLength={maxLength}
      inputMode="numeric"
      style={{ ...SUB_BOX, width, borderBottom: underline ? SUB_BOX.borderBottom : 'none' }}
    />
  );
}

/**
 * 測定した矩形（cells）から CSS グリッドを自動導出して描画する。
 * 各矩形の left/right を縦罫線、top/bottom を横罫線として grid-template を生成し、
 * 各セルを grid-column / grid-row で配置する。背景画像は不要。
 */
export function GridForm({ cells, g, u, title, subtitle, formCode, aspectRatio = '210 / 297', toolbar, footer, formId, onNavigate, onAction }: GridFormProps) {
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
    const raw = c.textField ? g(c.textField) : c.text ?? '';
    const text = isVertical ? raw.replace(SPACES, '') : raw;
    const selectOptions = c.options ?? c.optionGroups?.flatMap((group) => group.options) ?? [];
    // 枠の実寸に合わせて自動縮小（長文ラベルがはみ出さないように）
    const fontSize = c.fontSize ?? fitFontSize(text, c, isVertical);
    const justify = c.align === 'left' ? 'flex-start' : c.align === 'right' ? 'flex-end' : 'center';
    const readOnly = c.readOnly === true;
    const highlighted = c.highlightWhen?.(g) ?? false;
    const invalid = !printRendering && (c.invalidWhen?.(g) ?? false);
    const navigateToForm = typeof c.navigateToForm === 'function' ? c.navigateToForm(g) : c.navigateToForm;
    const action = printRendering ? undefined : c.action;
    // 入力欄を持たないセル（項番など）はボタンそのものにする。入力欄を載せたセルはクリックだけ受ける
    const actionButton = action !== undefined && c.field === undefined;
    const interactive = !printRendering && Boolean(c.selectValue || c.toggleField || navigateToForm || action);
    const composite = Boolean(c.field && (c.date || c.zip || c.tel || c.twoLine));
    const editableComposite = composite && !readOnly;
    // 複合欄は入力欄が複数あるので、読み取り専用の灰色は欄ごとではなくセル全体に敷く
    const readOnlyComposite = composite && readOnly && !printRendering;
    const editable = Boolean(c.selectValue || c.toggleField || editableComposite || (c.kind === 'input' && c.field && !readOnly));
    const rightLabelPadding = c.rightLabel
      ? Math.max(14, Array.from(c.rightLabel).length * 4.5 + 4)
      : 0;
    const borderStyle = c.dashed ? 'dashed' : 'solid';
    const borderWidth = c.borderWidth ?? (c.outline ? 1.5 : c.dashed ? 1 : 0.5);
    const borderLine = `${borderWidth}px ${borderStyle} #000`;
    const selectCell = () => {
      if (c.toggleField) u(c.toggleField, g(c.toggleField) === '1' ? '' : '1');
      else if (c.selectValue) u(c.selectValue.field, g(c.selectValue.field) === c.selectValue.value ? '' : c.selectValue.value);
      else if (navigateToForm) onNavigate?.(navigateToForm);
      else if (action !== undefined) onAction?.(action);
    };
    // 郵便番号の入力。7桁そろった時点で住所欄を補う（空のときだけ）
    const onZipInput = (field: string, value: string) => {
      u(field, value);
      const target = c.zipAddress;
      if (target === undefined || g(target) !== '') return;
      const upper = field.endsWith('_1') ? value : g(`${c.field!}_1`);
      const lower = field.endsWith('_2') ? value : g(`${c.field!}_2`);
      void lookupZipAddress(upper + lower).then((address) => {
        if (address !== '' && g(target) === '') u(target, address);
      });
    };

    return (
      <div
        key={i}
        className={`gf-cell${editable ? ' gf-cell--editable' : ''}${navigateToForm ? ' gf-cell--source-link' : ''}${action !== undefined ? ' gf-cell--action' : ''}${c.rightBrace ? ' gf-cell--right-brace' : ''}${invalid ? ' gf-cell--invalid' : ''}`}
        // 入力欄を載せたまま行全体をクリックできるようにするため、
        // 欄を持つセルはボタンにせず（読み取り専用の入力欄のまま）クリックだけ受ける
        role={c.toggleField ? 'checkbox' : c.selectValue || navigateToForm || actionButton ? 'button' : c.semanticRole}
        tabIndex={interactive && (action === undefined || actionButton) ? 0 : undefined}
        aria-label={interactive && c.field === undefined
          ? navigateToForm ? `${c.ariaLabel ?? text}の転記元を開く` : c.ariaLabel ?? `${text}を選択`
          : c.ariaLabel}
        aria-checked={c.toggleField ? g(c.toggleField) === '1' : undefined}
        aria-pressed={c.selectValue ? g(c.selectValue.field) === c.selectValue.value : undefined}
        aria-invalid={invalid || undefined}
        title={invalid ? c.invalidMessage : undefined}
        onClick={interactive ? selectCell : undefined}
        onKeyDown={interactive ? (event) => {
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectCell(); }
        } : undefined}
        style={{
          gridColumn: `${cs} / ${ce}`,
          gridRow: `${rs} / ${re}`,
          borderTop: c.noBorder || c.noBorderTop ? 'none' : borderLine,
          borderRight: c.noBorder || c.noBorderRight
            ? 'none'
            : `${c.borderRightWidth ?? borderWidth}px ${borderStyle} #000`,
          borderBottom: c.noBorder || c.noBorderBottom
            ? 'none'
            : `${c.borderBottomWidth ?? borderWidth}px ${borderStyle} #000`,
          borderLeft: c.noBorder || c.noBorderLeft
            ? 'none'
            : `${c.borderLeftWidth ?? borderWidth}px ${borderStyle} #000`,
          // outline は既存セルの上に重ねる飾り枠。クリックを吸わないようにする
          pointerEvents: c.outline ? 'none' : undefined,
          position: 'relative',
          display: 'flex',
          alignItems: c.alignItems ?? 'center',
          flexDirection: c.flexDirection,
          justifyContent: isVertical ? (c.align === 'center' ? 'center' : 'flex-start') : justify,
          writingMode: isVertical ? (c.verticalLr ? 'vertical-lr' : 'vertical-rl') : undefined,
          fontSize,
          fontWeight: c.bold || highlighted ? 700 : 400,
          background: highlighted ? '#fff3b0' : readOnlyComposite ? '#f7f7f7' : undefined,
          boxShadow: invalid ? 'inset 0 0 0 1.5px #dc2626' : highlighted ? 'inset 0 0 0 1.5px #d97706' : undefined,
          cursor: interactive ? 'pointer' : undefined,
          userSelect: interactive ? 'none' : undefined,
          padding: '1px 2px', boxSizing: 'border-box', overflow: 'hidden',
          lineHeight: 1.15, wordBreak: c.noWrap ? 'normal' : 'break-all', whiteSpace: c.noWrap ? 'nowrap' : 'normal', textAlign: c.align ?? 'center',
        }}
      >
        {invalid && <span className="gf-cell__error no-print" aria-hidden="true">エラー</span>}
        {c.codeLabel && <span style={{ position: 'absolute', top: 1, left: 2, fontSize: 6, lineHeight: 1, color: '#777', pointerEvents: 'none', zIndex: 1, whiteSpace: 'nowrap' }}>{c.codeLabel}</span>}
        {c.centeredPrefix && <span style={{ position: 'absolute', top: '50%', left: 2, transform: 'translateY(-50%)', lineHeight: 1, pointerEvents: 'none', whiteSpace: 'nowrap' }}>{c.centeredPrefix}</span>}
        {c.rightLabel && <span style={{ position: 'absolute', top: '50%', right: 2, transform: 'translateY(-50%)', fontSize: 7, lineHeight: 1, pointerEvents: 'none' }}>{c.rightLabel}</span>}
        {/* 画面だけの入力欄は、印刷では中身を隠して様式どおりの斜線に差し替える */}
        {c.printDiagonal && <DiagonalLine dir={c.printDiagonal} className="print-only" />}
        <span className={c.printDiagonal ? 'no-print' : undefined} style={{ display: 'contents' }}>
        {c.diagonal ? (
          <DiagonalLine dir={c.diagonal} />
        ) : c.date && c.field ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: justify, gap: 1, width: '100%', whiteSpace: 'nowrap' }}>
            <SubInput field={`${c.field}_y`} formId={inputPrefix} width="2em" maxLength={2} ariaLabel={`${c.ariaLabel ?? c.field}（年）`} g={g} u={u} onKeyDown={onEnterNext} underline={false} readOnly={readOnly} />年
            <SubInput field={`${c.field}_m`} formId={inputPrefix} width="2em" maxLength={2} ariaLabel={`${c.ariaLabel ?? c.field}（月）`} g={g} u={u} onKeyDown={onEnterNext} underline={false} readOnly={readOnly} />月
            <SubInput field={`${c.field}_d`} formId={inputPrefix} width="2em" maxLength={2} ariaLabel={`${c.ariaLabel ?? c.field}（日）`} g={g} u={u} onKeyDown={onEnterNext} underline={false} readOnly={readOnly} />日
            {c.dateSuffix && <span style={{ paddingLeft: '0.6em' }}>{c.dateSuffix}</span>}
          </span>
        ) : c.zip && c.field ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4, width: '100%', whiteSpace: 'nowrap' }}>
            <SubInput field={`${c.field}_1`} formId={inputPrefix} width="3.2em" maxLength={3} ariaLabel={`${c.ariaLabel ?? c.field}（上3桁）`} g={g} u={onZipInput} onKeyDown={onEnterNext} keepZeros readOnly={readOnly} />―
            <SubInput field={`${c.field}_2`} formId={inputPrefix} width="4.2em" maxLength={4} ariaLabel={`${c.ariaLabel ?? c.field}（下4桁）`} g={g} u={onZipInput} onKeyDown={onEnterNext} keepZeros readOnly={readOnly} />
          </span>
        ) : c.tel && c.field ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4, width: '100%', whiteSpace: 'nowrap' }}>
            <SubInput field={`${c.field}_1`} formId={inputPrefix} width="4em" maxLength={5} ariaLabel={`${c.ariaLabel ?? c.field}（市外局番）`} g={g} u={u} onKeyDown={onEnterNext} keepZeros readOnly={readOnly} />―
            <SubInput field={`${c.field}_2`} formId={inputPrefix} width="4em" maxLength={4} ariaLabel={`${c.ariaLabel ?? c.field}（市内局番）`} g={g} u={u} onKeyDown={onEnterNext} keepZeros readOnly={readOnly} />―
            <SubInput field={`${c.field}_3`} formId={inputPrefix} width="4em" maxLength={4} ariaLabel={`${c.ariaLabel ?? c.field}（加入者番号）`} g={g} u={u} onKeyDown={onEnterNext} keepZeros readOnly={readOnly} />
          </span>
        ) : c.kind === 'input' && c.field && (c.options || c.optionGroups) ? (
          printRendering || readOnly
            ? c.stackedSelectedOption && !printRendering
              ? <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', lineHeight: 1, background: printRendering ? 'transparent' : '#f7f7f7' }}>
                  <span>{g(c.field)}</span>
                  <span>{selectedOptionLabel(selectOptions, g(c.field)).replace(/^\S+\s*/, '')}</span>
                </div>
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: justify, overflow: 'hidden', background: printRendering ? 'transparent' : '#f7f7f7' }}>{c.compactSelectedOption ? g(c.field) : selectedOptionLabel(selectOptions, g(c.field))}</div>
            : (
              <select
                id={`${inputPrefix}-${c.field}-${i}`}
                name={`${inputPrefix}.${c.field}`}
                aria-label={`${c.ariaLabel ?? c.field}${g(c.field) ? `：${selectedOptionLabel(selectOptions, g(c.field))}` : ''}`}
                title={[selectedOptionLabel(selectOptions, g(c.field)), c.hint].filter(Boolean).join('\n') || undefined}
                value={g(c.field)}
                onChange={(e) => {
                  u(c.field!, e.target.value);
                  if (c.autoFill) u(c.autoFill.field, c.autoFill.byValue[e.target.value] ?? '');
                }}
                onKeyDown={onEnterNext}
                // 「1」だけの狭い欄（flag）は中央寄せしたいので align を見る
                style={{ width: '100%', height: '100%', border: 'none', outline: 'none', textAlign: c.align === 'center' ? 'center' : 'left', fontSize: 'inherit', background: 'transparent', padding: '0 7px 0 0', boxSizing: 'border-box', fontFamily: 'inherit', appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', backgroundImage: SELECT_ARROW, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1px center', backgroundSize: '5px', cursor: 'pointer' }}
              >
                {/* 画面では選択後も名称ごと出す（`compactSelectedOption` は印刷だけの指定）。
                    選んだ項目の表示をコードだけに差し替えると、開き直したときに何を選んだのか読めなくなる */}
                {c.optionGroups ? (
                  <>
                    <option value="" />
                    {c.optionGroups.map((group) => (
                      <optgroup key={group.label} label={group.label}>
                        {group.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </optgroup>
                    ))}
                  </>
                ) : c.options?.map((option) => {
                    const o = typeof option === 'string' ? { value: option, label: option } : option;
                    return <option key={o.value || 'blank'} value={o.value}>{o.label}</option>;
                  })}
              </select>
            )
        ) : c.twoLine && c.field ? (
          // 様式には中の横罫線が無いので、枠は1つのまま入力欄だけを上下に積む
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
            {([[c.field, c.twoLine.top], [`${c.field}2`, c.twoLine.bottom]] as const).map(([field, part]) => (
              printRendering || readOnly ? (
                <div key={field} style={{ flex: 1, display: 'flex', alignItems: 'center', overflow: 'hidden', whiteSpace: 'nowrap' }}>{g(field)}</div>
              ) : (
                <input
                  key={field}
                  id={`${inputPrefix}-${field}-${i}`}
                  name={`${inputPrefix}.${field}`}
                  aria-label={`${c.ariaLabel ?? c.field}（${part}）`}
                  value={g(field)}
                  onChange={(e) => u(field, e.target.value)}
                  onKeyDown={onEnterNext}
                  style={{ flex: 1, width: '100%', minHeight: 0, border: 'none', outline: 'none', textAlign: 'left', fontSize: 'inherit', background: 'transparent', padding: 0, boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              )
            ))}
          </div>
        ) : c.kind === 'input' && c.field ? (
          <>
            {c.cornerLabel && <span style={{ position: 'absolute', top: 1, left: 2, fontSize: 6, lineHeight: 1, color: '#777', pointerEvents: 'none', zIndex: 1, whiteSpace: 'nowrap' }}>{c.cornerLabel}</span>}
            {printRendering ? (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: c.align === 'left' ? 'flex-start' : c.align === 'center' ? 'center' : 'flex-end', overflow: 'hidden', background: 'transparent', paddingRight: rightLabelPadding, boxSizing: 'border-box', whiteSpace: c.multiline ? 'pre-wrap' : 'nowrap', overflowWrap: c.multiline ? 'anywhere' : undefined, lineHeight: c.multiline ? 1.15 : undefined }}>
                {inputText(c, g, true)}
              </div>
            ) : (
              c.multiline ? (
                <textarea
                  id={`${inputPrefix}-${c.field}-${i}`}
                  name={`${inputPrefix}.${c.field}`}
                  aria-label={c.ariaLabel ?? c.field}
                  title={c.hint}
                  value={inputText(c, g, readOnly)}
                  onChange={(e) => u(c.field!, e.target.value)}
                  onKeyDown={onEnterNext}
                  readOnly={readOnly}
                  tabIndex={readOnly ? -1 : undefined}
                  style={{ width: '100%', height: '100%', border: 'none', outline: 'none', resize: 'none', overflow: 'hidden', textAlign: c.align ?? 'left', fontSize: 'inherit', lineHeight: 1.15, background: highlighted ? 'transparent' : readOnly ? '#f7f7f7' : 'transparent', padding: 0, paddingRight: rightLabelPadding, boxSizing: 'border-box', fontFamily: 'inherit', overflowWrap: 'anywhere' }}
                />
              ) : (
                <input
                  id={`${inputPrefix}-${c.field}-${i}`}
                  name={`${inputPrefix}.${c.field}`}
                  aria-label={c.ariaLabel ?? c.field}
                  title={c.hint}
                  value={inputText(c, g, readOnly)}
                  onChange={(e) => u(c.field!, cleanNumeric(c, e.target.value))}
                  onBlur={() => { if (!readOnly && c.decimalPlaces !== undefined) u(c.field!, fixNumeric(c, g(c.field!))); }}
                  onKeyDown={onEnterNext}
                  inputMode={c.signedCommaInteger ? 'text' : c.decimalPlaces !== undefined ? 'decimal' : c.integerDigits || c.commaInteger ? 'numeric' : undefined}
                  maxLength={c.integerDigits}
                  readOnly={readOnly}
                  tabIndex={readOnly ? -1 : undefined}
                  style={{ width: '100%', height: '100%', border: 'none', outline: 'none', textAlign: c.align ?? 'right', fontSize: 'inherit', background: highlighted ? 'transparent' : readOnly ? '#f7f7f7' : 'transparent', padding: 0, paddingRight: rightLabelPadding, boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              )
            )}
          </>
        ) : c.numberedNotes ? (
          <span className="gf-numbered-notes">
            {c.numberedNotes.map((note, index) => (
              <span className="gf-numbered-notes__row" key={`${note.number}-${index}`}>
                <span className="gf-numbered-notes__prefix">{index === 0 ? '（注）' : ''}</span>
                <span className="gf-numbered-notes__number">{note.number}</span>
                <span className="gf-numbered-notes__body">{note.body}</span>
              </span>
            ))}
          </span>
        ) : c.kind === 'label' || c.text || c.textField ? (
          text.includes('\n')
            ? (c.leftAlignAfterBlankLine || c.fontSizeAfterBlankLine || c.noWrapAfterBlankLine) && text.includes('\n\n')
              ? (() => {
                  const [heading, ...noteParts] = text.split('\n\n');
                  return (
                    <span style={{ width: '100%' }}>
                      <span style={{ display: 'block', whiteSpace: 'pre-line', textAlign: c.align ?? 'center' }}>{heading}</span>
                      <span style={{ display: 'block', marginTop: '1.15em', whiteSpace: c.noWrapAfterBlankLine ? 'nowrap' : 'pre-line', textAlign: c.leftAlignAfterBlankLine ? 'left' : c.align ?? 'center', fontSize: c.fontSizeAfterBlankLine }}>{noteParts.join('\n\n')}</span>
                    </span>
                  );
                })()
              : <span style={{ whiteSpace: c.noWrap ? 'pre' : 'pre-line', width: '100%', textAlign: c.align ?? 'center' }}>{text}</span>
            : text
        ) : null}
        </span>
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
