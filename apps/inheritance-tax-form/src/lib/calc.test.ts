import { describe, expect, it } from 'vitest';
import { computeAll, num, type Values } from './calc';

const lawfulThirds = (): Values[] => Array.from(
  { length: 3 },
  (_, index) => ({ name: `法定相続人${index + 1}`, num: '1', den: '3' }),
);

describe('computeAll ⑧あん分割合の端数調整', () => {
  it('合計を1.00にし、税額控除で増分を吸収できる人へ0.01を配分する', () => {
    const heirs: Values[] = [
      { name: '甲', v1: '40000000', v12: '4000000' },
      { name: '乙', v1: '40000000' },
      { name: '丙', v1: '40000000' },
    ];

    const result = computeAll({}, heirs, lawfulThirds());
    const ratios = result.heirs.map((heir) => heir.v8);

    expect(ratios).toEqual(['0.34', '0.33', '0.33']);
    expect(ratios.reduce((sum, ratio) => sum + num(ratio), 0)).toBeCloseTo(1, 10);
  });

  it('保存済みの手入力割合を採用せず、全員分を再計算する', () => {
    const heirs: Values[] = [
      { name: '甲', v1: '40000000', v8: '0.99', v8m: '1' },
      { name: '乙', v1: '40000000', v8: '0.01', v8m: '1' },
      { name: '丙', v1: '40000000' },
    ];

    const result = computeAll({}, heirs, lawfulThirds());

    expect(result.heirs.map((heir) => heir.v8)).toEqual(['0.34', '0.33', '0.33']);
  });

  it('元の端数の大きさよりも税額の最小化を優先する', () => {
    const heirs: Values[] = [
      { name: '甲', v1: '50000000' },       // 正確な割合 0.4166…
      { name: '乙', v1: '40000000', v12: '4000000' }, // 0.3333…・控除で税額増分を吸収
      { name: '丙', v1: '30000000' },       // 0.25
    ];

    const result = computeAll({}, heirs, lawfulThirds());

    // 最大剰余法なら甲が0.42になるが、税額が少ない乙へ0.01を配る。
    expect(result.heirs.map((heir) => heir.v8)).toEqual(['0.41', '0.34', '0.25']);
  });
});

describe('computeAll 第3表の未対応欄', () => {
  it('保存済みの㋭を計算に使用しない', () => {
    const result = computeAll(
      { k2: '999999' },
      [{ name: '甲', v1: '120000000' }],
      [{ name: '甲', num: '1', den: '1' }],
    );

    expect(result.totals.k2).toBe('');
    expect(result.totals.k6).toBe('');
    expect(result.totals.t11).toBe('');
  });
});

describe('computeAll 第2表⑤の法定相続分合計', () => {
  it('分数の合計が正確に1なら注記を表示しない', () => {
    const result = computeAll({}, [], [
      { name: '甲', num: '1', den: '3' },
      { name: '乙', num: '2', den: '3' },
    ]);

    expect(result.totals.lawShareInvalid).toBe('');
    expect(result.totals.lawShareTotalDisplay).toBe('1');
  });

  it('分数の合計が1でなければ合計欄の注記を生成する', () => {
    const result = computeAll({}, [], [
      { name: '甲', num: '1', den: '3' },
      { name: '乙', num: '1', den: '3' },
    ]);

    expect(result.totals.lawShareInvalid).toBe('1');
    expect(result.totals.lawShareTotalDisplay).toBe('1\n※合計が1ではありません');
  });
});

describe('computeAll 第4表の2の年分', () => {
  it('相続開始年から前年・前々年・前々々年を2桁で自動入力する', () => {
    const result = computeAll({ startEra: '5', startY: '7' }, [], [], ['table42']);

    expect(result.totals.t42y0b0Era).toBe('5');
    expect(result.totals.t42y0b0Y).toBe('06');
    expect(result.totals.t42y0b1Y).toBe('05');
    expect(result.totals.t42y0b2Y).toBe('04');
  });

  it('元号の境界をまたぐ前年を正しく変換する', () => {
    const result = computeAll({ startEra: '5', startY: '1' }, [], [], ['table42']);

    expect(result.totals.t42y0b0Era).toBe('4');
    expect(result.totals.t42y0b0Y).toBe('30');
  });
});
