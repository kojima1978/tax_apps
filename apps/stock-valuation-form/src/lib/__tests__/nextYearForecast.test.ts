import { describe, it, expect } from 'vitest';
import type { TableId } from '@/types/form';
import { calcNextYearForecast } from '@/lib/nextYearForecast';
import { calcTable4 } from '@/components/tables/table4/calcTable4';

type Data = Partial<Record<TableId, Record<string, string>>>;
const mkGetField = (data: Data) => (table: TableId, field: string): string => data[table]?.[field] ?? '';

// ── 共通のひな型 ──
// 資本金等の額 10,000千円 → ⑤（1株50円当たりの発行済株式数）= 200,000株。
// per50(kc) = kc×1000÷200,000 = kc÷200 なので
//   Ⓒ・Ⓓ がゼロにならない下限 = 200千円、Ⓑ の2年平均の下限 = 20千円 と暗算できる。
const base: Data = {
  table1_1: { '⑤': '200000', f63: '0', sh_1_5: '150000', '⑥': '200000' },
  table1_2: { gyoshu: 'その他', f22: '100000', f24: '50000', emp_regular: '80' }, // 大会社（斟酌率0.7）
  table4: {
    '①': '10000',
    // 配当: 直前期0・直前々期0・直前々期の前1,000千円 → Ⓑ=0、Ⓑ2=2.5
    f28: '0', f32: '0', f36: '1000',
    // 利益: 100 / 300 / 300千円 → Ⓒ=0（低い方の自動選択で100千円）、Ⓒ2=1
    e18: '100', e25: '300', e32: '300',
    // 純資産: 資本金等10,000＋利益積立金0 → Ⓓ=50、Ⓓ2=50
    n53: '0', n56: '10000', n57: '0',
    // 類似業種（第1業種目）: A=300円、B=5円・C=20円・D=250円
    '㋷': '300', r1sB1: '5', r1sC: '20', r1sD: '250',
  },
  table5: {
    a_1_1: '現金', a_1_2: '100000', a_1_3: '100000',
    l_1_1: '借入金', l_1_2: '20000', l_1_3: '20000',
  },
};
const withTable4 = (over: Record<string, string>): Data => ({
  ...base,
  table4: { ...base.table4, ...over },
});

describe('calcNextYearForecast（来期の見通し：比準要素数1・比準要素数0）', () => {
  const f = calcNextYearForecast(mkGetField(base));

  it('今期の⑴でゼロが2つなら、来期の⑵条件（＝今期の⑴の繰り上がり）は成立が確定する', () => {
    expect(f.known).toBe(true);
    expect(f.medical).toBe(false);
    expect(f.zerosNow).toBe(2);
    expect(f.zeroLabels).toEqual(['Ⓑ 年配当金額', 'Ⓒ 年利益金額']);
    expect(f.carryOverMet).toBe(true);
    expect(f.currentResult).toBe(0); // 今期は⑵にゼロが無いので一般の評価会社
  });

  it('ゼロを避けるために必要な金額を要素ごとに算出する', () => {
    const [b, c, d] = f.elements;
    // Ⓑ: 2年平均が20千円以上 → 来期の配当は 20×2－0 ＝ 40千円以上
    expect(b).toMatchObject({ key: 'B', excluded: false, current: 0, isZeroNow: true, baseNow: 0, required: 40 });
    // Ⓒ: 低い方の自動選択なので単年200千円・2年平均400－100＝300千円の両方を満たす必要がある
    expect(c).toMatchObject({ key: 'C', current: 0, isZeroNow: true, baseNow: 100, required: 300 });
    expect(c!.requiredNote).toContain('200千円');
    // Ⓓ: 単年判定なので200千円以上
    expect(d).toMatchObject({ key: 'D', current: 50, isZeroNow: false, baseNow: 10000, required: 200 });
  });

  it('該当した場合の株価を修正前の価額どうしで比較する', () => {
    // 一般の評価会社（第3表④）= min(類似12円, 純資産400円) = 12円
    expect(f.currentPrice).toBe(12);
    const [h1, h0] = f.scenarios;
    // 比準要素数1（第6表④）= min(400, 12×0.25＋400×0.75) = 303円
    expect(h1).toMatchObject({ key: 'hijun1', possible: true, resultIfHit: 1, noEffect: false, price: 303, diff: 291 });
    expect(h1!.impossibleReason).toBeNull();
    // 比準要素数0（第2表4⑵ → 第6表⑦）= 純資産価額400円
    expect(h0).toMatchObject({ key: 'hijun0', possible: true, resultIfHit: 4, noEffect: false, price: 400, diff: 388 });
  });
});

describe('calcNextYearForecast（繰り上がりによる否定的な断定）', () => {
  it('今期の⑴のゼロが1つなら、来期に比準要素数1の会社となることはない', () => {
    // 利益を400千円にすると自動選択でも350千円（2年平均）でⒸが1になりゼロは Ⓑ だけ
    const f = calcNextYearForecast(mkGetField(withTable4({ e18: '400' })));
    expect(f.zerosNow).toBe(1);
    expect(f.carryOverMet).toBe(false);
    const [h1, h0] = f.scenarios;
    expect(h1!.possible).toBe(false);
    expect(h1!.impossibleReason).toContain('比準要素数1の会社となることはありません');
    // 比準要素数0は⑴だけで決まるため繰り上がりの影響を受けない
    expect(h0!.possible).toBe(true);
  });

  it('今期の利益だけで2年平均が基準を満たすなら、その旨を伝える', () => {
    // 利益400千円 → 2年平均側の必要額は 200×2－400 ＝ 0千円（来期が無利益でも2年平均でⒸは非ゼロ）
    const auto = calcNextYearForecast(mkGetField(withTable4({ e18: '400' })));
    // 自動選択は単年も満たす必要があるので必要額は200千円のまま
    expect(auto.elements[1]).toMatchObject({ key: 'C', required: 200 });
    expect(auto.elements[1]!.requiredNote).toContain('「2年平均」を指定すれば、来期が無利益でもⒸはゼロになりません');
    // 2年平均を明示指定すれば必要額は0千円になり、言い切りの文面へ切り替わる
    const avg = calcNextYearForecast(mkGetField(withTable4({ e18: '400', c1_mode: 'avg' })));
    expect(avg.elements[1]).toMatchObject({ key: 'C', required: 0 });
    expect(avg.elements[1]!.requiredNote).toContain('ゼロになることはありません');
  });

  it('判定要素が未入力なら算定できないことを明示する', () => {
    const f = calcNextYearForecast(mkGetField({ table1_1: base.table1_1, table1_2: base.table1_2 }));
    expect(f.known).toBe(false);
    expect(f.zerosNow).toBeNull();
    expect(f.carryOverMet).toBeNull();
    expect(f.scenarios.every((s) => !s.possible)).toBe(true);
    expect(f.scenarios[0]!.impossibleReason).toContain('算定できません');
  });
});

describe('calcNextYearForecast（医療法人・持分あり）', () => {
  const f = calcNextYearForecast(mkGetField({
    ...withTable4({}),
    table1_1: { ...base.table1_1, medical: '1' },
  }));

  it('配当要素を判定から外し、ゼロ1つで来期の⑵条件が成立する', () => {
    expect(f.medical).toBe(true);
    expect(f.elements[0]).toMatchObject({ key: 'B', excluded: true, current: null, required: null });
    expect(f.elements[0]!.requiredNote).toContain('配当要素を除いた2要素');
    expect(f.zerosNow).toBe(1);            // Ⓒのみ
    expect(f.carryOverMet).toBe(true);
    expect(f.scenarios[0]!.zerosNeeded).toBe(1);
    expect(f.scenarios[1]!.zerosNeeded).toBe(2);
  });
});

describe('calcNextYearForecast（第2表の判定順位）', () => {
  // 株式等が総資産の60% → 既に株式等保有特定会社（判定2）
  const f = calcNextYearForecast(mkGetField({
    ...base,
    table5: { ...base.table5, a_2_1: '株式', a_2_2: '150000', a_2_3: '150000', a_2_4: '株式等' },
  }));

  it('株式等保有特定会社に該当中なら、比準要素数1になっても区分は変わらない', () => {
    expect(f.currentResult).toBe(2);
    expect(f.scenarios[0]).toMatchObject({ resultIfHit: 2, noEffect: true });
  });

  it('比準要素数0は株式等保有特定会社より後の番号なので区分が入れ替わる', () => {
    // 純資産 = (250,000－20,000)×1000÷200,000 = 1,150円
    expect(f.scenarios[1]).toMatchObject({ resultIfHit: 4, noEffect: false, price: 1150 });
  });
});

describe('必要額の境界（第4表を実際に再計算して確認する）', () => {
  it('Ⓑ：来期の配当が必要額40千円なら非ゼロ、1千円下回るとゼロになる', () => {
    // 来期は f28 が来期の配当、f32 が今期の配当（0千円）へ繰り上がる
    expect(calcTable4(mkGetField(withTable4({ f28: '40', f32: '0' }))).b1).toBe(0.1);
    expect(calcTable4(mkGetField(withTable4({ f28: '39', f32: '0' }))).b1).toBe(0);
  });

  it('Ⓒ：単年採用なら必要額200千円で非ゼロ、199千円ではゼロになる', () => {
    expect(calcTable4(mkGetField(withTable4({ c1_mode: 'single', e18: '200' }))).c1).toBe(1);
    expect(calcTable4(mkGetField(withTable4({ c1_mode: 'single', e18: '199' }))).c1).toBe(0);
  });

  it('Ⓓ：資本金等＋利益積立金が必要額200千円で非ゼロ、199千円ではゼロになる', () => {
    // ①（資本金等の額）は⑤の分母でもあるため、必要額は利益積立金額の側で作る
    expect(calcTable4(mkGetField(withTable4({ n53: '-9800' }))).d1).toBe(1);
    expect(calcTable4(mkGetField(withTable4({ n53: '-9801' }))).d1).toBe(0);
  });
});
