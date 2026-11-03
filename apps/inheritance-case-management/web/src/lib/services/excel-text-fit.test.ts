import { describe, it, expect } from 'vitest';
import { columnWidthToPx, measureTextPx, fitFontSizePt } from './excel-text-fit';

// 見積書・請求書テンプレートのレターヘッド（K列〜O列）の実寸。
// 列幅6.5が5列 = 45px x 5。
const LETTERHEAD_WIDTH_PX = columnWidthToPx(6.5) * 5;

// 実際の住所・電話番号は公開リポジトリに置かないため、全角／半角の構成だけ
// 同じにした同幅のダミーを使う（住所=全角11+半角14、電話=全角1+半角32）。
const ADDRESS_LIKE = '〒000-0000 ○○県○○市○○2丁目3-33';
const PHONE_LIKE = 'TEL:000-000-0000　FAX:000-000-0000';
const REGISTRATION_LIKE = '登録番号:T0000000000000';

describe('columnWidthToPx', () => {
  it('Excel の丸めどおりに列幅6.5を45pxにする', () => {
    expect(columnWidthToPx(6.5)).toBe(45);
  });

  it('幅が無い列は0pxにする', () => {
    expect(columnWidthToPx(0)).toBe(0);
    expect(columnWidthToPx(Number.NaN)).toBe(0);
  });
});

describe('measureTextPx', () => {
  it('全角は1em・半角は0.5emで数える', () => {
    expect(measureTextPx('徳', 9)).toBeCloseTo(12);
    expect(measureTextPx('A', 9)).toBeCloseTo(6);
    expect(measureTextPx('〒', 9)).toBeCloseTo(12);
    expect(measureTextPx('　', 9)).toBeCloseTo(12);
    expect(measureTextPx(' ', 9)).toBeCloseTo(6);
  });

  it('サロゲートペアを1文字として数える', () => {
    expect(measureTextPx('𠮷', 9)).toBeCloseTo(12);
  });

  it('フォントサイズに比例する', () => {
    expect(measureTextPx(ADDRESS_LIKE, 9)).toBeCloseTo(216);
    expect(measureTextPx(ADDRESS_LIKE, 8.5)).toBeCloseTo(204);
    expect(measureTextPx(ADDRESS_LIKE, 8)).toBeCloseTo(192);
  });
});

describe('fitFontSizePt', () => {
  it('住所行は9ptでは余裕が足りないので8.5ptへ落とす', () => {
    expect(fitFontSizePt(ADDRESS_LIKE, LETTERHEAD_WIDTH_PX, 9)).toBe(8.5);
  });

  it('収まっている行は触らない', () => {
    expect(fitFontSizePt(PHONE_LIKE, LETTERHEAD_WIDTH_PX, 9)).toBe(9);
    expect(fitFontSizePt(REGISTRATION_LIKE, LETTERHEAD_WIDTH_PX, 9)).toBe(9);
  });

  it('空文字は元のサイズを返す', () => {
    expect(fitFontSizePt('', LETTERHEAD_WIDTH_PX, 9)).toBe(9);
  });

  it('幅が取れないときは元のサイズを返す（勝手に小さくしない）', () => {
    expect(fitFontSizePt(ADDRESS_LIKE, 0, 9)).toBe(9);
    expect(fitFontSizePt(ADDRESS_LIKE, LETTERHEAD_WIDTH_PX, 0)).toBe(0);
  });

  it('どうしても収まらないときは下限7ptで止まる', () => {
    expect(fitFontSizePt('徳'.repeat(100), LETTERHEAD_WIDTH_PX, 9)).toBe(7);
  });

  it('落とすのは0.5pt刻み', () => {
    // 11pt では 212.7px で入らず、10.5pt では 203px で入る長さ（使える幅は209px）
    const text = `${'徳'.repeat(14)}A`;
    expect(fitFontSizePt(text, LETTERHEAD_WIDTH_PX, 11)).toBe(10.5);
  });
});
