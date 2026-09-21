import { describe, expect, it } from 'vitest';
import {
  DETAIL_VALUE_MANUAL,
  computeAll, detailAutoValue, detailGroupCount, detailShareAmounts, detailShareCount, detailSlots,
  detailUnit, detailValue, hasTable112, moveDetailShare, moved, num, rateTax, remapTable14Confirm,
  sameValues, table10MinPages, table10Pages, table112Pages, table11f1Calc, table13MinPages,
  table13Pages, table14MinPages, table14Pages, table42Pages, table4Pages, table88Pages,
  table9MinPages, table9Pages,
  type Values,
} from './calc';
import { TABLE10_DETAIL_FORM, TABLE10_ROWS } from '../forms/table10';
import {
  TABLE13_DEBT_FORM, TABLE13_DEBT_ROWS, TABLE13_FUNERAL_FORM, TABLE13_FUNERAL_ROWS, TABLE13_PERSONS,
} from '../forms/table13';
import {
  TABLE14_BEQUEST_FORM, TABLE14_BEQUEST_ROWS, TABLE14_DONATION_FORM, TABLE14_DONATION_ROWS,
  TABLE14_GIFT_FORM, TABLE14_GIFT_ROWS,
} from '../forms/table14';
import { TABLE15_KEY_BY_MARK, table15Key } from '../forms/table15';
import { RATE_BRACKETS } from '../forms/table2';
import { TABLE9_DETAIL_FORM, TABLE9_ROWS } from '../forms/table9';

/** 法定相続人の印と法定相続分（1/3ずつ）。第2表④はこの印が付いた人だけが並ぶ */
const third: Values = { isLawful: '1', lawNum: '1', lawDen: '3' };

describe('computeAll ⑧あん分割合の端数調整', () => {
  it('合計を1.00にし、税額控除で増分を吸収できる人へ0.01を配分する', () => {
    const heirs: Values[] = [
      { ...third, name: '甲', v1: '40000000', v12: '4000000' },
      { ...third, name: '乙', v1: '40000000' },
      { ...third, name: '丙', v1: '40000000' },
    ];

    const result = computeAll({}, heirs);
    const ratios = result.heirs.map((heir) => heir.v8);

    expect(ratios).toEqual(['0.34', '0.33', '0.33']);
    expect(ratios.reduce((sum, ratio) => sum + num(ratio), 0)).toBeCloseTo(1, 10);
  });

  it('保存済みの手入力割合を採用せず、全員分を再計算する', () => {
    const heirs: Values[] = [
      { ...third, name: '甲', v1: '40000000', v8: '0.99', v8m: '1' },
      { ...third, name: '乙', v1: '40000000', v8: '0.01', v8m: '1' },
      { ...third, name: '丙', v1: '40000000' },
    ];

    const result = computeAll({}, heirs);

    expect(result.heirs.map((heir) => heir.v8)).toEqual(['0.34', '0.33', '0.33']);
  });

  it('元の端数の大きさよりも税額の最小化を優先する', () => {
    const heirs: Values[] = [
      { ...third, name: '甲', v1: '50000000' },       // 正確な割合 0.4166…
      { ...third, name: '乙', v1: '40000000', v12: '4000000' }, // 0.3333…・控除で税額増分を吸収
      { ...third, name: '丙', v1: '30000000' },       // 0.25
    ];

    const result = computeAll({}, heirs);

    // 最大剰余法なら甲が0.42になるが、税額が少ない乙へ0.01を配る。
    expect(result.heirs.map((heir) => heir.v8)).toEqual(['0.41', '0.34', '0.25']);
  });
});

describe('computeAll 第3表の未対応欄', () => {
  it('保存済みの㋭を計算に使用しない', () => {
    const result = computeAll(
      { k2: '999999' },
      [{ name: '甲', v1: '120000000', isLawful: '1', lawNum: '1', lawDen: '1' }],
    );

    expect(result.totals.k2).toBe('');
    expect(result.totals.k6).toBe('');
    expect(result.totals.t11).toBe('');
  });
});

describe('computeAll 第2表⑤の法定相続分合計', () => {
  it('分数の合計が正確に1なら注記を表示しない', () => {
    const result = computeAll({}, [
      { name: '甲', isLawful: '1', lawNum: '1', lawDen: '3' },
      { name: '乙', isLawful: '1', lawNum: '2', lawDen: '3' },
    ]);

    expect(result.totals.lawShareInvalid).toBe('');
    expect(result.totals.lawShareTotalDisplay).toBe('1');
  });

  it('分数の合計が1でなければ合計欄の注記を生成する', () => {
    const result = computeAll({}, [
      { name: '甲', isLawful: '1', lawNum: '1', lawDen: '3' },
      { name: '乙', isLawful: '1', lawNum: '1', lawDen: '3' },
    ]);

    expect(result.totals.lawShareInvalid).toBe('1');
    expect(result.totals.lawShareTotalDisplay).toBe('1\n※合計が1ではありません');
  });
});

describe('computeAll 第2表㋺の法定相続人の数（養子の数の制限）', () => {
  const lawful = (relation: string, extra: Values = {}): Values => (
    { name: relation, relation, isLawful: '1', ...extra }
  );

  it('実子がいるときは養子1人までしか数えない', () => {
    const result = computeAll({}, [lawful('01'), lawful('11'), lawful('90'), lawful('90')]);

    // 配偶者・実子・養子1人の3人 → 3,000万円＋600万円×3
    expect(result.totals.heirCount).toBe('3');
    expect(result.totals.k4).toBe('4800');
    expect(result.lawful).toHaveLength(3);
  });

  it('実子がいないときは養子2人まで数える', () => {
    const result = computeAll({}, [lawful('01'), lawful('90'), lawful('90'), lawful('90')]);

    expect(result.totals.heirCount).toBe('3');
    expect(result.totals.k4).toBe('4800');
  });

  it('実子とみなされる養子は制限を受けない', () => {
    const result = computeAll({}, [lawful('01'), lawful('11'), lawful('90', { realChild: '1' })]);

    expect(result.totals.heirCount).toBe('3');
    expect(result.totals.k4).toBe('4800');
  });
});

describe('computeAll 第5表G02・G03の法定相続分', () => {
  it('第1表の配偶者に紐づく第2表⑤から分子・分母を自動転記する', () => {
    const result = computeAll(
      { t5num: '9', t5den: '9' },
      [{ name: '配偶者', relation: '01', v1: '100000000', isLawful: '1', lawNum: '1', lawDen: '2' }],
      ['table5'],
    );

    expect(result.totals.t5num).toBe('1');
    expect(result.totals.t5den).toBe('2');
    expect(result.totals.t5s1mul).toBe('50000000');
  });

  it('第5表が印刷対象外でも表示用の分子・分母を計算する', () => {
    const result = computeAll(
      {},
      [{ name: '配偶者', relation: '01', v1: '100000000', isLawful: '1', lawNum: '1', lawDen: '2' }],
    );

    expect(result.totals.t5num).toBe('1');
    expect(result.totals.t5den).toBe('2');
    expect(result.heirs[0]?.v13).toBe('');
  });
});

describe('computeAll 第4表の2の年分', () => {
  it('相続開始年から前年・前々年・前々々年を2桁で自動入力する', () => {
    const result = computeAll({ startEra: '5', startY: '7' }, [], ['table42']);

    expect(result.totals.t42y0b0Era).toBe('5');
    expect(result.totals.t42y0b0Y).toBe('06');
    expect(result.totals.t42y0b1Y).toBe('05');
    expect(result.totals.t42y0b2Y).toBe('04');
  });

  it('元号の境界をまたぐ前年を正しく変換する', () => {
    const result = computeAll({ startEra: '5', startY: '1' }, [], ['table42']);

    expect(result.totals.t42y0b0Era).toBe('4');
    expect(result.totals.t42y0b0Y).toBe('30');
  });
});

describe('computeAll 第1表G32の年齢', () => {
  const start = { startEra: '5', startY: '7', startM: '8', startD: '15' };

  it('相続開始日当日の満年齢を計算する', () => {
    const beforeBirthday = computeAll(start, [
      { birthEra: '4', birthY: '17', birthM: '8', birthD: '16' },
    ]);
    const onBirthday = computeAll(start, [
      { birthEra: '4', birthY: '17', birthM: '8', birthD: '15' },
    ]);

    expect(beforeBirthday.heirs[0]?.age).toBe('19');
    expect(onBirthday.heirs[0]?.age).toBe('20');
  });

  it('日付が不足している場合は空欄にする', () => {
    const result = computeAll(start, [{ birthEra: '4', birthY: '17' }]);
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

describe('付表1の単価（円）又は倍数', () => {
  it('路線価方式は 路線価×調整 を円未満切り捨てで出す', () => {
    expect(detailUnit({ routePrice: '150000', adjust: '0.98' })).toBe('147000');
    expect(detailUnit({ routePrice: '100', adjust: '0.333' })).toBe('33');
  });

  it('倍率方式は 倍数×調整 を小数のまま出す', () => {
    expect(detailUnit({ method: 'ratio', multiple: '1.1', adjust: '0.98' })).toBe('1.078');
    expect(detailUnit({ method: 'ratio', multiple: '1.1' })).toBe('1.1');
  });

  it('調整が空なら掛けない', () => {
    expect(detailUnit({ routePrice: '150000' })).toBe('150000');
  });

  it('選んだ方式の欄が空なら出さない（もう一方の欄が埋まっていても）', () => {
    expect(detailUnit({ multiple: '1.1' })).toBeUndefined();
    expect(detailUnit({ method: 'ratio', routePrice: '150000' })).toBeUndefined();
  });
});

describe('付表1の補助資料（単価の計算根拠）', () => {
  it('路線価方式は切り捨てを明示し、数はカンマ付きで並べる', () => {
    const calc = table11f1Calc({ area: '1,234.56', routePrice: '150,000', adjust: '0.987', shareN: '1', shareD: '2' });
    expect(calc.methodLabel).toBe('路線価方式');
    expect(calc.unit).toBe('148050');
    expect(calc.formula).toBe(
      '単価 150,000 × 0.987（円未満切捨て） ＝ 148,050'
      + ' ／ 価額 1,234.56 × 148,050 × 1／2 ＝ 91,388,304',
    );
  });

  it('倍率方式は倍数を小数のまま出す', () => {
    const calc = table11f1Calc({ method: 'ratio', fixedValue: '3,000,000', multiple: '1.1', adjust: '0.98' });
    expect(calc.baseName).toBe('固定資産税評価額（円）');
    expect(calc.unit).toBe('1.078');
    expect(calc.formula).toBe('単価 1.1 × 0.98 ＝ 1.078 ／ 価額 3,000,000 × 1.078 ＝ 3,234,000');
  });

  it('欄が埋まっていないところは ? と — で出す（何が足りないか分かるように）', () => {
    expect(table11f1Calc({}).formula).toBe('単価 ? ＝ — ／ 価額 ? × ? ＝ —');
  });
});

describe('付表の価額の自動計算', () => {
  it('付表1は路線価方式（面積×単価×持分割合）で計算する', () => {
    expect(detailAutoValue('table11f1', {
      area: '100.00', routePrice: '150000', shareN: '1', shareD: '2',
    })).toBe('7500000');
  });

  it('付表1で倍率方式を選ぶと固定資産税評価額×倍数×持分割合で計算する', () => {
    expect(detailAutoValue('table11f1', {
      method: 'ratio', fixedValue: '3000000', multiple: '1.1', shareN: '1', shareD: '3',
    })).toBe('1100000');
  });

  it('価額は用紙に出る単価から計算する（調整は単価の側で切り捨てる）', () => {
    expect(detailAutoValue('table11f1', {
      area: '100.00', routePrice: '150000', adjust: '0.98',
    })).toBe('14700000');
    // 単価は切り捨てて 33 円。100㎡なら 3300 円（3333 円にはならない）
    expect(detailAutoValue('table11f1', {
      area: '100.00', routePrice: '100', adjust: '0.333',
    })).toBe('3300');
  });

  it('評価方式は入力から推測しない（固定資産税評価額を控えても路線価方式のまま）', () => {
    const item = { area: '100.00', fixedValue: '3000000', routePrice: '150000', multiple: '1.1', shareN: '1', shareD: '2' };
    expect(detailAutoValue('table11f1', item)).toBe('7500000');
    expect(detailAutoValue('table11f1', { ...item, method: 'ratio' })).toBe('1650000');
  });

  it('選んだ方式の元になる欄が空なら自動計算しない', () => {
    expect(detailAutoValue('table11f1', { method: 'ratio', area: '100.00', multiple: '1.1' })).toBeUndefined();
  });

  it('持分割合が空なら全部（持分の指定なし）として計算する', () => {
    expect(detailAutoValue('table11f1', { area: '100.00', routePrice: '150000' })).toBe('15000000');
  });

  it('円未満は切り捨てる', () => {
    expect(detailAutoValue('table11f1', {
      area: '1.00', routePrice: '100', shareN: '1', shareD: '3',
    })).toBe('33');
  });

  it('元になる欄が欠けていれば自動計算しない（手入力のまま）', () => {
    expect(detailAutoValue('table11f1', { area: '100.00' })).toBeUndefined();
    expect(detailAutoValue('table11f3', { quantity: '10' })).toBeUndefined();
  });

  it('付表2〜4は数量×単価。付表4は倍数が入っていれば掛ける', () => {
    expect(detailAutoValue('table11f3', { quantity: '10', unitPrice: '1500' })).toBe('15000');
    expect(detailAutoValue('table11f4', { quantity: '2', unitPrice: '30000', multiple: '1.5' })).toBe('90000');
  });

  it('付表2の為替は入っていれば掛け、空欄なら邦貨建てとして掛けない', () => {
    expect(detailAutoValue('table11f2', { quantity: '10', unitPrice: '100', fx: '150' })).toBe('150000');
    expect(detailAutoValue('table11f2', { quantity: '10', unitPrice: '100' })).toBe('1000');
  });

  it('直接入力を選んだ明細は、元の欄がそろっていても自動計算しない', () => {
    const item = { quantity: '10', unitPrice: '100', fx: '150', value: '999' };
    expect(detailAutoValue('table11f2', item)).toBe('150000');
    expect(detailAutoValue('table11f2', { ...item, [DETAIL_VALUE_MANUAL]: '1' })).toBeUndefined();
    // 数量・単価・為替は直接入力にしても残る（用紙に印字するため）
    expect(detailValue('table11f2', { ...item, [DETAIL_VALUE_MANUAL]: '1' })).toBe('999');
  });

  it('自動計算した価額を第11表2①・第15表の集計に使う', () => {
    const result = computeAll({}, [{ name: '甲' }], ['table11f1'], {
      table11f1: [{
        kindCode: '13', area: '100.00', routePrice: '150000', shareN: '1', shareD: '2',
        who0: '1', amount0: '7500000',
      }],
    });

    expect(result.heirs[0]?.t11v1).toBe('7500000');
    expect(result.heirs[0]?.[table15Key(3)]).toBe('7500000');
  });

  it('未分割の財産の按分にも自動計算した価額を使う', () => {
    const result = computeAll(
      {},
      [
        { name: '甲', isLawful: '1', lawNum: '1', lawDen: '2' },
        { name: '乙', isLawful: '1', lawNum: '1', lawDen: '2' },
      ],
      ['table11f1'],
      { table11f1: [{ kindCode: '13', area: '100.00', routePrice: '150000' }] },
    );

    expect(result.heirs.map((heir) => heir.t11v2)).toEqual(['7500000', '7500000']);
  });
});

describe('computeAll 未分割財産の按分は民法上の相続分による（相法55条）', () => {
  const heirs: Values[] = [
    { name: '甲', relation: '01', isLawful: '1' },
    { name: '乙', relation: '11', isLawful: '1' },
    { name: '丙', relation: '12', isLawful: '1', renounced: '1' },
  ];
  const details = { table11f1: [{ kindCode: '13', value: '12000000' }] };

  it('放棄した人を除いて分け直す（税法上の1/2・1/4・1/4では分けない）', () => {
    const result = computeAll({}, heirs, ['table11f1'], details);
    expect(result.heirs.map((heir) => heir.t11v2)).toEqual(['6000000', '6000000', '']);
  });

  it('第2表④の法定相続分は放棄がなかったものとしたまま', () => {
    const result = computeAll({}, heirs, ['table11f1'], details);
    expect(result.lawful.map((row) => `${row.num}/${row.den}`)).toEqual(['1/2', '1/4', '1/4']);
  });
});

describe('取得者ごとの割合からの按分', () => {
  // 3で割り切れない価額（100.00 × 150,001 ＝ 15,000,100円）にして端数の寄せ方まで見る
  const land = {
    kindCode: '13', area: '100.00', routePrice: '150001',
    who0: '1', who1: '2', who2: '3',
  };

  it('割合（分数）で按分し、端数は先頭の人へ寄せて合計を価額に一致させる', () => {
    const amounts = detailShareAmounts('table11f1', {
      ...land,
      ratioN0: '1', ratioD0: '3', ratioN1: '1', ratioD1: '3', ratioN2: '1', ratioD2: '3',
    });

    expect(amounts).toEqual(['5000034', '5000033', '5000033']);
    expect(amounts.reduce((sum, a) => sum + num(a ?? ''), 0)).toBe(15000100);
  });

  it('割合の合計が1でなくても、その比で分ける', () => {
    expect(detailShareAmounts('table11f1', {
      ...land, ratioN0: '1', ratioD0: '4', ratioN1: '1', ratioD1: '4',
    })).toEqual(['7500050', '7500050', undefined]);
  });

  it('割合を入れていない取得者は手入力のまま', () => {
    expect(detailShareAmounts('table11f1', land)).toEqual([undefined, undefined, undefined]);
  });

  it('手入力した価額でも按分できる（自動計算できない様式）', () => {
    expect(detailShareAmounts('table11f2', {
      value: '1000000', fx: '150', who0: '1', who1: '2',
      ratioN0: '1', ratioD0: '2', ratioN1: '1', ratioD1: '2',
    })).toEqual(['500000', '500000']);
  });

  it('按分した価額を第11表2①・第15表の集計に使う', () => {
    const result = computeAll({}, [{ name: '甲' }, { name: '乙' }, { name: '丙' }], ['table11f1'], {
      table11f1: [{
        ...land, ratioN0: '1', ratioD0: '3', ratioN1: '1', ratioD1: '3', ratioN2: '1', ratioD2: '3',
      }],
    });

    expect(result.heirs.map((heir) => heir.t11v1)).toEqual(['5000034', '5000033', '5000033']);
    expect(result.heirs.map((heir) => heir[table15Key(3)])).toEqual(['5000034', '5000033', '5000033']);
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
    const result = computeAll({}, heirs, ['table11f1'], details);
    expect(result.heirs.map((heir) => heir.t11v1)).toEqual(Array(4).fill('10000000'));
  });

  it('第15表③も4人目まで第11表2①と一致する', () => {
    const result = computeAll({}, heirs, ['table11f1'], details);
    const key = table15Key(3);
    expect(result.heirs.map((heir) => heir[key])).toEqual(result.heirs.map((heir) => heir.t11v1));
  });

  it('取得者が全員そろっていれば未分割財産にしない', () => {
    const result = computeAll({}, heirs, ['table11f1'], details);
    expect(result.heirs.map((heir) => heir.t11v2)).toEqual(Array(4).fill(''));
  });
});

describe('computeAll 第6表⑥の配分エラー', () => {
  const common = {
    startEra: '5', startY: '7', startM: '8', startD: '15',
    t6m0no: '1', t6mf0no: '2',
  };
  const half: Values = { isLawful: '1', lawNum: '1', lawDen: '2' };
  const heirs: Values[] = [
    { ...half, name: '未成年者', birthEra: '5', birthY: '1', birthM: '8', birthD: '16' },
    { ...half, name: '扶養義務者', v1: '200000000' },
  ];
  it('⑤＞⑥かつⒶ＞⑥の計ならエラーにする', () => {
    const result = computeAll(common, heirs);
    expect(result.totals.t6mf0v6Error).toBe('1');
  });

  it('⑥の計がⒶ以上ならエラーを解除する', () => {
    const result = computeAll({ ...common, t6mf0v6: '1300000' }, heirs);
    expect(result.totals.t6mf0v6Error).toBe('');
  });

  it('障害者控除の⑥にも同じ条件を適用する', () => {
    const result = computeAll(
      {
        startEra: '5', startY: '7', startM: '8', startD: '15',
        t6d0no: '1', t6df0no: '2',
      },
      [
        { ...half, name: '障害者', birthEra: '3', birthY: '60', birthM: '8', birthD: '16' },
        { ...half, name: '扶養義務者', v1: '200000000' },
      ],
    );

    expect(result.totals.t6df0v6Error).toBe('1');
  });
});

describe('並べ替え', () => {
  it('moved は元の配列を変えずに1件だけ動かす', () => {
    const items = ['a', 'b', 'c', 'd'];
    expect(moved(items, 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(moved(items, 3, 1)).toEqual(['a', 'd', 'b', 'c']);
    expect(items).toEqual(['a', 'b', 'c', 'd']);
  });

  it('moved は範囲外・同じ位置なら並びを変えない', () => {
    const items = ['a', 'b', 'c'];
    expect(moved(items, 1, 1)).toEqual(items);
    expect(moved(items, -1, 0)).toEqual(items);
    expect(moved(items, 0, 3)).toEqual(items);
  });

  it('取得者は who・割合・価額の4欄をまとめて動かし、添字を振り直す', () => {
    const item: Values = {
      kind: '宅地',
      who0: '1', ratioN0: '1', ratioD0: '2', amount0: '100',
      who1: '2', ratioN1: '1', ratioD1: '4', amount1: '50',
      who2: '3', ratioN2: '1', ratioD2: '4', amount2: '50',
    };

    expect(moveDetailShare(item, 2, 0)).toEqual({
      kind: '宅地',
      who0: '3', ratioN0: '1', ratioD0: '4', amount0: '50',
      who1: '1', ratioN1: '1', ratioD1: '2', amount1: '100',
      who2: '2', ratioN2: '1', ratioD2: '4', amount2: '50',
    });
  });

  it('取得者の並べ替えは範囲外なら何もしない（末尾の空き行は対象外）', () => {
    const item: Values = { who0: '1', who1: '2' };
    expect(moveDetailShare(item, 1, 2)).toBe(item);
    expect(moveDetailShare(item, 0, 0)).toBe(item);
  });
});

describe('入力内容の比較', () => {
  it('欄の並び順が違っても同じ内容なら同じとみなす', () => {
    expect(sameValues({ name: '甲', rel: '長男' }, { rel: '長男', name: '甲' })).toBe(true);
  });

  it('空文字と欄そのものが無い状態は同じとみなす（打って消した後）', () => {
    expect(sameValues({ name: '甲', tel_1: '' }, { name: '甲' })).toBe(true);
  });

  it('値が1つでも違えば違うとみなす', () => {
    expect(sameValues({ name: '甲' }, { name: '乙' })).toBe(false);
    expect(sameValues({ name: '甲' }, { name: '甲', rel: '長男' })).toBe(false);
  });
});

describe('computeAll 第13表1・2の集計', () => {
  const heirs: Values[] = [{ name: '甲' }, { name: '乙' }];
  /** 負担する人は `resolveHeirRefs` を通った後の「何人目か」 */
  const debt: Values[] = [
    { kind: '借入金', amt: '3000000', who: '1', share: '3000000' },
    { kind: '未払金', amt: '1000000', who: '2', share: '1000000' },
  ];
  const details = { table13debt: debt, table13funeral: [{ name: '寺', amt: '500000', who: '1', share: '500000' }] };

  it('負担する人ごとに3①④へ、金額の列は1・2の合計欄へ', () => {
    const result = computeAll({}, heirs, ['table13'], details);

    expect(result.heirs.map((heir) => heir.t13v1)).toEqual(['3000000', '1000000']);
    expect(result.heirs.map((heir) => heir.t13v4)).toEqual(['500000', '']);
    expect(result.totals.t13dTotal).toBe('4000000');
    expect(result.totals.t13fTotal).toBe('500000');
  });

  it('明細を並べ替えても結果は変わらない（値は行そのものが持つ）', () => {
    const swapped = { ...details, table13debt: [debt[1]!, debt[0]!] };

    expect(computeAll({}, heirs, ['table13'], swapped).heirs.map((heir) => heir.t13v1))
      .toEqual(['3000000', '1000000']);
  });
});

describe('computeAll 第9表2（課税される金額の計算）', () => {
  /** 法定相続人2人 ⇒ Ⓐ＝1,000万円。受取人は `resolveHeirRefs` を通った後の「何人目か」 */
  const heirs: Values[] = [{ ...third, name: '甲' }, { ...third, name: '乙' }];
  const rows: Values[] = [
    { name: 'A生命', amt: '9000000', who: '1' },
    { name: 'B生命', amt: '3000000', who: '2' },
  ];

  it('1の明細を受取人ごとに合計してⒷ・②③を出す', () => {
    const result = computeAll({}, heirs, ['table9'], { table9detail: rows });

    expect(result.totals.t9A).toBe('10');
    expect(result.totals.t9B).toBe('12000000');
    // Ⓑ＞Ⓐ なので②はⒶの按分（1円未満切捨て）
    expect([result.totals.t9r0v2, result.totals.t9r1v2]).toEqual(['7500000', '2500000']);
    expect([result.totals.t9r0v3, result.totals.t9r1v3]).toEqual(['1500000', '500000']);
    expect(result.totals.t9v3Total).toBe('2000000');
  });

  it('明細を並べ替えても結果は変わらない（値は行そのものが持つ）', () => {
    const swapped = { table9detail: [rows[1]!, rows[0]!] };

    expect(computeAll({}, heirs, ['table9'], swapped).totals.t9r0v2).toBe('7500000');
  });

  it('相続人以外が受け取った分は2に載せない（非課税の対象外）', () => {
    const others: Values[] = [{ ...third, name: '甲' }, { name: '丙' }];
    const result = computeAll({}, others, ['table9'], { table9detail: rows });

    expect(result.totals.t9B).toBe('9000000');
    expect(result.totals.t9r1No).toBe('');
  });
});

describe('computeAll 第9表・第10表 → 第11表の付表4 の転記', () => {
  /** 法定相続人2人 ⇒ Ⓐ＝1,000万円 */
  const heirs: Values[] = [{ ...third, name: '甲' }, { ...third, name: '乙' }];
  const used = ['table9', 'table10', 'table11', 'table11f4'];

  it('明細1行が1件になり、価額は非課税を引いた後の額（③）になる', () => {
    const details = {
      table9detail: [
        { addr: '東京都千代田区', name: 'A生命', amt: '9000000', who: '1' },
        { addr: '大阪市北区', name: 'B生命', amt: '3000000', who: '2' },
      ],
    };
    const result = computeAll({}, heirs, used, details);
    const items = result.derived.table11f4 ?? [];

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      sourceForm: 'table9', kindCode: '71', kind: '生命保険金等',
      assetName: 'A生命', place: '東京都千代田区', value: '1500000', who0: '1', amount0: '1500000',
    });
    expect(items[1]?.value).toBe('500000');
    // 第11表2①と第15表㉕へも同じ額が入る
    expect(result.heirs[0]?.t11v1).toBe('1500000');
    expect(result.heirs[1]?.t11v1).toBe('500000');
    expect(result.heirs[0]?.[TABLE15_KEY_BY_MARK['㉕']!]).toBe('1500000');
  });

  it('相続人以外が受け取った分は受取金額をそのまま転記する', () => {
    const others: Values[] = [{ ...third, name: '甲' }, { name: '丙' }];
    const details = {
      table9detail: [
        { name: 'A生命', amt: '9000000', who: '1' },
        { name: 'B生命', amt: '3000000', who: '2' },
      ],
    };
    const items = computeAll({}, others, used, details).derived.table11f4 ?? [];

    // 甲は非課税限度額（1人なので500万円）を引いた残り、丙は全額
    expect(items.map((item) => item.value)).toEqual(['4000000', '3000000']);
  });

  it('同じ人が複数行のときは受取金額の比で割り振り、端数は先頭の行へ寄せる', () => {
    const details = {
      table9detail: [
        { name: 'A生命', amt: '5000000', who: '1' },
        { name: 'B生命', amt: '5000000', who: '1' },
        { name: 'C生命', amt: '5000001', who: '2' },
      ],
    };
    const result = computeAll({}, heirs, used, details);
    const items = result.derived.table11f4 ?? [];
    const total = items.reduce((sum, item) => sum + Number(item.value), 0);

    // 転記した価額の合計は第9表2③の合計と一致する
    expect(total).toBe(Number(result.totals.t9v3Total));
    // 同じ人の2行は受取金額が同じなので同額に割れる
    expect(items[0]?.value).toBe(items[1]?.value);
  });

  it('第10表は退職手当金等（コード74）として転記する', () => {
    // Ⓐ＝1,000万円を超える分だけが課税される
    const details = { table10detail: [{ name: '株式会社甲', amt: '19000000', who: '1' }] };
    const result = computeAll({}, heirs, used, details);
    const items = result.derived.table11f4 ?? [];

    expect(items[0]).toMatchObject({ sourceForm: 'table10', kindCode: '74', kind: '退職手当金等', value: '9000000' });
    expect(result.heirs[0]?.[TABLE15_KEY_BY_MARK['㉖']!]).toBe('9000000');
  });

  it('全額が非課税になる行は転記しない（課税価格に入らない）', () => {
    const details = { table9detail: [{ name: 'A生命', amt: '3000000', who: '1' }] };

    expect(computeAll({}, heirs, used, details).derived.table11f4).toBeUndefined();
  });
});

describe('computeAll 第14表（暦年課税分の贈与財産・遺贈・寄附）', () => {
  const heirs: Values[] = [{ ...third, name: '甲' }, { ...third, name: '乙' }];
  /** 1の明細（①価額・②特定贈与財産・贈与を受けた人）。受取人は「何人目か」 */
  const gift: Values[] = [
    { kind: '土地', amt: '5000000', v2: '2000000', who: '1' },
    { kind: '現金', amt: '1000000', who: '2' },
    { kind: '株式', amt: '3000000', who: '1' },
  ];
  /** ④は氏名を選んだ枠にだけ合計を出す（同じ人が何行も持てるので明細からは枠が決まらない） */
  const common: Values = { t14p0Who: '1', t14p1Who: '2' };

  it('③＝①−②を行ごとに出し、④で贈与を受けた人ごとに合計する', () => {
    const result = computeAll(common, heirs, ['table14'], { table14gift: gift });

    expect([result.totals.t14g0v3, result.totals.t14g1v3, result.totals.t14g2v3])
      .toEqual(['3000000', '1000000', '3000000']);
    expect([result.totals.t14p0v4, result.totals.t14p1v4]).toEqual(['6000000', '1000000']);
    expect(result.totals.t14v4Total).toBe('7000000');
    // ④は第1表⑤・第15表㊲へ転記する
    expect(result.heirs[0]!.v5).toBe('6000000');
  });

  it('明細を並べ替えても各人の④は変わらない（値は行そのものが持つ）', () => {
    const swapped = { table14gift: [gift[2]!, gift[0]!, gift[1]!] };
    const result = computeAll(common, heirs, ['table14'], swapped);

    expect([result.totals.t14p0v4, result.totals.t14p1v4]).toEqual(['6000000', '1000000']);
  });

  it('2と3の合計は明細の価額の通算', () => {
    const result = computeAll(common, heirs, ['table14'], {
      table14bequest: [{ amt: '400000' }, { amt: '600000' }],
      table14donation: [{ amt: '250000' }],
    });

    expect(result.totals.t14bTotal).toBe('1000000');
    expect(result.totals.t14dTotal).toBe('250000');
  });
});

describe('remapTable14Confirm（受贈財産の番号の振り直し）', () => {
  /** 1件だけを `from` から `to` へ動かしたときの、並べ替え前 → 後の添字 */
  const move = (from: number, to: number) => (i: number): number => {
    if (i === from) return to;
    if (from < i && i <= to) return i - 1;
    if (to <= i && i < from) return i + 1;
    return i;
  };

  it('同じ用紙の中で動いたら番号だけを直す', () => {
    const common: Values = { t14c0Spouse: '甲', t14c0No: '3' };

    // 3行目（添字2）を先頭へ
    expect(remapTable14Confirm(common, move(2, 0))).toEqual({ t14c0Spouse: '甲', t14c0No: '1' });
  });

  it('挟まれただけの行も番号がずれる', () => {
    const common: Values = { t14c0Spouse: '甲', t14c0No: '2' };

    // 1行目（添字0）を3行目へ動かすと、2行目は1行目に繰り上がる
    expect(remapTable14Confirm(common, move(0, 2)).t14c0No).toBe('1');
  });

  it('別の用紙へ移った行を指していたら、確認欄ごとその用紙へ移す', () => {
    const common: Values = { t14c0Spouse: '甲', t14c0No: '1' };

    // 1枚目の1行目を2枚目の1行目（添字4）へ
    expect(remapTable14Confirm(common, move(0, 4))).toEqual({ t14c1Spouse: '甲', t14c1No: '1' });
  });

  it('番号を書いていなければ何も変えない', () => {
    const common: Values = { t14c0Spouse: '甲' };

    expect(remapTable14Confirm(common, move(2, 0))).toBe(common);
  });
});

/**
 * 相続税の速算表（第2表の下部に印字されている表）。
 *
 * 段を1つ取り違えたり控除額を打ち間違えたりすると、全員の税額が黙って狂う。
 * 金額は「法定相続分に応ずる取得金額」の千円単位。
 */
describe('相続税の速算表（rateTax）', () => {
  it.each([
    [10000, 1_000_000],
    [30000, 4_000_000],
    [50000, 8_000_000],
    [100000, 23_000_000],
    [200000, 63_000_000],
    [300000, 108_000_000],
    [600000, 258_000_000],
  ])('%i千円ちょうどはその段で計算する', (thousand, expected) => {
    expect(rateTax(thousand)).toBe(expected);
  });

  it.each([
    [10001, 1_000_150],
    [30001, 4_000_200],
    [50001, 8_000_300],
    [100001, 23_000_400],
    [200001, 63_000_450],
    [300001, 108_000_500],
    [600001, 258_000_550],
  ])('%i千円は1つ上の段で計算する（上限は「以下」）', (thousand, expected) => {
    expect(rateTax(thousand)).toBe(expected);
  });

  it('段の境目では控除額が税率の上がり分をちょうど打ち消す', () => {
    // 速算表は境目で連続するように控除額が決めてあるので、上限ちょうどの税額だけでは
    // 「以下」と「未満」の取り違えが値に出ない（どちらの段で計算しても同額になる）。
    // 境目の1千円上との差が次の段の税率ぶんになることで、各段の控除額を確かめる。
    RATE_BRACKETS.forEach((bracket, i) => {
      if (!Number.isFinite(bracket.limit)) return;
      const next = RATE_BRACKETS[i + 1]!;
      expect(rateTax(bracket.limit + 1) - rateTax(bracket.limit)).toBe(Math.round(1000 * next.rate));
    });
  });

  it.each([0, -1, -100000])('取得金額が無ければ税額も0（%i）', (thousand) => {
    expect(rateTax(thousand)).toBe(0);
  });

  it('いちばん下の段には控除額が無い', () => {
    expect(rateTax(1)).toBe(100);
  });
});

/** 明細1件。空行と区別できればよいので1欄だけ入れる */
const detailRow = (): Values => ({ name: '甲' });

/** 明細 n 件（`blanks` 件の空行を末尾に足せる） */
const detailList = (n: number, blanks = 0): Values[] => [
  ...Array.from({ length: n }, detailRow),
  ...Array.from({ length: blanks }, (): Values => ({})),
];

/** 明細の件数から最低枚数が決まる様式 */
interface DetailPagesCase {
  /** テストの見出し */
  name: string;
  /** 明細の様式コード */
  form: string;
  /** 1枚に載る件数 */
  perPage: number;
  /** 手で指定した枚数を持つ共通欄のキー */
  key: string;
  min: (details: Record<string, Values[]>) => number;
  pages: (common: Values, details: Record<string, Values[]>) => number;
}

const DETAIL_PAGES: DetailPagesCase[] = [
  {
    name: '第9表', form: TABLE9_DETAIL_FORM, perPage: TABLE9_ROWS, key: 't9Pages',
    min: table9MinPages, pages: table9Pages,
  },
  {
    name: '第10表', form: TABLE10_DETAIL_FORM, perPage: TABLE10_ROWS, key: 't10Pages',
    min: table10MinPages, pages: table10Pages,
  },
  {
    name: '第13表1（債務）', form: TABLE13_DEBT_FORM, perPage: TABLE13_DEBT_ROWS, key: 't13Pages',
    min: (details) => table13MinPages(1, details),
    pages: (common, details) => table13Pages(common, 1, details),
  },
  {
    name: '第13表2（葬式費用）', form: TABLE13_FUNERAL_FORM, perPage: TABLE13_FUNERAL_ROWS, key: 't13Pages',
    min: (details) => table13MinPages(1, details),
    pages: (common, details) => table13Pages(common, 1, details),
  },
  {
    name: '第14表1（贈与）', form: TABLE14_GIFT_FORM, perPage: TABLE14_GIFT_ROWS, key: 't14Pages',
    min: table14MinPages, pages: table14Pages,
  },
  {
    name: '第14表2（遺贈）', form: TABLE14_BEQUEST_FORM, perPage: TABLE14_BEQUEST_ROWS, key: 't14Pages',
    min: table14MinPages, pages: table14Pages,
  },
  {
    name: '第14表3（寄附）', form: TABLE14_DONATION_FORM, perPage: TABLE14_DONATION_ROWS, key: 't14Pages',
    min: table14MinPages, pages: table14Pages,
  },
];

// 枚数が足りないと、用紙に出ていない明細が集計にだけ効いてしまう。画面には出ているので、
// 印刷するまで気付けない。最低枚数はその下限で、これを割る枚数には減らせない。
describe.each(DETAIL_PAGES)('$name の枚数', ({ form, perPage, key, min, pages }) => {
  it('明細が無ければ1枚', () => {
    expect(min({})).toBe(1);
    expect(pages({}, {})).toBe(1);
  });

  it('ちょうど1枚分なら1枚', () => {
    expect(min({ [form]: detailList(perPage) })).toBe(1);
  });

  it('1件でも超えたら2枚', () => {
    expect(min({ [form]: detailList(perPage + 1) })).toBe(2);
  });

  it('末尾の空行は枚数を増やさない（打って消しただけの行）', () => {
    expect(min({ [form]: detailList(perPage, 3) })).toBe(1);
  });

  it('手で指定した枚数が最低枚数を下回っても最低枚数までしか減らない', () => {
    expect(pages({ [key]: '1' }, { [form]: detailList(perPage + 1) })).toBe(2);
  });

  it('明細が収まっていれば手で指定した枚数を使う', () => {
    expect(pages({ [key]: '3' }, { [form]: detailList(perPage) })).toBe(3);
  });
});

describe('第13表の枚数は人数でも増える', () => {
  it('1枚に載る人数までは1枚', () => {
    expect(table13MinPages(TABLE13_PERSONS, {})).toBe(1);
  });

  it('人数が1人でも超えたら2枚', () => {
    expect(table13MinPages(TABLE13_PERSONS + 1, {})).toBe(2);
  });

  it('人数と明細のうち多い方をとる', () => {
    const details = { [TABLE13_DEBT_FORM]: detailList(TABLE13_DEBT_ROWS + 1) };

    expect(table13MinPages(TABLE13_PERSONS, details)).toBe(2);
  });
});

/**
 * 明細の件数からは枚数が決まらない様式。
 * 対象になるかどうかが相続人の一覧から分からないので、−／＋で増減する。
 */
const MANUAL_PAGES: [string, string, (values: Values) => number][] = [
  ['第4表', 't4Pages', table4Pages],
  ['第4表の2', 't42Pages', table42Pages],
  ['第8の8表', 't88Pages', table88Pages],
  ['第11の2表', 't112Pages', table112Pages],
];

describe.each(MANUAL_PAGES)('%s の枚数', (_name, key, pages) => {
  it('未入力なら1枚', () => {
    expect(pages({})).toBe(1);
  });

  it('指定した枚数を使う', () => {
    expect(pages({ [key]: '3' })).toBe(3);
  });

  it.each(['0', '-2', '', 'あ'])('枚数にならない値（%s）は1枚に倒す', (value) => {
    expect(pages({ [key]: value })).toBe(1);
  });

  it('小数は切り捨てる', () => {
    expect(pages({ [key]: '2.7' })).toBe(2);
  });
});

describe('第11の2表を印刷するか（hasTable112）', () => {
  it('相続時精算課税の記入が1つでもあれば印刷する', () => {
    expect(hasTable112({ t112a0: '1000000' })).toBe(true);
  });

  it('枚数だけ増やして中身が空なら印刷しない', () => {
    expect(hasTable112({ t112Pages: '3' })).toBe(false);
  });

  it('自動転記される氏名は記入と数えない', () => {
    expect(hasTable112({ name: '甲', isLawful: '1' })).toBe(false);
  });

  it('空白だけの欄は記入と数えない', () => {
    expect(hasTable112({ t112a0: '   ' })).toBe(false);
  });
});
