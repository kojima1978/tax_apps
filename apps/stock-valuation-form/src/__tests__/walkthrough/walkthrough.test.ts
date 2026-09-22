// 架空1社を第1表から第3表の最終価額まで通しで検算する。
//
// 表ごとの単体テストは既にあるが、それらは「その表の中だけ」を見ている。
// 実際の事故は表と表のつなぎ目（第1表の1の⑤が第4表の②へ、第5表の⑪が第3表の②へ…）で
// 起きるので、ここでは人が手で書く欄だけを与えて、最後の1株当たり評価額まで辿る。
//
// **中間値も全部 assert する**。最終値だけだと、ずれたときにどの表で壊れたか分からないため。
// 期待値はすべて様式の算式と端数処理から手で出したもので、実装から写していない。

import { describe, expect, it } from 'vitest';
import { calcShareholderJudgment } from '@/components/tables/Table1_1Grid';
import { calcCompanySize } from '@/components/tables/table1-2/Table1_2Grid';
import { RESULT_NAMES, calcTable2, printTablesForJudgment } from '@/components/tables/table2/Table2Grid';
import { calcTable3 } from '@/components/tables/table3/Table3Grid';
import { calcTable4 } from '@/components/tables/table4/calcTable4';
import { calcTable5, calcTable5Detail } from '@/components/tables/table5/Table5Grid';
import { sampleGetField } from './sampleCompany';

const g = sampleGetField;

describe('通し検算（日本サンプル工業株式会社・中会社・一般の評価会社）', () => {
  describe('第1表の1（株主の判定）', () => {
    const j = calcShareholderJudgment(g);

    it('同族関係者グループの議決権割合＝16,000÷20,000＝80%', () => {
      expect(j.ratio5).toBe(80);
      expect(j.ratio6).toBe(80); // ④筆頭株主グループも同じ16,000
    });

    it('筆頭グループが50%超なので判定基準は50%、同族株主等に該当', () => {
      expect(j.isDozoku).toBe(true);
    });

    it('納税義務者本人が45%（5%以上）なので少数株式所有者の判定へは進まない', () => {
      expect(j.indivRatio).toBe(45);
      expect(j.shosuApplies).toBe(false);
    });

    it('最終判定は原則的評価方式等', () => {
      expect(j.isDozokuFinal).toBe(true);
    });
  });

  describe('第1表の2（会社規模）', () => {
    const size = calcCompanySize((f) => g('table1_2', f));

    it('その他の業種・総資産420,000千円→区分2、取引金額300,000千円→区分2', () => {
      expect(size.assetRank).toBe(2);
      expect(size.txRank).toBe(2);
    });

    it('従業員28人（20人超35人以下）→区分2', () => {
      expect(size.emp).toBe(28);
      expect(size.empBand).toBe('b075');
    });

    it('㋻＝min(総資産2, 従業員2)＝2、会社規模＝max(㋻2, 取引金額2)＝2（中会社 Ｌ＝0.75）', () => {
      expect(size.result).toBe(2);
    });
  });

  describe('第4表（類似業種比準価額）', () => {
    const t4 = calcTable4(g);

    it('④1株当たりの資本金等の額＝10,000千円×1,000÷20,000株＝500円', () => {
      expect(t4.cap4).toBe(500);
    });

    it('⑤50円換算の株式数＝10,000千円×1,000÷50円＝200,000株', () => {
      expect(t4.cap5).toBe(200000);
    });

    it('Ⓑ年配当金額＝(3,000＋2,000)÷2÷200,000株＝12円50銭（10銭未満切捨て）', () => {
      expect(t4.b1).toBe(12.5);
      expect(t4.b2).toBe(7.5); // Ⓑ2＝(2,000＋1,000)÷2÷200,000株
    });

    it('Ⓒ年利益金額＝単年30,000と2年平均28,000の低い方÷200,000株＝140円', () => {
      // Ⓒは株価に直に効くので未指定なら低い方。Ⓒ1・Ⓒ2は比準要素数の判定用なので0を避ける側（高い方）
      expect(t4.Cv).toBe(140);
      expect(t4.c1).toBe(150); // max(30,000, 28,000)÷200,000株
      expect(t4.c2).toBe(130); // max(26,000, 24,000)÷200,000株
    });

    it('Ⓓ純資産価額＝(資本金等10,000＋利益積立金90,000)÷200,000株＝500円', () => {
      expect(t4.Dv).toBe(500);
      expect(t4.d2).toBe(420); // (10,000＋74,000)÷200,000株
    });

    it('Ⓐ＝5つの株価のうち最も低い額＝290円', () => {
      expect(t4.A1).toBe(290);
    });

    it('比準割合の各要素（小数点以下2位未満切捨て）', () => {
      expect(t4.e1B).toBe(2.35); // 12.50 ÷ 5.30 ＝ 2.3584…
      expect(t4.e1C).toBe(4);    // 140 ÷ 35
      expect(t4.e1D).toBe(1.78); // 500 ÷ 280 ＝ 1.7857…
    });

    it('㉑比準割合＝(2.35＋4.00＋1.78)÷3＝2.71', () => {
      expect(t4.r21).toBe(2.71);
    });

    it('斟酌率は中会社なので0.6', () => {
      expect(t4.shin).toBe(0.6);
    });

    it('㉒比準価額＝290×2.71×0.6＝471円50銭（10銭未満切捨て）', () => {
      expect(t4.p22).toBe(471.5);
    });

    it('㉖1株当たりの比準価額＝471.5×500円÷50円＝4,715円', () => {
      expect(t4.v26).toBe(4715);
      expect(t4.v27).toBeNull(); // 配当落ちの修正なし
      expect(t4.v28).toBeNull(); // 増資の修正なし
    });
  });

  describe('第5表（1株当たりの純資産価額）', () => {
    const d = calcTable5Detail(g);
    const t5 = calcTable5(g);

    it('賞与引当金は評価通達186により負債に含めない（8,000千円を除外）', () => {
      expect(d.liabilityEval).toBe(185000); // 50,000＋120,000＋15,000
      expect(t5['③']).toBe(185000);
      expect(t5['④']).toBe(185000);
    });

    it('①②資産の合計（相続税評価額・帳簿価額）', () => {
      expect(t5['①']).toBe(440000);
      expect(t5['②']).toBe(315000);
    });

    it('イロハ＝備考欄で区分した株式等・土地等だけの合計', () => {
      expect(t5['イ']).toBe(60000); // 投資有価証券（株式等）の相続税評価額
      expect(t5['ロ']).toBe(40000); // 同 帳簿価額
      expect(t5['ハ']).toBe(150000); // 土地（土地等）の相続税評価額
    });

    it('⑤⑥⑦純資産価額と評価差額', () => {
      expect(t5['⑤']).toBe(255000); // 440,000－185,000
      expect(t5['⑥']).toBe(130000); // 315,000－185,000（現物出資等の差額なし）
      expect(t5['⑦']).toBe(125000);
    });

    it('⑧法人税額等相当額＝125,000×38%＝47,500千円', () => {
      expect(t5['⑧']).toBe(47500);
    });

    it('⑨課税時期現在の純資産価額＝255,000－47,500＝207,500千円', () => {
      expect(t5['⑨']).toBe(207500);
    });

    it('⑩⑪＝207,500千円×1,000÷20,000株＝10,375円', () => {
      expect(t5['⑩']).toBe(20000);
      expect(t5['⑪']).toBe(10375);
    });

    it('⑫80%相当額は議決権割合80%（50%超）なので記載しない', () => {
      expect(d.votingRatio).toBe(80);
      expect(t5['⑫']).toBeNull();
    });
  });

  describe('第2表（特定の評価会社の判定）', () => {
    const t2 = calcTable2(g);

    it('比準要素はいずれも0でないので比準要素数1・0のどちらにも当たらない', () => {
      expect(t2.j.s1).toBe(false);
      expect(t2.j.s4b).toBe(false);
    });

    it('③株式等保有割合＝60,000÷440,000＝13%（50%未満）', () => {
      expect(t2.kabuRatio).toBe(13);
      expect(t2.j.s2).toBe(false);
    });

    it('⑥土地保有割合＝150,000÷440,000＝34%、中会社の基準90%未満', () => {
      expect(t2.landRatio).toBe(34);
      expect(t2.j.landCol).toBe('mid');
      expect(t2.j.s3).toBe(false);
    });

    it('平成10年4月1日開業で課税時期は令和8年3月15日なので開業後3年未満に当たらない', () => {
      expect(t2.j.s4a).toBe(false);
    });

    it('判定結果は一般の評価会社', () => {
      expect(t2.result).toBe(0);
      expect(RESULT_NAMES[t2.result]).toBe('一般の評価会社（非該当）');
    });

    it('記載対象は第3表・第4表の1/2・第5表（第6表・第7表は使わない）', () => {
      expect(printTablesForJudgment(g).tables).toEqual([
        'table1_1', 'table1_2', 'table2', 'table3', 'table4_1', 'table4_2', 'table5',
      ]);
    });
  });

  describe('第3表（1株当たりの株式の価額）', () => {
    const t3 = calcTable3(g);

    it('①②③＝第4表の㉖・第5表の⑪・第5表の⑫を転記', () => {
      expect(t3.v1).toBe(4715);
      expect(t3.v2).toBe(10375);
      expect(t3.v3).toBeNull();
    });

    it('Ｌの割合は中会社なので0.75', () => {
      expect(t3.lRate).toBe(0.75);
    });

    it('⑤中会社＝4,715×0.75＋10,375×0.25＝6,130円', () => {
      expect(t3.v5).toBe(6130);
    });

    it('④大会社・⑥小会社も併せて確認（会社規模が動いたときの比較用）', () => {
      expect(t3.v4).toBe(4715);  // min(比準4,715, 純資産10,375)
      expect(t3.v6).toBe(7545);  // min(10,375, 4,715×0.5＋10,375×0.5)
    });

    it('修正がないので原則的評価方式の価額は⑤のまま', () => {
      expect(t3.v8).toBeNull();
      expect(t3.v12).toBeNull();
      expect(t3.gensoku).toBe(6130);
    });

    it('配当還元方式（適用はしないが様式上は計算される）', () => {
      expect(t3.v16).toBe(200000); // ⑯＝10,000千円×1,000÷50円
      expect(t3.v17).toBe(500);    // ⑰＝10,000千円×1,000÷20,000株
      expect(t3.v22).toBe(12.5);   // ㉒＝(3,000＋2,000)÷2÷200,000株
      expect(t3.v23).toBe(1250);   // ㉓＝12.50÷10%×500円÷50円
      expect(t3.v24).toBe(1250);   // 原則的評価額6,130を超えないのでそのまま
    });

    it('同族株主等なので原則的評価方式＝6,130円が最終価額', () => {
      expect(t3.useHaito).toBe(false);
      expect(t3.finalPrice).toBe(6130);
    });
  });
});
