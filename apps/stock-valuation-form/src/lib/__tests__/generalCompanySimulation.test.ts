import { describe, expect, it } from 'vitest';
import { calcGeneralCompanySimulation } from '@/lib/generalCompanySimulation';
import type { TableId } from '@/types/form';

type Data = Partial<Record<TableId, Record<string, string>>>;
const base: Data = {
  table1_1: { '⑤': '200000', f63: '0', sh_1_5: '150000', '⑥': '200000', f14_y: '8', f14_m: '4', f14_d: '1' },
  table1_2: { gyoshu: 'その他', f22: '100000', f24: '50000', emp_regular: '80' },
  table2: { f85_g: '平成', f85_y: '20', f85_m: '4', f85_d: '1' },
  table4: {
    '①': '10000', f28: '0', f32: '0', f36: '0',
    e18: '0', e25: '0', e32: '0', n53: '0', n56: '10000', n57: '0',
    '㋷': '300', r1sB1: '5', r1sC: '20', r1sD: '250',
  },
  table5: { a_1_1: '現金', a_1_2: '100000', a_1_3: '100000', l_1_1: '借入金', l_1_2: '20000', l_1_3: '20000' },
};
const gf = (data: Data) => (table: TableId, field: string) => data[table]?.[field] ?? '';

describe('一般の評価会社への移行の参考比較', () => {
  it('比準1の現在303円と一般会社12円を比較し、入力を変更しない', () => {
    const snapshot = JSON.stringify(base);
    const trial = calcGeneralCompanySimulation(gf(base), 'inheritance');
    expect(trial).toMatchObject({ source: '比準要素数1の会社', currentPrice: 303, generalPrice: 12, diff: -291, blockers: [], pending: [] });
    expect(JSON.stringify(base)).toBe(snapshot);
  });

  it('比準0の一般会社参考値0円を欠損扱いしない', () => {
    const trial = calcGeneralCompanySimulation(gf({ ...base, table4: { ...base.table4, n53: '-10000', n57: '-10000' } }), 'inheritance');
    expect(trial).toMatchObject({ source: '比準要素数0の会社', currentPrice: 400, generalPrice: 0, diff: -400, diffRate: -100 });
  });

  it('他の特定会社区分がある場合は比較差額を出さない', () => {
    const trial = calcGeneralCompanySimulation(gf({ ...base, table2: { ...base.table2, s6_seisan: '1' } }), 'inheritance');
    expect(trial).toMatchObject({ currentPrice: null, diff: null, blockers: ['清算中'] });
  });

  it('類似業種が未入力なら純資産へのフォールバックを比較しない', () => {
    const trial = calcGeneralCompanySimulation(gf({ ...base, table4: { ...base.table4, '㋷': '' } }), 'inheritance');
    expect(trial).toMatchObject({ currentPrice: null, generalPrice: null, diff: null });
  });

  it('所得税・法人税ベースは小会社として計算し、未使用の第3表修正を混入しない', () => {
    const trial = calcGeneralCompanySimulation(gf({ ...base, table3: { mod1_div: '100' }, table6: { mod9_div: '200' } }), 'special-market-value');
    expect(trial).toMatchObject({ size: 0, currentPrice: 302, generalPrice: 204, diff: -98 });
  });

  it('比準0・1のいずれでもない会社では表示しない', () => {
    const trial = calcGeneralCompanySimulation(gf({ ...base, table4: { ...base.table4, e18: '10000', e25: '10000', e32: '10000' } }), 'inheritance');
    expect(trial).toBeNull();
  });
});
