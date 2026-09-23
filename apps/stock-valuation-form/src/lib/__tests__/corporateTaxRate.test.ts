import { describe, it, expect } from 'vitest';
import type { TableProps } from '@/types/form';
import {
  CORPORATE_TAX_RATE_FIELD,
  corporateTaxEquivalentOf,
  defaultCorporateTaxRatePercent,
  formatRatePercent,
  getCorporateTaxRatePercent,
  parseCorporateTaxRatePercent,
  taxTimeYear,
} from '../corporateTaxRate';

// 率が年分で変わる（令和7年分＝37％ / 令和8年分＝38％）ことがこの機能の全部なので、
// 境目の1年ぶんと、上書きが効く／効かない条件をここで固定する。
const gf = (data: Record<string, string>): TableProps['getField'] =>
  ((table: string, field: string) => data[`${table}.${field}`] ?? '') as TableProps['getField'];

describe('法人税額等相当額の割合', () => {
  describe('課税時期の年分から決まる既定', () => {
    it('令和7年分は37％、令和8年分は38％（境目で切り替わる）', () => {
      expect(defaultCorporateTaxRatePercent(gf({ 'table1_1.f14_g': '令和', 'table1_1.f14_y': '7' }))).toBe(37);
      expect(defaultCorporateTaxRatePercent(gf({ 'table1_1.f14_g': '令和', 'table1_1.f14_y': '8' }))).toBe(38);
      expect(defaultCorporateTaxRatePercent(gf({ 'table1_1.f14_g': '令和', 'table1_1.f14_y': '9' }))).toBe(38);
    });

    it('元号を省いても令和として読む（画面の既定が令和）', () => {
      expect(defaultCorporateTaxRatePercent(gf({ 'table1_1.f14_y': '7' }))).toBe(37);
    });

    it('平成は当然37％側', () => {
      expect(defaultCorporateTaxRatePercent(gf({ 'table1_1.f14_g': '平成', 'table1_1.f14_y': '30' }))).toBe(37);
    });

    it('課税時期が未入力なら38％（この様式の年分）', () => {
      expect(taxTimeYear(gf({}))).toBeNull();
      expect(defaultCorporateTaxRatePercent(gf({}))).toBe(38);
    });

    it('月日が未入力でも年だけで決まる（日付を入れ切る前から率が確定してよい）', () => {
      expect(taxTimeYear(gf({ 'table1_1.f14_g': '令和', 'table1_1.f14_y': '7' }))).toBe(2025);
      expect(defaultCorporateTaxRatePercent(gf({ 'table1_1.f14_g': '令和', 'table1_1.f14_y': '7' }))).toBe(37);
    });
  });

  describe('前提条件からの上書き', () => {
    it('数字・％付き・小数を受け付ける', () => {
      expect(parseCorporateTaxRatePercent('37')).toBe(37);
      expect(parseCorporateTaxRatePercent(' 37.5 ')).toBe(37.5);
      expect(parseCorporateTaxRatePercent('38％')).toBe(38);
      expect(parseCorporateTaxRatePercent('38%')).toBe(38);
      expect(parseCorporateTaxRatePercent('0')).toBe(0);
    });

    it('空・数字でない・範囲外は上書きなし（黙って異常な率で計算しない）', () => {
      expect(parseCorporateTaxRatePercent('')).toBeNull();
      expect(parseCorporateTaxRatePercent('   ')).toBeNull();
      expect(parseCorporateTaxRatePercent('三八')).toBeNull();
      expect(parseCorporateTaxRatePercent('-1')).toBeNull();
      expect(parseCorporateTaxRatePercent('101')).toBeNull();
    });

    it('上書きがあればそれ、無ければ年分の既定', () => {
      const year7 = { 'table1_1.f14_g': '令和', 'table1_1.f14_y': '7' };
      expect(getCorporateTaxRatePercent(gf(year7))).toBe(37);
      expect(getCorporateTaxRatePercent(gf({ ...year7, [`table1_1.${CORPORATE_TAX_RATE_FIELD}`]: '38' }))).toBe(38);
      // 読めない入力は既定へ戻る
      expect(getCorporateTaxRatePercent(gf({ ...year7, [`table1_1.${CORPORATE_TAX_RATE_FIELD}`]: 'あ' }))).toBe(37);
    });
  });

  describe('金額の計算', () => {
    it('評価差額×率（表示単位未満切捨て）', () => {
      expect(corporateTaxEquivalentOf(1000, 38)).toBe(380);
      expect(corporateTaxEquivalentOf(1000, 37)).toBe(370);
      expect(corporateTaxEquivalentOf(101, 38)).toBe(38);  // 38.38 → 38
      expect(corporateTaxEquivalentOf(0, 38)).toBe(0);
    });

    it('二進小数の誤差で1円下にずれない（0.38 を先に作らない）', () => {
      // 100 * 0.38 は 38.00000000000001 だが、3550 * 0.38 は 1348.9999999999998 になる
      expect(corporateTaxEquivalentOf(3550, 38)).toBe(1349);
      expect(corporateTaxEquivalentOf(1300, 37)).toBe(481);
    });

    it('評価差額がマイナスでも切捨ての向きは変えない（第5表⑤の△をそのまま通す）', () => {
      expect(corporateTaxEquivalentOf(-1000, 38)).toBe(-380);
    });
  });

  describe('表記', () => {
    it('整数は整数のまま、小数は必要なぶんだけ', () => {
      expect(formatRatePercent(38)).toBe('38');
      expect(formatRatePercent(37)).toBe('37');
      expect(formatRatePercent(37.5)).toBe('37.5');
      expect(formatRatePercent(37.25)).toBe('37.25');
    });
  });
});
