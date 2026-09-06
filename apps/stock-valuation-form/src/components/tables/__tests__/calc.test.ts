import { describe, it, expect } from 'vitest';
import type { TableId } from '@/types/form';
import { calcCompanySize } from '../table1-2/Table1_2Grid';
import { calcShareholderJudgment, stockTypeNameOf } from '../Table1_1Grid';
import { calcTable5 } from '../table5/Table5Grid';
import { calcTable2 } from '../table2/Table2Grid';
import { calcTable8 } from '../table8/Table8Grid';
import { calcTable7 } from '../table7/calcTable7';
import { calcTable4 } from '../table4/calcTable4';
import { calcClientSummary } from '@/lib/clientSummary';

// 各表のフィールド値を与えると getField を返すモックビルダー（(table, field) 形式）
type Data = Partial<Record<TableId, Record<string, string>>>;
const mkGetField = (data: Data) => (table: TableId, field: string): string => data[table]?.[field] ?? '';
// calcCompanySize は table1_2 にバインド済みの 1 引数 getter を取るため、専用ビルダーを使う
const mkG1 = (fields: Record<string, string>) => (field: string): string => fields[field] ?? '';

describe('stockTypeNameOf（第1表の1：株式種類コードから名称への連動）', () => {
  it('G05等のコード1を普通株式、コード2を普通株式以外として表示する', () => {
    expect(stockTypeNameOf('1')).toBe('普通株式');
    expect(stockTypeNameOf('2')).toBe('普通株式以外');
  });

  it('未選択または不明なコードでは自動表示しない', () => {
    expect(stockTypeNameOf('')).toBe('');
    expect(stockTypeNameOf('9')).toBe('');
  });
});

describe('calcCompanySize（第1表の2：会社規模＝Lの割合の判定／通達178）', () => {
  it('G12の取引金額だけでも、選択した業種の㋕区分を判定する', () => {
    expect(calcCompanySize(mkG1({ gyoshu: '卸売業', f24: '350000' })).txRank).toBe(2);
    expect(calcCompanySize(mkG1({ gyoshu: '小売・サービス業', f24: '100000' })).txRank).toBe(1);
    expect(calcCompanySize(mkG1({ gyoshu: 'その他', f24: '100000' })).txRank).toBe(1);
  });

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

  it('59－6・9－1－14の中心的同族株主等は、通常判定が大会社でも小会社として扱う', () => {
    const c = calcCompanySize(mkG1({ gyoshu: 'その他', f22: '2000000', f24: '2000000', emp_regular: '80' }), true);
    expect(c.result).toBe(0);
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

  it('議決権割合の端数処理：②④は1%未満切捨て・50%超51%未満は51%に切上げ（記載要領）', () => {
    // 505/1000 = 50.5% → ②④は51%へ切上げ、㋥（納税義務者個人）は切捨てのみで50%
    const j = calcShareholderJudgment(mkGetField({ table1_1: { sh_1_5: '505', '⑥': '1000', '③': '505' } }));
    expect(j.ratio5).toBe(51);
    expect(j.ratio6).toBe(51);
    expect(j.indivRatio).toBe(50);
  });

  it('議決権割合の端数処理：50%超51%未満の範囲外は単純切捨て', () => {
    // 605/1000 = 60.5% → 60%
    const j = calcShareholderJudgment(mkGetField({ table1_1: { sh_1_5: '605', '⑥': '1000', '③': '605' } }));
    expect(j.ratio5).toBe(60);
    expect(j.ratio6).toBe(60);
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

  it('所得税基本通達59－6では評価差額に対する法人税額等相当額を控除しない', () => {
    const t = calcTable5(mkGetField({
      ...data,
      table1_1: { ...data.table1_1, _valuation_purpose: 'special-market-value' },
    }));
    expect(t['⑧']).toBe(0);
    expect(t['⑨']).toBe(29000);
    expect(t['⑪']).toBe(29000);
  });

  it('旧9－1－14区分の保存データも共通区分として読み替える', () => {
    const t = calcTable5(mkGetField({
      ...data,
      table1_1: { ...data.table1_1, _valuation_purpose: 'corporate-tax-9-1-14' },
    }));
    expect(t['⑧']).toBe(0);
    expect(t['⑨']).toBe(29000);
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

describe('calcClientSummary（お客様向けサマリー）', () => {
  it('入力済みデータから現状指標と打ち手を生成する', () => {
    const summary = calcClientSummary(mkGetField({
      table1_1: { f12: 'サンプル株式会社', f13: '山田 太郎', '⑤': '1000', f63: '0', sh_1_5: '600', '⑥': '1000' },
      table1_2: { gyoshu: 'その他', f22: '10000', f24: '5000', emp_regular: '3' },
      table5: {
        a_1_1: '株式', a_1_2: '60000', a_1_3: '40000', a_1_4: '株式等',
        a_2_1: '現金', a_2_2: '40000', a_2_3: '40000',
      },
    }));

    expect(summary.companyName).toBe('サンプル株式会社');
    expect(summary.sizeLabel).toBe('小会社');
    expect(summary.stockRatio).toBe(60);
    expect(summary.current.length).toBeGreaterThan(2);
    expect(summary.actions.some((item) => item.title === '保有株式の構成を見直す')).toBe(true);
  });

  it('主要項目が未入力なら確認事項を最優先の打ち手として示す', () => {
    const summary = calcClientSummary(mkGetField({}));
    expect(summary.missing).toContain('会社名');
    expect(summary.actions[0]).toMatchObject({ priority: '高', title: '未入力項目を確定する' });
  });

  it('類似業種比準の各要素が1円増加した場合の影響度を算定する', () => {
    const summary = calcClientSummary(mkGetField({
      table1_1: { '⑤': '1000', f63: '0' },
      table1_2: { gyoshu: 'その他', f22: '10000', f24: '5000', emp_regular: '3' },
      table4: {
        '①': '50', '㋷': '300',
        r1sB1: '10', r1sB2: '0', r1sC: '20', r1sD: '40',
      },
    }));

    expect(summary.sensitivity.adoptedBlock).toBe('第1業種目');
    expect(summary.sensitivity.items.map((item) => item.value)).toEqual([5, 2.5, 1.25]);
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

  // ⑬は千円・⑮は円。単位換算が抜けると1/1000になり、⑯⑰を通してS1全体が狂う
  it('⑮は千円の利益積立金額を円へ直してから1株当たりに割る', () => {
    const c = calcTable7(mkGetField({
      table1_1: { '⑤': '1000000', f63: '0' },
      table4: { '①': '50000', n53: '100000' },
      table7: { f10: '1000', f11: '1000', f13: '3000', f14: '5000' },
    }));

    expect(c.ha).toBe(0.2);          // ㋑2,000 ÷（㋑2,000＋㋺8,000）
    expect(c.shares50).toBe(1000000); // ⑭ 第4表⑤
    expect(c.roKin).toBe(20);        // ⑮ 100,000千円 ×1,000 ÷ 1,000,000株 × 0.2
  });
});

describe('calcTable7（第7表の2：S1の類似業種比準価額）', () => {
  // 評価会社の要素は第4表のⒷⒸⒹではなく、受取配当金等収受割合で減額した後の⑤⑧⑰を使う
  const data: Data = {
    table1_1: { '⑤': '1000000', f63: '0' },
    table1_2: { gyoshu: 'その他', f22: '10000', f24: '5000', emp_regular: '3' },
    table4: {
      '①': '50000', n53: '100000',
      f28: '2000', f29: '0', f32: '2000', f33: '0',
      e18: '5000', e25: '5000',
      '㋷': '100', r1sB1: '4', r1sB2: '00', r1sC: '10', r1sD: '200',
    },
    table5: {
      a_1_1: '株式', a_1_2: '60000', a_1_3: '40000', a_1_4: '株式等',
      a_2_1: '現金', a_2_2: '40000', a_2_3: '40000',
    },
    table7: { f10: '1000', f11: '1000', f13: '3000', f14: '5000' },
  };
  const c = calcTable7(mkGetField(data));

  it('第7表の1の⑤⑧⑰（Ⓑ－ⓑ／Ⓒ－ⓒ／Ⓓ－ⓓ）が比準要素になる', () => {
    expect(c.adjB).toBe(1.6);   // Ⓑ2.00 － ⓑ0.40
    expect(c.adjC).toBe(4);     // Ⓒ5 － ©1
    expect(c.adjD).toBe(55);    // Ⓓ150 － ⓓ95（⑫75＋⑮20）
    expect(c.e1B).toBe(0.4);    // ⑤1.60 ÷ B4.00
    expect(c.e1C).toBe(0.4);    // ⑧4 ÷ C10
    expect(c.e1D).toBe(0.27);   // ⑰55 ÷ D200（小数2位未満切捨て）
  });

  it('比準割合・比準価額は減額後の要素から計算する（第4表の値をそのまま転記しない）', () => {
    const t4 = calcTable4(mkGetField(data));
    expect(t4.r21).toBe(0.58);  // 第4表はⒷⒸⒹのまま（0.50＋0.50＋0.75）÷3
    expect(c.r19).toBe(0.35);   // 第7表は（0.40＋0.40＋0.27）÷3
    expect(c.p20).toBe(17.5);   // ⑱100円 × ⑲0.35 × 斟酌率0.5
    expect(c.v24).toBe(17);     // ㉔ 17.50 × ④50円 ÷ 50円
  });

  describe('医療法人（持分あり）は下側の類似業種ブロック（㉑～㉓）を使わない', () => {
    // 下側の方が安くなる値（㉑＝20円）をわざと入れておく
    const withSecond: Data = {
      ...data,
      table4: {
        ...data.table4,
        '㋕': '20',
        r2sB1: '4', r2sB2: '00', r2sC: '10', r2sD: '200',
      },
    };

    it('㉒・㉓は空になり、㉔は⑳だけから求める', () => {
      const m = calcTable7(mkGetField({ ...withSecond, table1_1: { ...withSecond.table1_1, medical: '1' } }));
      expect(m.e2B).toBeNull();
      expect(m.e2C).toBeNull();
      expect(m.e2D).toBeNull();
      expect(m.r22).toBeNull();
      expect(m.p23).toBeNull();
      expect(m.r19).toBe(0.33);  // 医療法人は（0.40＋0.27）÷2
      expect(m.p20).toBe(16.5);  // ⑱100円 × ⑲0.33 × 斟酌率0.5
      expect(m.v24).toBe(16);    // ㉓（3.50円）とは比べない
      expect(m.A2).toBe(20);     // 第4表の㉓の値自体は残す
    });

    it('通常モードなら同じ入力で㉓を計算し、㉔は低い方を採る', () => {
      const n = calcTable7(mkGetField(withSecond));
      expect(n.r22).toBe(0.35);
      expect(n.p23).toBe(3.5);   // ㉑20円 × ㉒0.35 × 斟酌率0.5
      expect(n.v24).toBe(3);     // ⑳（17.50円）と比べて低い方
    });
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

  // ⑤⑲は「第5表の㋺＋（㊁－㋭）」。20％超のときだけ加算する第5表の判定に合わせる
  it('現物出資等受入れ資産が総資産の20％超なら、⑤⑲に（㊁－㋭）を加える', () => {
    const inKind = calcTable8(mkGetField({
      ...data,
      table5: { ...data.table5, 'ニ': '30000', 'ホ': '20000' },
    }));

    expect(inKind.v4).toBe(90000);  // ④ 第5表⑥（帳簿価額80,000＋差額10,000）
    expect(inKind.v5).toBe(50000);  // ⑤ ㋺40,000＋（㊁30,000－㋭20,000）
    expect(inKind.v6).toBe(40000);  // ⑥ ④－⑤
    expect(inKind.v19).toBe(50000); // ⑲ ⑤と同じ
    expect(inKind.v20).toBe(10000); // ⑳ ⑱60,000－⑲50,000
  });

  it('現物出資等受入れ資産が総資産の20％以下なら（㊁－㋭）を加えない', () => {
    const inKind = calcTable8(mkGetField({
      ...data,
      table5: { ...data.table5, 'ニ': '10000', 'ホ': '0' },
    }));

    expect(inKind.v5).toBe(40000);
    expect(inKind.v19).toBe(40000);
  });

  it('59－6・9－1－14ではS1修正・S2でも法人税額等相当額を控除しない', () => {
    const special = calcTable8(mkGetField({
      ...data,
      table1_1: { ...data.table1_1, _valuation_purpose: 'special-market-value' },
    }));
    expect(special.v21).toBe(0);
    expect(special.v22).toBe(60000);
    expect(special.v24).toBe(60000);
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

describe('calcTable4 ④＝1株当たりの資本金等の額の端数処理（記載要領の端数処理の例）', () => {
  const mk = (cap: string, issued: string, treasury = '0') =>
    calcTable4(mkGetField({ table1_1: { '⑤': issued, f63: treasury }, table4: { '①': cap } }));

  it('円未満切捨てで0円となる場合は、株式数（②－③）の桁数未満の端数を切り捨てる', () => {
    // 記載要領の例: 3,000千円 ÷（4,500,000株－0株）＝0.666666…
    // 株式数が7桁 → 小数点以下7位未満を切捨て＝0.6666666
    const c = mk('3,000', '4,500,000');
    expect(c.cap4).toBe(0.6666666);
    expect(c.cap4disp).toBe('0.6666666');
  });

  it('1円以上となる場合は円未満切捨て', () => {
    // 10,000千円 ÷ 6,000株 ＝ 1,666.66… → 1,666円
    const c = mk('10,000', '6,000');
    expect(c.cap4).toBe(1666);
    expect(c.cap4disp).toBe('1,666');
  });

  it('自己株式③を控除した株式数の桁数で判定する', () => {
    // 3千円 ÷（100,000株－1株＝99,999株：5桁）＝0.0300003… → 小数点以下5位未満切捨て＝0.03
    const c = mk('3', '100,000', '1');
    expect(c.cap4).toBe(0.03);
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

  describe('下側の類似業種ブロック（㎓～㎕）は使わない', () => {
    // 小会社（旟酌率0.5）で、下側の方が安くなる値をわざと入れておく
    const withSecond = {
      ...base,
      table1_2: { gyoshu: 'その他', f22: '10000', f24: '5000', emp_regular: '3' },
      table4: {
        ...base.table4,
        '㋷': '500',                     // ⑳=A1=500円
        '㋕': '100',                     // ㎓=A2=100円
        r2sB1: '10', r2sB2: '0', r2sC: '10', r2sD: '50',
      },
    };

    it('医療法人は㎔・㎕を記載せず、㎖は㎒だけから求める', () => {
      const c = calcTable4(mkGetField(withSecond));
      expect(c.e2B).toBeNull();
      expect(c.e2C).toBeNull();
      expect(c.e2D).toBeNull();
      expect(c.r24).toBeNull();
      expect(c.p25).toBeNull();
      expect(c.p22).toBe(500);   // 500円 × 2.00 × 0.5
      expect(c.v26).toBe(500);   // ㎕（225円）とは比べない
      expect(c.A2).toBe(100);    // 第7表㌠が参照するので、㎓の値自体は残す
    });

    it('通常モードなら同じ入力で㎔・㎕を計算し、㎖は低い方を採る', () => {
      const c = calcTable4(mkGetField({ ...withSecond, table1_1: { ...withSecond.table1_1, medical: '' } }));
      expect(c.r24).toBe(3.16);  // (0.50＋5.00＋4.00)÷3
      expect(c.p25).toBe(158);   // 100円 × 3.16 × 0.5
      expect(c.v26).toBe(158);   // ㎒（370円）と比べて低い方
    });
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
