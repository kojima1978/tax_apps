import { describe, expect, it } from 'vitest';
import {
  computeAll, detailGroupCount, detailShareCount, detailSlots, num, type Values,
} from './calc';
import { table15Key } from '../forms/table15';

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

describe('computeAll 第5表G02・G03の法定相続分', () => {
  it('第1表の配偶者に紐づく第2表⑤から分子・分母を自動転記する', () => {
    const result = computeAll(
      { t5num: '9', t5den: '9' },
      [{ name: '配偶者', relation: '01', v1: '100000000' }],
      [{ source: '0', num: '1', den: '2' }],
      ['table5'],
    );

    expect(result.totals.t5num).toBe('1');
    expect(result.totals.t5den).toBe('2');
    expect(result.totals.t5s1mul).toBe('50000000');
  });

  it('第5表が印刷対象外でも表示用の分子・分母を計算する', () => {
    const result = computeAll(
      {},
      [{ name: '配偶者', relation: '01', v1: '100000000' }],
      [{ source: '0', num: '1', den: '2' }],
    );

    expect(result.totals.t5num).toBe('1');
    expect(result.totals.t5den).toBe('2');
    expect(result.heirs[0]?.v13).toBe('');
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

describe('computeAll 第1表G32の年齢', () => {
  const start = { startEra: '5', startY: '7', startM: '8', startD: '15' };

  it('相続開始日当日の満年齢を計算する', () => {
    const beforeBirthday = computeAll(start, [
      { birthEra: '4', birthY: '17', birthM: '8', birthD: '16' },
    ], []);
    const onBirthday = computeAll(start, [
      { birthEra: '4', birthY: '17', birthM: '8', birthD: '15' },
    ], []);

    expect(beforeBirthday.heirs[0]?.age).toBe('19');
    expect(onBirthday.heirs[0]?.age).toBe('20');
  });

  it('日付が不足している場合は空欄にする', () => {
    const result = computeAll(start, [{ birthEra: '4', birthY: '17' }], []);
    expect(result.heirs[0]?.age).toBe('');
  });
});

describe('computeAll 第6表①の年齢転記', () => {
  it('選択した未成年者の第1表年齢を転記して控除額を計算する', () => {
    const result = computeAll(
      { startEra: '5', startY: '7', startM: '8', startD: '15', t6m0no: '2' },
      [
        { birthEra: '4', birthY: '10', birthM: '1', birthD: '1' },
        { birthEra: '5', birthY: '1', birthM: '8', birthD: '16' },
      ],
      [],
    );

    expect(result.totals.t6m0age).toBe('5');
    expect(result.totals.t6m0v2).toBe('130');
  });
});

describe('付表の組への割り付け', () => {
  it('取得者が3人までなら1組＋次の1組（4人目を書く場所）を使う', () => {
    const item: Values = { kindCode: '13', who0: '1', who1: '2', who2: '3' };
    expect(detailShareCount(item)).toBe(3);
    expect(detailGroupCount(item)).toBe(2);
  });

  it('取得者が4人なら2組目に続きを書く', () => {
    const item: Values = { who0: '1', who1: '2', who2: '3', who3: '4' };
    expect(detailShareCount(item)).toBe(4);
    expect(detailGroupCount(item)).toBe(2);
  });

  it('財産の並び順に組を並べ、用紙の余りは空の財産で埋める', () => {
    const items: Values[] = [{ who0: '1', who1: '2', who2: '3', who3: '4' }, { who0: '1' }];
    expect(detailSlots(items, 5)).toEqual([
      { item: 0, base: 0 }, { item: 0, base: 3 },
      { item: 1, base: 0 },
      { item: 2, base: 0 }, { item: 3, base: 0 },
    ]);
  });
});

describe('computeAll 1つの財産を4人で共有した場合', () => {
  const details: Record<string, Values[]> = {
    table11f1: [{
      kindCode: '13', value: '40000000',
      who0: '1', amount0: '10000000',
      who1: '2', amount1: '10000000',
      who2: '3', amount2: '10000000',
      // 4人目は様式の次の組に続けて書く（記載例59ページのQ&A）
      who3: '4', amount3: '10000000',
    }],
  };
  const heirs: Values[] = Array.from({ length: 4 }, (_, i) => ({ name: `相続人${i + 1}` }));

  it('第11表2①に4人目の取得額を含める', () => {
    const result = computeAll({}, heirs, [], ['table11f1'], details);
    expect(result.heirs.map((heir) => heir.t11v1)).toEqual(Array(4).fill('10000000'));
  });

  it('第15表③も4人目まで第11表2①と一致する', () => {
    const result = computeAll({}, heirs, [], ['table11f1'], details);
    const key = table15Key(3);
    expect(result.heirs.map((heir) => heir[key])).toEqual(result.heirs.map((heir) => heir.t11v1));
  });

  it('取得者が全員そろっていれば未分割財産にしない', () => {
    const result = computeAll({}, heirs, [], ['table11f1'], details);
    expect(result.heirs.map((heir) => heir.t11v2)).toEqual(Array(4).fill(''));
  });
});

describe('computeAll 第6表⑥の配分エラー', () => {
  const common = {
    startEra: '5', startY: '7', startM: '8', startD: '15',
    t6m0no: '1', t6mf0no: '2',
  };
  const heirs: Values[] = [
    { name: '未成年者', birthEra: '5', birthY: '1', birthM: '8', birthD: '16' },
    { name: '扶養義務者', v1: '200000000' },
  ];
  const lawful: Values[] = [
    { source: '0', num: '1', den: '2' },
    { source: '1', num: '1', den: '2' },
  ];

  it('⑤＞⑥かつⒶ＞⑥の計ならエラーにする', () => {
    const result = computeAll(common, heirs, lawful);
    expect(result.totals.t6mf0v6Error).toBe('1');
  });

  it('⑥の計がⒶ以上ならエラーを解除する', () => {
    const result = computeAll({ ...common, t6mf0v6: '1300000' }, heirs, lawful);
    expect(result.totals.t6mf0v6Error).toBe('');
  });

  it('障害者控除の⑥にも同じ条件を適用する', () => {
    const result = computeAll(
      {
        startEra: '5', startY: '7', startM: '8', startD: '15',
        t6d0no: '1', t6df0no: '2',
      },
      [
        { name: '障害者', birthEra: '3', birthY: '60', birthM: '8', birthD: '16' },
        { name: '扶養義務者', v1: '200000000' },
      ],
      lawful,
    );

    expect(result.totals.t6df0v6Error).toBe('1');
  });
});
