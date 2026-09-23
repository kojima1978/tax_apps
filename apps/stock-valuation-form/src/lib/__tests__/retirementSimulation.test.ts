import { describe, expect, it } from 'vitest';
import type { TableId } from '@/types/form';
import { calcValuationBasis } from '../valuationReport';
import { calcRetirementSimulation, RETIREMENT_AMOUNT_FIELD, RETIREMENT_INSURANCE_FIELD } from '../retirementSimulation';

function fixture(amount = '5000', proceeds = '') {
  const data: Partial<Record<TableId, Record<string, string>>> = {
    table1_1: {
      '⑤': '1000', '⑥': '1000', '③': '1000', sh_1_5: '1000',
      [RETIREMENT_AMOUNT_FIELD]: amount, [RETIREMENT_INSURANCE_FIELD]: proceeds,
    },
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
    // 100,001千円を支給すると資産100,000千円を1,000千円下回る。⑤⑨（純資産価額）は
    // マイナスのまま記載するが（マイナスを 0 にするのは⑥と⑦だけ・記載方法等 第5表 3）、
    // 1株当たりの評価額（⑪）にマイナスは無いので 0 となる
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
  it('保険の解約益はⒸに乗らず、利益積立金額の増加としてだけ比準価額へ効く', () => {
    const { data, get } = fixture('', '3000');
    const after = calcRetirementSimulation(get);
    expect(after.error).toBeNull();
    // 保険は第5表に解約返戻金相当額で載っている前提なので、純資産価額は現在のまま。
    expect(after.bases.map((b) => b.netAssetPrice)).toEqual([100000, 100000]);
    // ⑪と⑫へ同額を立てた結果は、⑱だけ3,000千円増やした現在の評価と一致する。
    data.table4!.n53 = '33000';
    expect(after.bases[0]!.comparablePrice).toBe(calcValuationBasis(get, 'inheritance').comparablePrice);
  });
  it('⑫非経常的な利益金額の既存入力を上書きせず、解約益を積み増す', () => {
    const { data, get } = fixture('', '3000');
    data.table4!.e19 = '2000';
    const after = calcRetirementSimulation(get);
    data.table4!.n53 = '33000';
    expect(after.bases[0]!.comparablePrice).toBe(calcValuationBasis(get, 'inheritance').comparablePrice);
  });
  // 退職金は非経常的な損失として⑫で解約益・現在の⑫と相殺し、負数は0にする。
  // 試算結果が「⑪・⑫・⑱をその値で入力した現在の評価」と一致することで、差し替え後の各欄を確かめる。
  it.each([
    // [退職金, 解約益, 現在の⑫, 試算後の⑪, ⑫, ⑱]
    ['5000', '1200', '500', '6200', '0', '26200'], // 相殺しきれない退職金の残りだけⒸが下がる
    ['5000', '5000', '', '10000', '0', '30000'], // 同額なら⑪⑫⑱とも現在のまま
    ['2000', '5000', '1000', '13000', '4000', '33000'], // 解約益が多ければ残りが⑫に残り、Ⓒは動かない
  ])('退職金%s・解約益%s・⑫%sは非経常的な損益として⑫で相殺する', (pay, gain, e19, e18After, e19After, n53After) => {
    const { data, get } = fixture(pay, gain);
    if (e19) data.table4!.e19 = e19;
    const after = calcRetirementSimulation(get);
    Object.assign(data.table4!, { e18: e18After, e19: e19After, n53: n53After });
    expect(after.bases[0]!.comparablePrice).toBe(calcValuationBasis(get, 'inheritance').comparablePrice);
    expect(after.bases.map((b) => b.netAssetPrice)).toEqual([100000 - Number(pay), 100000 - Number(pay)]);
  });
  it('不正な解約益もエラーにし、どちらの欄が原因かを返す', () => {
    expect(calcRetirementSimulation(fixture('5000', '-1').get)).toMatchObject({
      bases: [], error: expect.stringContaining('解約益'), errorField: RETIREMENT_INSURANCE_FIELD,
    });
    expect(calcRetirementSimulation(fixture('abc', '3000').get).errorField).toBe(RETIREMENT_AMOUNT_FIELD);
  });
  it('続紙の負債を保持し、表示外の古い行を試算へ混入させない', () => {
    const { data, get } = fixture();
    Object.assign(data.table5!, { _pages: '2', l_38_1: '借入金', l_38_2: '10000', l_38_3: '10000', a_39_2: '999999' });
    expect(calcRetirementSimulation(get).bases.map((b) => b.netAssetPrice)).toEqual([85000, 85000]);
  });
});
