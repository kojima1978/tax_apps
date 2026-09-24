import { describe, it, expect } from 'vitest';
import type { TableProps } from '@/types/form';
import {
  corporateTaxEquivalentOf,
  defaultCorporateTaxRatePercent,
  formatRatePercent,
  getCorporateTaxRatePercent,
  parseCorporateTaxRatePercent,
  taxTimeYear,
} from '../corporateTaxRate';

// 率が課税時期で変わる（令和8年4月1日以後の取得分＝38％／それより前＝37％）ことと、
// 第5表⑧のラベル「（⑦×○％）」で率を上書きできることがこの機能の全部なので、
// 境目の前後と、上書きとして受け付ける入力の範囲をここで固定する。
const gf = (data: Record<string, string>): TableProps['getField'] =>
  ((table: string, field: string) => data[`${table}.${field}`] ?? '') as TableProps['getField'];

const taxTime = (year: string, month = '') => ({ 'table1_1.f14_g': '令和', 'table1_1.f14_y': year, 'table1_1.f14_m': month });

describe('法人税額等相当額の割合', () => {
  describe('課税時期から決まる既定', () => {
    it('令和8年4月1日が境目（3月までは37％、4月からは38％）', () => {
      expect(defaultCorporateTaxRatePercent(gf(taxTime('8', '3')))).toBe(37);
      expect(defaultCorporateTaxRatePercent(gf(taxTime('8', '4')))).toBe(38);
      expect(defaultCorporateTaxRatePercent(gf(taxTime('8', '12')))).toBe(38);
    });

    it('令和7年以前は月によらず37％、令和9年以降は38％', () => {
      expect(defaultCorporateTaxRatePercent(gf(taxTime('7', '12')))).toBe(37);
      expect(defaultCorporateTaxRatePercent(gf(taxTime('7')))).toBe(37);
      expect(defaultCorporateTaxRatePercent(gf(taxTime('9', '1')))).toBe(38);
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

    it('令和8年で月だけ未入力なら改正後の38％（年内の大半が4月以後）', () => {
      expect(taxTimeYear(gf(taxTime('8')))).toBe(2026);
      expect(defaultCorporateTaxRatePercent(gf(taxTime('8')))).toBe(38);
    });

    it('日は見ない（境目が1日なので年と月だけで決まる）', () => {
      const march = { ...taxTime('8', '3'), 'table1_1.f14_d': '' };
      expect(defaultCorporateTaxRatePercent(gf(march))).toBe(37);
      expect(defaultCorporateTaxRatePercent(gf({ ...march, 'table1_1.f14_d': '31' }))).toBe(37);
    });
  });

  describe('第5表の率の上書き', () => {
    it('％として読めるものを上書きにする（％記号付き・小数・0も可）', () => {
      expect(parseCorporateTaxRatePercent('37')).toBe(37);
      expect(parseCorporateTaxRatePercent(' 37.5 ')).toBe(37.5);
      expect(parseCorporateTaxRatePercent('37％')).toBe(37);
      expect(parseCorporateTaxRatePercent('37%')).toBe(37);
      expect(parseCorporateTaxRatePercent('0')).toBe(0);
    });

    it('空欄・数字でないもの・0〜100の外は上書きなし（既定へ戻す）', () => {
      // 範囲外を黙って使うと、桁を打ち間違えた率でそのまま計算して印刷まで通ってしまう
      expect(parseCorporateTaxRatePercent('')).toBeNull();
      expect(parseCorporateTaxRatePercent('   ')).toBeNull();
      expect(parseCorporateTaxRatePercent('％')).toBeNull();
      expect(parseCorporateTaxRatePercent('-1')).toBeNull();
      expect(parseCorporateTaxRatePercent('101')).toBeNull();
    });

    it('入力があればその率、無ければ課税時期の既定（第7表の3へ配るのもこの値）', () => {
      const march = taxTime('8', '3');
      expect(getCorporateTaxRatePercent(gf(march))).toBe(37);
      expect(getCorporateTaxRatePercent(gf({ ...march, 'table5._corporate_tax_rate': '30' }))).toBe(30);
      // 範囲外は無視して既定に戻る
      expect(getCorporateTaxRatePercent(gf({ ...march, 'table5._corporate_tax_rate': '300' }))).toBe(37);
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
