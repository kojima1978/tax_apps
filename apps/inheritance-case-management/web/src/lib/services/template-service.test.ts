import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { cellWidthPx, fillDiscountRows, shrinkLetterheadToFit } from './template-service';

// 実際の住所・電話番号は公開リポジトリに置かないため、全角／半角の構成だけ
// 同じにした同幅のダミーを使う（住所=全角11+半角14、電話=全角1+半角32）。
const ADDRESS_LIKE = '〒000-0000 ○○県○○市○○2丁目3-33';
const PHONE_LIKE = 'TEL:000-000-0000　FAX:000-000-0000';

/**
 * レターヘッドと同じ形のシートを組む。
 * K〜O列（幅6.5）を結合した行が2つで、**2行が同じ style オブジェクトを共有**する
 * ── テンプレートの実物と同じ状態（ExcelJS は同じ書式のセルに同一の style を持たせる）。
 */
function buildLetterheadSheet(address: string, phone: string) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('test');
  for (let col = 11; col <= 15; col++) ws.getColumn(col).width = 6.5;
  ws.mergeCells('K8:O8');
  ws.mergeCells('K9:O9');
  const shared: Partial<ExcelJS.Style> = { font: { name: 'ＭＳ 明朝', size: 9, bold: true } };
  ws.getCell('K8').style = shared;
  ws.getCell('K9').style = shared;
  ws.getCell('K8').value = address;
  ws.getCell('K9').value = phone;
  return ws;
}

describe('cellWidthPx', () => {
  it('結合セルは範囲全体の幅を返す', () => {
    const ws = buildLetterheadSheet(ADDRESS_LIKE, PHONE_LIKE);
    expect(cellWidthPx(ws, 'K8')).toBe(225);
  });

  it('結合されていないセルは1列分', () => {
    const ws = buildLetterheadSheet(ADDRESS_LIKE, PHONE_LIKE);
    expect(cellWidthPx(ws, 'K20')).toBe(45);
  });

  it('セル参照になっていない文字列は0px', () => {
    const ws = buildLetterheadSheet(ADDRESS_LIKE, PHONE_LIKE);
    expect(cellWidthPx(ws, 'K8:O8')).toBe(0);
  });
});

describe('shrinkLetterheadToFit', () => {
  it('入らない行だけ落とし、同じ書式を共有する行は巻き込まない', () => {
    const ws = buildLetterheadSheet(ADDRESS_LIKE, PHONE_LIKE);
    shrinkLetterheadToFit(ws);
    expect(ws.getCell('K8').font?.size).toBe(8.5);
    expect(ws.getCell('K9').font?.size).toBe(9);
  });

  it('収まっているなら何も変えない', () => {
    const ws = buildLetterheadSheet(PHONE_LIKE, PHONE_LIKE);
    shrinkLetterheadToFit(ws);
    expect(ws.getCell('K8').font?.size).toBe(9);
    expect(ws.getCell('K9').font?.size).toBe(9);
  });

  it('フォント名や太字はそのまま残す', () => {
    const ws = buildLetterheadSheet(ADDRESS_LIKE, PHONE_LIKE);
    shrinkLetterheadToFit(ws);
    expect(ws.getCell('K8').font?.name).toBe('ＭＳ 明朝');
    expect(ws.getCell('K8').font?.bold).toBe(true);
  });
});

/** 値引きの2行（38=遺産整理業務分 / 39=その他）だけを持つシート */
function buildDiscountSheet() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('test');
  ws.getCell('B38').value = '値　　引　　額';
  ws.getCell('B39').value = '値　　引　　額';
  ws.getCell('B40').value = '差　　引　　額';
  return ws;
}

describe('fillDiscountRows', () => {
  it('2つの値引きがあるときは行を分け、お客様に別々の名前で出す', () => {
    const ws = buildDiscountSheet();
    fillDiscountRows(ws, { administrativeDiscount: 40000, discount: 15000 });
    expect(ws.getCell('B38').value).toBe('値引額（遺産整理業務分）');
    expect(ws.getCell('M38').value).toBe(-40000);
    expect(ws.getCell('B39').value).toBe('値引額（その他）');
    expect(ws.getCell('M39').value).toBe(-15000);
    expect(ws.getRow(38).hidden).toBe(false);
    expect(ws.getRow(39).hidden).toBe(false);
  });

  it('遺産整理業務分だけなら1行（名前は「値引額」のまま・上の行は隠す）', () => {
    const ws = buildDiscountSheet();
    fillDiscountRows(ws, { administrativeDiscount: 40000, discount: 0 });
    expect(ws.getRow(38).hidden).toBe(true);
    expect(ws.getCell('M38').value).toBeNull();
    expect(ws.getCell('B39').value).toBe('値　　引　　額');
    expect(ws.getCell('M39').value).toBe(-40000);
  });

  it('その他の値引きだけなら1行（今までと同じ見た目）', () => {
    const ws = buildDiscountSheet();
    fillDiscountRows(ws, { discount: 15000 });
    expect(ws.getRow(38).hidden).toBe(true);
    expect(ws.getCell('B39').value).toBe('値　　引　　額');
    expect(ws.getCell('M39').value).toBe(-15000);
  });

  it('値引きが無ければ両方とも金額を空にし、行は1行だけ残す', () => {
    const ws = buildDiscountSheet();
    fillDiscountRows(ws, {});
    expect(ws.getRow(38).hidden).toBe(true);
    expect(ws.getCell('M38').value).toBeNull();
    expect(ws.getRow(39).hidden).toBe(false);
    expect(ws.getCell('M39').value).toBeNull();
  });

  it('マイナスで渡されても符号は1つ（帳票は常に引く向き）', () => {
    const ws = buildDiscountSheet();
    fillDiscountRows(ws, { administrativeDiscount: -40000, discount: -15000 });
    expect(ws.getCell('M38').value).toBe(-40000);
    expect(ws.getCell('M39').value).toBe(-15000);
  });
});
