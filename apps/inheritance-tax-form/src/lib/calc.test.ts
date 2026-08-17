import { describe, expect, it } from 'vitest';
import {
  computeAll, detailAutoValue, detailGroupCount, detailShareAmounts, detailShareCount, detailSlots,
  detailUnusedFields, moveDetailShare, moved, num, remapTable14Confirm, sameValues, type Values,
} from './calc';
import { table15Key } from '../forms/table15';

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

describe('付表の価額の自動計算', () => {
  it('付表1は路線価方式（面積×単価×持分割合）で計算する', () => {
    expect(detailAutoValue('table11f1', {
      area: '100.00', unitPrice: '150000', shareN: '1', shareD: '2',
    })).toBe('7500000');
  });

  it('付表1で倍率方式を選ぶと固定資産税評価額×倍数×持分割合で計算する', () => {
    expect(detailAutoValue('table11f1', {
      method: 'ratio', fixedValue: '3000000', unitPrice: '1.1', shareN: '1', shareD: '3',
    })).toBe('1100000');
  });

  it('評価方式は入力から推測しない（固定資産税評価額を控えても路線価方式のまま）', () => {
    const item = { area: '100.00', fixedValue: '3000000', unitPrice: '150000', shareN: '1', shareD: '2' };
    expect(detailAutoValue('table11f1', item)).toBe('7500000');
    expect(detailUnusedFields('table11f1', item)).toEqual(['fixedValue']);
    expect(detailUnusedFields('table11f1', { ...item, method: 'ratio' })).toEqual(['area']);
  });

  it('選んだ方式の元になる欄が空なら自動計算しない', () => {
    expect(detailAutoValue('table11f1', { method: 'ratio', area: '100.00', unitPrice: '1.1' })).toBeUndefined();
  });

  it('持分割合が空なら全部（持分の指定なし）として計算する', () => {
    expect(detailAutoValue('table11f1', { area: '100.00', unitPrice: '150000' })).toBe('15000000');
  });

  it('円未満は切り捨てる', () => {
    expect(detailAutoValue('table11f1', {
      area: '1.00', unitPrice: '100', shareN: '1', shareD: '3',
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

  it('付表2は為替が入っていると邦貨換算の入れ方が決まらないので自動計算しない', () => {
    expect(detailAutoValue('table11f2', { quantity: '10', unitPrice: '100', fx: '150' })).toBeUndefined();
  });

  it('自動計算した価額を第11表2①・第15表の集計に使う', () => {
    const result = computeAll({}, [{ name: '甲' }], ['table11f1'], {
      table11f1: [{
        kindCode: '13', area: '100.00', unitPrice: '150000', shareN: '1', shareD: '2',
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
      { table11f1: [{ kindCode: '13', area: '100.00', unitPrice: '150000' }] },
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
    kindCode: '13', area: '100.00', unitPrice: '150001',
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
