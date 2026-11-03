/**
 * 結合セルに文字が収まるフォントサイズを求める。
 *
 * Excel の結合セルは、入り切らない文字を隣のセルへあふれさせず**切り捨てる**。
 * 見積書・請求書のレターヘッドの住所行は幅 225px に対して 9pt で実幅 216px、
 * 余裕が半角0.3文字分しか無かったため、縮小印刷（「1ページに収める」で93%前後）の
 * px 丸めやフォント代替で末尾が欠けることがあった。
 *
 * ExcelJS に依存しない計算だけをここへ置く（テストから直接呼べるようにするため）。
 */

/**
 * 列幅1文字あたりの px。標準フォント（テンプレートは ＭＳ Ｐゴシック 11pt）の
 * 数字 '0' の幅で、これが Excel の列幅の単位そのもの。
 */
export const DEFAULT_MAX_DIGIT_WIDTH_PX = 7;

/** セルの内側で文字が描かれない分（左右の余白2px + 罫線1px） */
const CELL_PADDING_PX = 5;

/**
 * 使える幅のうち実際に使ってよい割合。
 * 出力時は「1ページに収める」で縮小されるが、列幅と文字幅の px 丸めは別々に起きるため
 * ぴったりに詰めると回によって末尾が欠ける。
 */
const SAFETY_RATIO = 0.95;

/** フォントを落とす刻みと下限 */
const FONT_STEP_PT = 0.5;
const MIN_FONT_SIZE_PT = 7;

/**
 * ＭＳ 明朝・ＭＳ ゴシックで半角幅になる文字。この範囲以外は全角幅として数える。
 * 推定を外すとしても「広い側（＝フォントを小さくする側）」に外れるので、切れるより安全。
 */
const HALF_WIDTH_PATTERN = /[ -~¢£¥¦¬¯｡-ﾟ]/;

/**
 * Excel の列幅（文字単位）→ px。
 * 丸め方は Excel の仕様どおり（幅6.5・MDW7 なら 45px）。
 */
export function columnWidthToPx(width: number, maxDigitWidthPx = DEFAULT_MAX_DIGIT_WIDTH_PX): number {
  if (!(width > 0)) return 0;
  return Math.trunc(((256 * width + Math.trunc(128 / maxDigitWidthPx)) / 256) * maxDigitWidthPx);
}

/** 等幅の日本語フォント（全角=1em / 半角=0.5em）前提で文字列の実幅を px で返す */
export function measureTextPx(text: string, fontSizePt: number): number {
  const em = (fontSizePt * 96) / 72;
  let width = 0;
  for (const ch of text) {
    width += HALF_WIDTH_PATTERN.test(ch) ? em / 2 : em;
  }
  return width;
}

/**
 * 幅 availablePx のセルに text が収まる最大のフォントサイズを返す。
 * 収まっているなら baseSizePt をそのまま返す（＝収まっている行は触らない）。
 */
export function fitFontSizePt(text: string, availablePx: number, baseSizePt: number): number {
  const usable = (availablePx - CELL_PADDING_PX) * SAFETY_RATIO;
  if (!text || usable <= 0 || !(baseSizePt > 0)) return baseSizePt;

  let size = baseSizePt;
  while (size > MIN_FONT_SIZE_PT && measureTextPx(text, size) > usable) {
    // 0.5pt 刻み。浮動小数の誤差が溜まらないように毎回丸める
    size = Math.max(MIN_FONT_SIZE_PT, Math.round((size - FONT_STEP_PT) * 10) / 10);
  }
  return size;
}
