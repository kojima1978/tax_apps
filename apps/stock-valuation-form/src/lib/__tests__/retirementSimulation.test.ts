import { describe, expect, it } from 'vitest';
import type { TableId } from '@/types/form';
import { calcValuationBasis } from '../valuationReport';
import { calcRetirementSimulation, RETIREMENT_AMOUNT_FIELD } from '../retirementSimulation';

function fixture(amount = '5000') {
  const data: Partial<Record<TableId, Record<string, string>>> = {
    table1_1: { '⑤': '1000', '⑥': '1000', '③': '1000', sh_1_5: '1000', [RETIREMENT_AMOUNT_FIELD]: amount },
    table1_2: { gyoshu: 'その他', f22: '100000', f24: '5000', emp_regular: '3' },
    table4: { '①': '10000', e18: '10000', e25: '6000', n53: '30000', f28: '1000', f32: '1000', r1sB1: '10', r1sB2: '80', r1sC: '25', r1sD: '100', '㋷': '300' },
    table5: { a_1_1: '普通預金', a_1_2: '100000', a_1_3: '100000' },
  };
  const get = (table: TableId, field: string) => data[table]?.[field] ?? '';
  return { data, get };
}

describe('退職金支給後の試算（税軽減なし）', () => {
  it('5,000千円の支給で1,000株の純資産価額が5,000円減り、利益・簿価の減少も比準価額へ反映する', () => {
    const { data, get } = fixture();
    const saved = JSON.stringify(data);
    const before = calcValuationBasis(get, 'inheritance');
    const after = calcRetirementSimulation(get);
    expect(after.error).toBeNull();
    expect(after.bases).toHaveLength(2);
    expect(before.netAssetPrice).toBe(100000);
    expect(after.bases.map((b) => b.netAssetPrice)).toEqual([95000, 95000]);
    expect(after.bases[0]!.comparablePrice).toBeLessThan(before.comparablePrice!);
    expect(JSON.stringify(data)).toBe(saved);
  });
  it('0円支給は両ベースとも現在の評価と一致する', () => {
    const { get } = fixture('0');
    expect(calcRetirementSimulation(get).bases).toEqual([
      calcValuationBasis(get, 'inheritance'), calcValuationBasis(get, 'special-market-value'),
    ]);
  });
  it('含み益に対する38％控除と支給に伴う法人税軽減を混同しない', () => {
    const { data, get } = fixture();
    Object.assign(data.table5!, { a_2_1: '土地', a_2_2: '20000', a_2_3: '10000', a_2_4: '土地等' });
    const after = calcRetirementSimulation(get);
    expect(after.bases.map((b) => b.netAssetPrice)).toEqual([111200, 115000]);
  });
  it.each(['-1', '1.5', 'abc', 'Infinity'])('不正な支給額 %s では算定しない', (value) => {
    const { get } = fixture(value);
    expect(calcRetirementSimulation(get)).toMatchObject({ bases: [], error: expect.any(String) });
  });
  it('未入力は結果を作らず、資金残高を超える支給額でも試算する', () => {
    expect(calcRetirementSimulation(fixture('').get)).toMatchObject({ bases: [], error: null });
    const result = calcRetirementSimulation(fixture('100001').get);
    expect(result.error).toBeNull();
    expect(result.bases.map((b) => b.netAssetPrice)).toEqual([0, 0]);
  });
  it('利益の元データが不足している場合は計算しない', () => {
    const { data, get } = fixture();
    delete data.table4!.n53;
    expect(calcRetirementSimulation(get).error).toContain('利益積立金額');
    expect(calcRetirementSimulation(get).bases).toEqual([]);
  });
  it('現預金がなくても試算でき、会社規模は現在の判定を維持する', () => {
    const { data, get } = fixture();
    data.table1_2!.f22 = '1000';
    data.table5!.a_1_1 = '建物';
    const current = calcValuationBasis(get, 'inheritance');
    const result = calcRetirementSimulation(get);
    expect(result.error).toBeNull();
    expect(result.bases[0]!.netAssetPrice).toBe(95000);
    expect(result.bases[0]!.size).toBe(current.size);
  });
  it('続紙の負債を保持し、表示外の古い行を試算へ混入させない', () => {
    const { data, get } = fixture();
    Object.assign(data.table5!, { _pages: '2', l_38_1: '借入金', l_38_2: '10000', l_38_3: '10000', a_39_2: '999999' });
    expect(calcRetirementSimulation(get).bases.map((b) => b.netAssetPrice)).toEqual([85000, 85000]);
  });
});
