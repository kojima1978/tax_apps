import { rv } from '@/lib/formulaHint';
import type { calcTable5Detail } from './Table5Grid';

// 第5表の合計欄・計算欄に出すツールチップ。
// 合計は「どの行を拾ったか」、⑥⑧⑫は「通達のどの判定でそうなったか」が値からは見えないので、そこを言葉にする。

type Detail = ReturnType<typeof calcTable5Detail>;

const pct = (v: number) => v.toLocaleString('ja-JP', { maximumFractionDigits: 1 });

export function table5Hints(d: Detail): Record<string, string> {
  // ⑥: 現物出資等受入れ資産の差額は、総資産の20％を超えるときだけ加算する（評価通達186－2注3）
  const inKindLine = d.inKindEval <= 0
    ? ''
    : d.inKindRatio > 20
      ? `\n現物出資等受入れ資産が総資産の ${pct(d.inKindRatio)}％（20％超）のため、`
        + `差額 ニ ${rv(d.inKindEval)} － ホ ${rv(d.inKindBook)} ＝ ${rv(d.applicableInKindDifference)}千円 を加算しています`
      : `\n現物出資等受入れ資産は総資産の ${pct(d.inKindRatio)}％（20％以下）のため、差額を加算しません（評価通達186－2注3）`;

  return {
    '①': `資産の部の「相続税評価額」欄の合計 ${rv(d.assetEval)}千円`,
    '②': `資産の部の「帳簿価額」欄の合計 ${rv(d.assetBook)}千円`,
    イ: `備考で「株式等」を選んだ行の相続税評価額の合計 ${rv(d.stockEval)}千円`,
    ロ: `備考で「株式等」を選んだ行の帳簿価額の合計 ${rv(d.stockBook)}千円`,
    ハ: `備考で「土地等」を選んだ行の相続税評価額の合計 ${rv(d.landEval)}千円`,
    '③': `負債の部の「相続税評価額」欄の合計 ${rv(d.liabilityEval)}千円`
      + '\n科目名に「引当金」「準備金」を含む行は、純資産価額計算上の負債に含めません（評価通達186）',
    '④': `負債の部の「帳簿価額」欄の合計 ${rv(d.liabilityBook)}千円`
      + '\n科目名に「引当金」「準備金」を含む行は、純資産価額計算上の負債に含めません（評価通達186）',

    '⑤': `① ${rv(d.assetEval)} － ③ ${rv(d.liabilityEval)} ＝ ${rv(d.netEval)}千円（マイナスのときは0）`,
    '⑥': `② ${rv(d.assetBook)} － ④ ${rv(d.liabilityBook)} ＝ ${rv(d.netBook)}千円（マイナスのときは0）${inKindLine}`,
    '⑦': `⑤ ${rv(d.netEval)} － ⑥ ${rv(d.netBook)} ＝ ${rv(d.evaluationDifference)}千円（マイナスのときは0）`,
    '⑧': d.specialMarketValueRules
      ? '所得税・法人税の時価評価（中心的な同族株主に該当する場合）では、評価差額に対する法人税額等相当額を控除しないため0とします'
      : `⑦ ${rv(d.evaluationDifference)}千円 × 38％ ＝ ${rv(d.corporateTaxEquivalent)}千円（端数切捨て）`,
    '⑨': `⑤ ${rv(d.netEval)} － ⑧ ${rv(d.corporateTaxEquivalent)} ＝ ${rv(d.currentNet)}千円`,
    '⑩': `第１表の１⑤ ${rv(d.issuedShares)}株 － 自己株式 ${rv(d.treasuryShares)}株 ＝ ${rv(d.currentShares)}株`,
    '⑪': `⑨ ${rv(d.currentNet)}千円 × 1,000 ÷ ⑩ ${rv(d.currentShares)}株 ＝ ${rv(d.netPerShare)}円（円未満切捨て）`,
    '⑫': d.votingRatio === null
      ? '第１表の１の議決権の数がまだ入っていないため、50％以下かどうかを判定できません'
      : d.votingRatio > 50
        ? `同族株主等の議決権割合が ${pct(d.votingRatio)}％（50％超）のため、この欄は記載しません`
        : `⑪ ${rv(d.netPerShare)}円 × 80％ ＝ ${rv(d.netPerShare80)}円`
          + `\n同族株主等の議決権割合 ${pct(d.votingRatio)}％（50％以下）のため記載します（円未満切捨て）`,
  };
}
