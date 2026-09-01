import { describe, it, expect } from 'vitest';
import type { TableId } from '@/types/form';
import { calcValuationReport } from '@/lib/valuationReport';

type Data = Partial<Record<TableId, Record<string, string>>>;
const mkGetField = (data: Data) => (table: TableId, field: string): string => data[table]?.[field] ?? '';

// 小会社・株主3名（60% / 37% / 3%）の最小構成。
// 第4表を入力していないので類似業種比準価額は算定不可となり、
// 原則的評価額＝1株当たり純資産価額（第5表⑪）になる。
const data: Data = {
  table5: {
    a_1_1: '現金', a_1_2: '10000', a_1_3: '8000',
    a_2_1: '株式', a_2_2: '5000', a_2_3: '3000', a_2_4: '株式等',
    a_3_1: '土地', a_3_2: '20000', a_3_3: '12000', a_3_4: '土地等',
    l_1_1: '借入金', l_1_2: '6000', l_1_3: '6000',
  },
  table1_1: {
    '⑤': '1000', f63: '0', '⑥': '1000', '③': '1000',
    sh_1_1: '甲', sh_1_4: '600', sh_1_5: '600',
    sh_2_1: '乙', sh_2_4: '370', sh_2_5: '370',
    sh_3_1: '丙', sh_3_4: '30', sh_3_5: '30',
  },
  table1_2: { gyoshu: 'その他', f22: '10000', f24: '5000', emp_regular: '3' },
};

describe('calcValuationReport（お客様報告：株価一覧・株主ごとの評価）', () => {
  const report = calcValuationReport(mkGetField(data));
  const souzoku = report.bases[0]!;
  const shotoku = report.bases[1]!;

  it('相続税評価額ベースは法人税額等相当額（評価差額×38％）を控除する', () => {
    expect(souzoku.key).toBe('inheritance');
    // 評価差額12,000千円 × 38% = 4,560千円 を控除 → (29,000-4,560)千円 ÷ 1,000株
    expect(souzoku.netAssetPrice).toBe(24440);
  });

  it('所得税・法人税ベースは法人税額等相当額を控除しない（所基通59－6(4)／法基通9－1－14(3)）', () => {
    expect(shotoku.key).toBe('special-market-value');
    // 控除しないので純資産29,000千円がそのまま1株当たりの価額になる
    expect(shotoku.netAssetPrice).toBe(29000);
  });

  it('評価目的の上書きは元データを書き換えない（同一入力から2ベースを同時算定できる）', () => {
    const again = calcValuationReport(mkGetField(data));
    expect(again.bases[0]!.netAssetPrice).toBe(24440);
    expect(again.bases[1]!.netAssetPrice).toBe(29000);
  });

  it('小会社はLの割合を持たず、原則的評価額は純資産価額になる', () => {
    expect(souzoku.sizeLabel).toBe('小会社');
    expect(souzoku.lRate).toBeNull();
    expect(souzoku.gensoku).toBe(24440);
    expect(shotoku.gensoku).toBe(29000);
  });

  it('株主ごとに判定をやり直し、議決権5％以上の株主は原則的評価方式になる', () => {
    const rows = report.shareholders;
    expect(rows.map((r) => r.name)).toEqual(['甲', '乙', '丙']);
    expect(rows[0]!).toMatchObject({ votingRatio: 60, method: 'gensoku' });
    expect(rows[1]!).toMatchObject({ votingRatio: 37, method: 'gensoku' });
  });

  it('評価額は「1株当たりの価額×株式数」で算定する', () => {
    const kou = report.shareholders[0]!;
    const otsu = report.shareholders[1]!;
    expect(kou.amounts[0]!).toMatchObject({ basis: 'inheritance', gensokuTotal: 600 * 24440, haitoTotal: null });
    expect(kou.amounts[1]!).toMatchObject({ basis: 'special-market-value', gensokuTotal: 600 * 29000 });
    expect(otsu.amounts[0]!.gensokuTotal).toBe(370 * 24440);
  });

  it('議決権5％未満の株主は役員・中心的な同族株主の判定が要るため確定させない', () => {
    const hei = report.shareholders[2]!;
    expect(hei).toMatchObject({ votingRatio: 3, method: 'unknown' });
    expect(hei.pendingReason).toContain('5%未満');
  });

  it('納税義務者本人にだけ入力された役員判定を、他の株主へ流用しない', () => {
    // 第1表の2の「役員に該当する」を入れても、5％未満の丙の判定は確定しない
    const withOfficer = calcValuationReport(mkGetField({
      ...data,
      table1_2: { ...data.table1_2, j_yakuin: 'yes' },
    }));
    expect(withOfficer.shareholders[2]!.method).toBe('unknown');
  });

  it('株主欄が空の行は報告に載せない', () => {
    expect(report.shareholders).toHaveLength(3);
  });

  it('利益0の類似業種比準価額は、第4表の年利益金額をゼロとして再計算する', () => {
    // ①10,000千円・⑤1,000株 → cap4=10,000円、cap5=200,000株
    // Ⓑ=5.00／Ⓒ=50／Ⓓ=200、B=10.80・C=25・D=100、A=300、斟酌率0.5（小会社）
    const withTable4 = calcValuationReport(mkGetField({
      ...data,
      table4: {
        '①': '10,000', e18: '10,000', n53: '30,000', f28: '1,000', f32: '1,000',
        r1sB1: '10', r1sB2: '80', r1sC: '25', r1sD: '100', '㋷': '300',
      },
    }));
    const basis = withTable4.bases[0]!;
    // 比準割合 (0.46＋2.00＋2.00)÷3＝1.48 → 300×1.48×0.5＝222円 → ×(10,000÷50)
    expect(basis.comparablePrice).toBe(44400);
    // Ⓒ＝0 なので (0.46＋0＋2.00)÷3＝0.82 → 300×0.82×0.5＝123円 → ×(10,000÷50)
    expect(basis.comparablePriceZeroProfit).toBe(24600);
  });

  it('所得税・法人税ベースは帳票側のチェックに関係なく小会社として評価する（所基通59－6(2)）', () => {
    // 従業員70人以上なので相続税評価額ベースでは大会社になる
    const large = calcValuationReport(mkGetField({
      ...data,
      table1_2: { ...data.table1_2, emp_regular: '70' },
    }));
    expect(large.bases[0]!.size).toBe(4);
    expect(large.bases[1]!.size).toBe(0);
  });
});
