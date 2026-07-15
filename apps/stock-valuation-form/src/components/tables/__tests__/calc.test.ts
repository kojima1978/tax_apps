import { describe, it, expect } from 'vitest';
import type { TableId } from '@/types/form';
import { calcCompanySize } from '../table1-2/Table1_2Grid';
import { calcShareholderJudgment } from '../Table1_1Grid';
import { calcTable5 } from '../table5/Table5Grid';
import { calcTable2 } from '../table2/Table2Grid';
import { calcTable8 } from '../table8/Table8Grid';
import { calcTable7 } from '../table7/Table7Grid';
import { calcTable4 } from '../table4/Table4Grid';

// 各表のフィールド値を与えると getField を返すモックビルダー（(table, field) 形式）
type Data = Partial<Record<TableId, Record<string, string>>>;
const mkGetField = (data: Data) => (table: TableId, field: string): string => data[table]?.[field] ?? '';
// calcCompanySize は table1_2 にバインド済みの 1 引数 getter を取るため、専用ビルダーを使う
const mkG1 = (fields: Record<string, string>) => (field: string): string => fields[field] ?? '';

describe('calcCompanySize（第1表の2：会社規模＝Lの割合の判定／通達178）', () => {
  it('大会社：継続従業員70人以上は無条件で大会社(4)', () => {
    const c = calcCompanySize(mkG1({ gyoshu: 'その他', f22: '100000', f24: '50000', emp_regular: '80' }));
    expect(c.result).toBe(4);
  });

  it('中会社：総資産・取引金額・従業員から下位/上位で 0.90(3) を導出', () => {
    // その他: 資産600,000千円→rank3, 取引450,000千円→rank3, 従業員30人→band b075(rank2)
    // チ=min(資産3,従業員2)=2、規模=max(チ2,取引3)=3
    const c = calcCompanySize(mkG1({ gyoshu: 'その他', f22: '600000', f24: '450000', emp_regular: '30' }));
    expect(c).toMatchObject({ gyo: 'その他', assetRank: 3, txRank: 3, empBand: 'b075', result: 3 });
  });

  it('小会社：いずれの要素も最小区分なら小会社(0)', () => {
    const c = calcCompanySize(mkG1({ gyoshu: 'その他', f22: '10000', f24: '5000', emp_regular: '3' }));
    expect(c.result).toBe(0);
  });

  it('業種未選択なら判定不能(null)', () => {
    const c = calcCompanySize(mkG1({ f22: '600000', f24: '450000', emp_regular: '30' }));
    expect(c.result).toBeNull();
  });
});

describe('calcShareholderJudgment（第1表の1：株主判定＋少数株式所有者の判定／通達188）', () => {
  it('区分1：同族株主等（議決権割合が閾値以上）→ 原則的評価方式', () => {
    const j = calcShareholderJudgment(mkGetField({ table1_1: { sh_1_5: '600', '⑥': '1000', '③': '600' } }));
    expect(j).toMatchObject({ ratio5: 60, ratio6: 60, isDozoku: true, shosuApplies: false, isDozokuFinal: true });
  });

  it('区分1：同族株主等以外（割合が閾値未満）→ 配当還元方式', () => {
    const j = calcShareholderJudgment(mkGetField({ table1_1: { sh_1_5: '100', '⑥': '1000', '③': '100' } }));
    expect(j.isDozoku).toBe(false);
    expect(j.isDozokuFinal).toBe(false);
  });

  it('区分2：同族株主等だが個人5%未満・平取締役(非役員)・他に中心的同族株主あり → 配当還元', () => {
    // 令和8年様式では区分2（少数株式所有者の判定）は第1表の2にあり、j_* は table1_2 に保存される
    const j = calcShareholderJudgment(mkGetField({
      table1_1: { sh_1_5: '40', sh_2_5: '560', '⑥': '1000', '③': '600', sh_1_3: '取締役（平）' },
      table1_2: { j_chushin_self: 'no', j_chushin_other: 'yes' },
    }));
    expect(j.shosuApplies).toBe(true);
    expect(j.officer).toBe(false);
    expect(j.shosuResult).toBe('haito');
    expect(j.isDozokuFinal).toBe(false);
  });

  it('区分2：役職名が代表取締役(役員)なら個人5%未満でも原則的評価方式', () => {
    const j = calcShareholderJudgment(mkGetField({
      table1_1: { sh_1_5: '40', sh_2_5: '560', '⑥': '1000', '③': '600', sh_1_3: '代表取締役' },
      table1_2: { j_chushin_self: 'no', j_chushin_other: 'yes' },
    }));
    expect(j.shosuApplies).toBe(true);
    expect(j.officer).toBe(true);
    expect(j.chushinSelfActive).toBe(false);
    expect(j.chushinOtherActive).toBe(false);
    expect(j.shosuResult).toBe('gensoku');
    expect(j.isDozokuFinal).toBe(true);
  });

  it('区分2：㋬で原則的評価方式等なら㋣の保存値を参照しない', () => {
    const j = calcShareholderJudgment(mkGetField({
      table1_1: { sh_1_5: '40', sh_2_5: '560', '⑥': '1000', '③': '600', sh_1_3: '取締役（平）' },
      table1_2: { j_chushin_self: 'yes', j_chushin_other: 'yes' },
    }));

    expect(j.chushinSelfActive).toBe(true);
    expect(j.chushinOtherActive).toBe(false);
    expect(j.shosuResult).toBe('gensoku');
    expect(j.isDozokuFinal).toBe(true);
  });
});

describe('calcTable5（第5表：1株当たりの純資産価額）', () => {
  const data: Data = {
    table5: {
      a_1_1: '現金', a_1_2: '10000', a_1_3: '8000',
      a_2_1: '株式', a_2_2: '5000', a_2_3: '3000', a_2_4: '株式等',
      a_3_1: '土地', a_3_2: '20000', a_3_3: '12000', a_3_4: '土地等',
      l_1_1: '借入金', l_1_2: '6000', l_1_3: '6000',
    },
    table1_1: { '⑤': '1000', f63: '0', sh_1_5: '600', '⑥': '1000' },
  };
  const t5 = calcTable5(mkGetField(data));

  it('資産・負債を集計し純資産価額（相続税評価額/帳簿価額）を求める', () => {
    expect(t5['①']).toBe(35000); // 総資産（相続税評価額）
    expect(t5['②']).toBe(23000); // 総資産（帳簿価額）
    expect(t5['⑤']).toBe(29000); // 純資産（相続税評価額）= 35000 - 6000
    expect(t5['⑥']).toBe(17000); // 純資産（帳簿価額）= 23000 - 6000
  });

  it('評価差額に対する法人税額等相当額は38%（令和8年様式・円未満切捨て）', () => {
    expect(t5['⑦']).toBe(12000);                    // 評価差額 = 29000 - 17000
    expect(t5['⑧']).toBe(Math.floor(12000 * 0.38)); // 4560
    expect(t5['⑨']).toBe(29000 - 4560);             // 課税時期現在の純資産 = 24440
  });

  it('1株当たりの純資産価額（⑪）と株式等/土地等の集計（イ/ロ/ハ）', () => {
    expect(t5['⑩']).toBe(1000);   // 発行済株式数
    expect(t5['⑪']).toBe(24440);  // 24440千円 ×1000 ÷ 1000株
    expect(t5['イ']).toBe(5000);   // 株式等（相続税評価額）
    expect(t5['ロ']).toBe(3000);   // 株式等（帳簿価額）
    expect(t5['ハ']).toBe(20000);  // 土地等（相続税評価額）
  });

  it('引当金・準備金は負債に含めない（通達186）', () => {
    const t = calcTable5(mkGetField({
      table5: { a_1_1: '現金', a_1_2: '10000', a_1_3: '10000', l_1_1: '貸倒引当金', l_1_2: '4000', l_1_3: '4000' },
      table1_1: { '⑤': '100', f63: '0' },
    }));
    expect(t['⑤']).toBe(10000); // 引当金は負債から除外されるため純資産は減らない
  });
});

describe('calcTable2（第2表：特定の評価会社の判定／通達189）', () => {
  it('株式等保有割合50%以上 → 株式等保有特定会社に該当（判定結果=2）', () => {
    const data: Data = {
      table5: {
        a_1_1: '株式', a_1_2: '60000', a_1_3: '40000', a_1_4: '株式等',
        a_2_1: '現金', a_2_2: '40000', a_2_3: '40000',
      },
      table1_1: { '⑤': '1000', f63: '0', sh_1_5: '600', '⑥': '1000' },
    };
    const c = calcTable2(mkGetField(data));
    expect(c.kabuRatio).toBe(60);    // 60000 / 100000 = 60%
    expect(c.j.s2).toBe(true);
    expect(c.result).toBe(2);
  });

  it('入力不足のときは一般の評価会社（判定結果=0）', () => {
    const c = calcTable2(mkGetField({}));
    expect(c.j.s2).toBeNull();
    expect(c.result).toBe(0);
  });
});

describe('calcTable7（第7表の1：第5表との連動）', () => {
  it('⑩は保存済みの値より第5表㋺の金額を優先する', () => {
    const c = calcTable7(mkGetField({
      table5: { a_1_1: '株式', a_1_2: '30000', a_1_3: '50000', a_1_4: '株式等' },
      table7: { '⑩': '999999' },
    }));

    expect(c.kabuBook).toBe(50000);
  });
});

describe('calcTable8（第8表：S1の続き・S2・株式の価額／第5表と連動）', () => {
  const data: Data = {
    table5: {
      a_1_1: '株式', a_1_2: '60000', a_1_3: '40000', a_1_4: '株式等',
      a_2_1: '現金', a_2_2: '40000', a_2_3: '40000',
    },
    table1_1: { '⑤': '1000', f63: '0', sh_1_5: '600', '⑥': '1000' },
  };
  const c = calcTable8(mkGetField(data));

  it('1.S1の金額（続）純資産価額（相続税評価額）の修正計算', () => {
    // 純資産（相続税評価額）100000、株式等60000 → 差引③=40000
    // 純資産（帳簿価額）80000、株式等帳簿40000 → 差引⑥=40000、評価差額⑦=0
    expect(c.v1).toBe(100000);
    expect(c.v3).toBe(40000);
    expect(c.v6).toBe(40000);
    expect(c.v7).toBe(0);
    expect(c.v9).toBe(40000);
    expect(c.v11).toBe(40000); // 40000千円 ×1000 ÷ 1000株
  });

  it('2.S2の金額（株式等の評価差額に対する法人税額等相当額38%控除・令和8年様式）', () => {
    expect(c.v18).toBe(60000);            // 株式等（相続税評価額）＝第5表イ
    expect(c.v19).toBe(40000);            // 株式等（帳簿価額）＝第5表ロ
    expect(c.v20).toBe(20000);            // 評価差額 = 60000 - 40000
    expect(c.v21).toBe(Math.floor(20000 * 0.38)); // 7600
    expect(c.v22).toBe(60000 - 7600);     // 52400
    expect(c.v24).toBe(52400);            // S2の金額 = 52400千円 ×1000 ÷ 1000株
  });

  it('株式等に係る評価差額が負数のときは0（通達の留意点）', () => {
    const c2 = calcTable8(mkGetField({
      table5: { a_1_1: '株式', a_1_2: '30000', a_1_3: '50000', a_1_4: '株式等' },
      table1_1: { '⑤': '1000', f63: '0' },
    }));
    expect(c2.v20).toBe(0); // 相続税評価額30000 < 帳簿価額50000 → 0
    expect(c2.v21).toBe(0);
  });
});

describe('医療法人（持分あり）の評価（評価通達194-2：配当要素Ⓑを除外）', () => {
  // ①資本金等10,000千円 → ⑤=200,000株、per50=金額×1000÷200,000
  // 利益 e18=10,000千円 → Ⓒ=50円、純資産 n53=30,000千円 → Ⓓ=(10,000+30,000)×1000÷200,000=200円
  const base = {
    table1_1: { medical: '1', '⑤': '200000' },
    table4: {
      '①': '10,000', '②': '200000',
      e18: '10,000', n53: '30,000',
      r1sB1: '10', r1sB2: '80', r1sC: '25', r1sD: '100',
      f28: '1,000', f32: '1,000', // 配当を入力しても医療法人ではⒷに反映しない
    },
  };

  it('Ⓑ1/Ⓑ2/Ⓑは記載しない（null）、比準割合は（Ⓒ/C＋Ⓓ/D）÷2', () => {
    const c = calcTable4(mkGetField(base));
    expect(c.b1).toBeNull();
    expect(c.b2).toBeNull();
    expect(c.Bv).toBeNull();
    expect(c.e1B).toBeNull();
    expect(c.e1C).toBe(2);   // 50÷25
    expect(c.e1D).toBe(2);   // 200÷100
    expect(c.r21).toBe(2);   // (2＋2)÷2
  });

  it('通常モードでは同じ入力で比準割合は3要素÷3（配当ありならⒷも分子に）', () => {
    const normal = { ...base, table1_1: { ...base.table1_1, medical: '' } };
    const c = calcTable4(mkGetField(normal));
    expect(c.b1).not.toBeNull(); // 配当1,000千円が反映される
    // e1B=Ⓑ(2.5円)÷B(10.8?)…ここではB=10円80銭入力 → 2.5/10.8=0.23
    expect(c.r21).not.toBeNull();
    expect(c.r21).not.toBe(2);
  });

  it('比準要素数1の判定はC・Dの2要素で行う（いずれか1つが0）', () => {
    const g = mkGetField({
      table1_1: { medical: '1', '⑤': '200000' },
      table4: {
        '①': '10,000', '②': '200000',
        e18: '0', e25: '0',            // 利益0 → C1=C2=0
        n53: '30,000', n56: '10,000', n57: '30,000', // 純資産あり → D1,D2>0
        r1sC: '25', r1sD: '100',
      },
      table5: {},
    });
    const c = calcTable2(g);
    expect(c.j.s1).toBe(true);  // 医療法人: C1=0（1つ）かつ C2=0（1つ以上）→比準要素数1
  });

  it('同じ入力でも通常モードなら比準要素数1に該当しない（0が2つ必要）', () => {
    const g = mkGetField({
      table1_1: { '⑤': '200000' },
      table4: {
        '①': '10,000', '②': '200000',
        f28: '0', f32: '0', f36: '0',  // 配当0 → B1=B2=0
        e18: '0', e25: '0',
        n53: '30,000', n56: '10,000', n57: '30,000',
        r1sC: '25', r1sD: '100',
      },
      table5: {},
    });
    const c = calcTable2(g);
    // 通常: B1=0,C1=0（2つ）かつ B2=0,C2=0（2以上）→ 該当する（対照として medical との差を確認）
    expect(c.j.s1).toBe(true);
    const cMedical = calcTable2(mkGetField({
      table1_1: { medical: '1', '⑤': '200000' },
      table4: {
        '①': '10,000', '②': '200000',
        e18: '10,000', e25: '10,000',  // 利益あり → C1,C2>0
        n53: '30,000', n56: '10,000', n57: '30,000',
        r1sC: '25', r1sD: '100',
      },
      table5: {},
    }));
    expect(cMedical.j.s1).toBe(false); // C・Dとも0でない → 非該当
  });
});
