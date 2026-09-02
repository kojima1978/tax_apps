/**
 * 様式原本（令和8年4月1日以降用「取引相場のない株式（出資）の評価明細書」）の実測レイアウト。
 *
 * 値の出どころ: public のサンプルPDFを110dpiでラスタライズし、罫線をピクセル検出して
 * A4ページ左上を原点とする mm に換算したもの。GridForm に様式ID（formCode）で引かれる。
 */

/** 様式原本の実測寸法（A4ページ左上を原点とする mm） */
export interface MmRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** 様式原本の実測レイアウト。指定すると本表・ヘッダーを原本と同じ位置・大きさに配置する */
export interface FormGeometry {
  /** 本表（罫線枠）の外枠 */
  frame: MmRect;
  /** 様式IDボックスの外枠 */
  formCodeBox?: MmRect;
  /** タイトル文字の上端（ページ中央寄せ） */
  titleTop?: number;
  /** headerExtra（氏名欄など）の外枠 */
  headerExtraBox?: MmRect;
  /** 本表の左外に置く縦書き帯 */
  leftBand?: string;
  /** 本表の右外に置く縦書き帯 */
  rightBand?: string;
}

/** 縦書きの帯は13ページとも同一の文言 */
const LEFT_BAND = '（取引相場のない株式（出資）の評価明細書）';
const RIGHT_BAND = '（令和八年四月一日以降用）';

const rect = (left: number, top: number, width: number, height: number): MmRect => ({ left, top, width, height });

const geom = (frame: MmRect, formCodeBox: MmRect, titleTop: number, headerExtraBox: MmRect): FormGeometry =>
  ({ frame, formCodeBox, titleTop, headerExtraBox, leftBand: LEFT_BAND, rightBand: RIGHT_BAND });

/** 様式ID → 実測レイアウト */
export const FORM_GEOMETRY: Record<string, FormGeometry> = {
  // 第１表の１
  NTA0VNA170010010: geom(rect(21.7, 57.5, 164.4, 237.7), rect(102.1, 12.0, 53.3, 5.1), 21.9, rect(105.6, 40.4, 80.5, 9.5)),
  // 第１表の１（続紙）
  NTA0VNA170020010: geom(rect(16.9, 50.3, 175.5, 234.8), rect(102.8, 12.2, 56.8, 5.3), 22.9, rect(110.6, 38.6, 81.7, 9.0)),
  // 第１表の２
  NTA0VNA180010010: geom(rect(18.7, 43.4, 171.8, 237.1), rect(102.8, 12.2, 59.8, 5.1), 25.4, rect(118.5, 33.3, 72.0, 7.6)),
  // 第２表
  NTA0VNA190010010: geom(rect(12.5, 43.2, 184.5, 221.7), rect(91.9, 12.2, 61.0, 5.1), 25.2, rect(107.1, 32.8, 89.8, 7.9)),
  // 第３表
  NTA0VNA200010010: geom(rect(15.0, 42.5, 179.4, 236.2), rect(103.7, 12.0, 63.0, 5.1), 24.9, rect(118.7, 32.3, 75.7, 7.6)),
  // 第４表の１
  NTA0VNA210010010: geom(rect(14.8, 43.9, 179.9, 194.4), rect(105.5, 12.2, 61.0, 5.1), 25.6, rect(121.2, 33.3, 73.2, 8.1)),
  // 第４表の２
  NTA0VNA210020010: geom(rect(14.1, 44.3, 181.3, 228.6), rect(106.2, 12.2, 60.7, 5.3), 25.9, rect(122.6, 33.5, 72.7, 8.1)),
  // 第５表
  NTA0VNA220010010: geom(rect(13.6, 43.9, 182.0, 228.6), rect(103.7, 12.2, 59.8, 5.1), 25.6, rect(123.5, 33.3, 72.0, 8.1)),
  // 第５表（続紙）
  NTA0VNA220020010: geom(rect(15.9, 44.3, 177.6, 233.9), rect(100.7, 12.2, 60.5, 5.3), 25.9, rect(120.5, 33.5, 73.0, 8.1)),
  // 第６表
  NTA0VNA230010010: geom(rect(15.0, 41.1, 179.6, 247.1), rect(102.5, 12.0, 64.2, 5.1), 25.2, rect(117.8, 32.6, 76.9, 6.0)),
  // 第７表の１
  NTA0VNA240010010: geom(rect(15.9, 44.6, 177.6, 174.6), rect(103.7, 12.2, 61.2, 5.3), 25.9, rect(119.8, 33.7, 73.7, 8.3)),
  // 第７表の２
  NTA0VNA240020010: geom(rect(15.2, 42.9, 179.2, 222.1), rect(105.8, 12.0, 61.2, 5.1), 25.2, rect(124.5, 32.6, 70.0, 7.9)),
  // 第７表の３
  NTA0VNA240030010: geom(rect(16.9, 44.6, 175.5, 231.8), rect(102.8, 12.2, 61.0, 5.3), 25.9, rect(118.7, 33.7, 73.7, 8.3)),
};
