import { describe, expect, it } from 'vitest';
import { buildAssetTaxWorksheet } from './assetTaxWorksheet';

describe('buildAssetTaxWorksheet', () => {
  it('資産別税額の端数を調整して本人の税額と一致させる', () => {
    const result = buildAssetTaxWorksheet([
      { id: 'a', category: '土地', description: 'A', personIndex: 0, amount: 2 },
      { id: 'b', category: '預金', description: 'B', personIndex: 0, amount: 1 },
    ], [{ name: '相続人', declaredAssets: 3, otherTaxBase: 0, debtAndFuneral: 0, taxablePrice: 3, taxBurden: 100, payable: 70 }]);

    expect(result.rows.map((row) => row.allocatedTax)).toEqual([67, 33]);
    expect(result.rows.reduce((sum, row) => sum + row.allocatedTax, 0)).toBe(100);
    expect(result.rows.reduce((sum, row) => sum + row.allocatedPayable, 0)).toBe(70);
  });

  it('付表との差額とその他の課税価格を独立行にする', () => {
    const result = buildAssetTaxWorksheet([
      { id: 'a', category: '土地', description: 'A', personIndex: 0, amount: 600 },
    ], [{ name: '相続人', declaredAssets: 1_000, otherTaxBase: 200, debtAndFuneral: 100, taxablePrice: 1_100, taxBurden: 110, payable: 100 }]);

    expect(result.rows.map((row) => row.amount)).toEqual([600, 400, 200]);
    expect(result.rows.map((row) => row.description)).toContain('付表明細との差額・未入力明細');
    expect(result.rows.map((row) => row.description)).toContain('相続時精算課税・暦年課税等（第1表②・⑤）');
  });
});
