import { describe, expect, it } from 'vitest';
import type { TableId } from '@/types/form';
import { buildCalculationWorksheet } from '../calculationWorksheet';
import { RETIREMENT_AMOUNT_FIELD, RETIREMENT_INSURANCE_FIELD, calcRetirementSimulation } from '../retirementSimulation';
import { ASSUMED_PROFIT_FIELD, BASIS_FIELD } from '../summaryOptions';
import { calcValuationBasis } from '../valuationReport';

function fixture(table1_1: Record<string, string> = {}) {
  const data: Partial<Record<TableId, Record<string, string>>> = {
    table1_1: { f12: '株式会社テスト', '⑤': '1000', '⑥': '1000', '③': '1000', sh_1_5: '1000', ...table1_1 },
    table1_2: { gyoshu: 'その他', f22: '100000', f24: '5000', emp_regular: '3' },
    table4: { '①': '10000', e18: '10000', e19: '500', e25: '6000', n53: '30000', f28: '1000', f32: '1000', r1sB1: '10', r1sB2: '80', r1sC: '25', r1sD: '100', '㋷': '300' },
    table5: { a_1_1: '普通預金', a_1_2: '100000', a_1_3: '100000', a_2_1: '土地', a_2_2: '20000', a_2_3: '10000', a_2_4: '土地等' },
  };
  const get = (table: TableId, field: string) => data[table]?.[field] ?? '';
  return { data, get };
}

const scenario = (get: Parameters<typeof buildCalculationWorksheet>[0], key: string) =>
  buildCalculationWorksheet(get).scenarios.filter((s) => s.key === key);

describe('試算の計算過程（別紙）', () => {
  it('利益0の試算額はサマリーの「利益0の場合」と一致する', () => {
    const { get } = fixture();
    const [zero] = scenario(get, 'zero-profit');
    const basis = calcValuationBasis(get, 'inheritance');
    expect(zero!.skipped).toBeNull();
    expect(zero!.currentPrice).toBe(basis.gensoku);
    expect(zero!.trialPrice).toBe(basis.gensokuZeroProfit);
    expect(zero!.trialPrice).not.toBe(zero!.currentPrice);
  });

  it('想定利益の試算額はサマリーの「想定利益の場合」と一致し、未入力なら省略する', () => {
    expect(scenario(fixture().get, 'assumed-profit')[0]!.skipped).toContain('未入力');
    const { get } = fixture({ [ASSUMED_PROFIT_FIELD]: '20,000' });
    const [assumed] = scenario(get, 'assumed-profit');
    expect(assumed!.skipped).toBeNull();
    expect(assumed!.trialPrice).toBe(calcValuationBasis(get, 'inheritance', 20000).gensokuAssumed);
  });

  it('退職金の試算額は評価ベースごとにサマリーの退職金試算と一致する', () => {
    const { get } = fixture({ [RETIREMENT_AMOUNT_FIELD]: '5000', [RETIREMENT_INSURANCE_FIELD]: '1200' });
    const retirement = scenario(get, 'retirement');
    const simulation = calcRetirementSimulation(get);
    expect(retirement.map((s) => s.basis)).toEqual(['inheritance', 'special-market-value']);
    retirement.forEach((s, i) => {
      expect(s.skipped).toBeNull();
      expect(s.currentPrice).toBe(calcValuationBasis(get, s.basis).gensoku);
      expect(s.trialPrice).toBe(simulation.bases[i]!.gensoku);
    });
  });

  it('退職金の差し替え欄は現在値から退職金・解約益を加減した値になる', () => {
    const { get } = fixture({ [RETIREMENT_AMOUNT_FIELD]: '5000', [RETIREMENT_INSURANCE_FIELD]: '1200' });
    const inputs = scenario(get, 'retirement')[0]!.sections[0]!.rows;
    expect(inputs.map((r) => [r.current, r.trial])).toEqual([
      ['10,000千円', '6,200千円'],
      ['500千円', '0千円'],
      ['30,000千円', '26,200千円'],
      ['－', '5,000千円'],
    ]);
    // ⑫は 500 ＋ 1,200 － 5,000 が負数になるので0
    expect(inputs[1]!.process).toContain('500 ＋ 解約益 1,200 － 退職金 5,000 ＝ △3,300千円（負数のため0千円）');
  });

  it('計算過程の数字は入力にカンマがなくても3桁ごとに区切る', () => {
    // フィクスチャの入力はカンマなし。試算の getField も String(数値) を返すので、そのまま埋めると区切られない
    const { get } = fixture({ [ASSUMED_PROFIT_FIELD]: '20000', [RETIREMENT_AMOUNT_FIELD]: '5000', [RETIREMENT_INSURANCE_FIELD]: '1200' });
    const sheet = buildCalculationWorksheet(get);
    const texts = sheet.scenarios.flatMap((s) => [s.description, ...s.sections.flatMap((sec) => [sec.note ?? '', ...sec.rows.flatMap((r) => [r.current, r.trial, r.process])])]);
    const unseparated = texts.flatMap((t) => t.match(/(?<![\d.,])\d{4,}/g) ?? []);
    expect(unseparated).toEqual([]);
  });

  it('負数の金額は明細書と同じく△で表す', () => {
    const { get } = fixture({ [RETIREMENT_AMOUNT_FIELD]: '12000' });
    const [income] = scenario(get, 'retirement')[0]!.sections[0]!.rows;
    expect(income!.trial).toBe('△2,000千円');
    expect(income!.process).toContain('10,000 － 退職金 12,000 ＋ 解約益 0 ＝ △2,000千円');
    const texts = buildCalculationWorksheet(get).scenarios.flatMap((s) => s.sections.flatMap((sec) => sec.rows.flatMap((r) => [r.current, r.trial])));
    expect(texts.filter((t) => /^-/.test(t))).toEqual([]);
  });

  it('評価ベースを絞ると退職金の試算もそのベースだけになる', () => {
    const { get } = fixture({ [RETIREMENT_AMOUNT_FIELD]: '5000', [BASIS_FIELD]: 'inheritance' });
    expect(scenario(get, 'retirement').map((s) => s.basis)).toEqual(['inheritance']);
  });

  it('退職金が未入力・入力不備なら理由を添えて省略する', () => {
    expect(scenario(fixture().get, 'retirement')[0]!.skipped).toContain('未入力');
    const { data, get } = fixture({ [RETIREMENT_AMOUNT_FIELD]: '5000' });
    delete data.table4!.n53;
    const [skipped] = scenario(get, 'retirement');
    expect(skipped!.skipped).toContain('利益積立金額');
    expect(skipped!.sections).toEqual([]);
  });

  it('計算過程の文言に未定義が混ざらない', () => {
    const { get } = fixture({ [ASSUMED_PROFIT_FIELD]: '20000', [RETIREMENT_AMOUNT_FIELD]: '5000' });
    const sheet = buildCalculationWorksheet(get);
    expect(sheet.companyName).toBe('株式会社テスト');
    const texts = sheet.scenarios.flatMap((s) => s.sections.flatMap((sec) => sec.rows.flatMap((r) => [r.label, r.current, r.trial, r.process])));
    expect(texts.length).toBeGreaterThan(0);
    expect(texts.filter((t) => typeof t !== 'string' || t.includes('undefined') || t.includes('NaN'))).toEqual([]);
  });
});
