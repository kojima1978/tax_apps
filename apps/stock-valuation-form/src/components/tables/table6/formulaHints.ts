import { hv, hyen, rv, ryen } from '@/lib/formulaHint';

// 第6表の自動計算欄に出すツールチップ。
// ④〜⑧のどれを使うかは第2表の判定結果で決まり、㉟は適用方式で決まる。
// どちらも第6表の紙面には出てこない情報なので、ここで言葉にする。

type N = number | null;

export type Table6HintValues = {
  v1: N; v2: N; v3: N; iValue: N;
  p4: N; p6: N; p7: N; p8: N;
  resultName: string; base: N; baseLabel: string;
  mod9Div: N; v10: N; base14: N; base14Label: string; v14: N;
  cap: N; issued: N; treasury: N; v18: N; sharesNet: N; v19disp: string;
  ia: N; ro: N; v23: N; v24raw: N; v24: N; v24Floored: boolean; v25: N; jun: N;
  method: string; baseRight: N; finalPrice: N;
  expDiv: N; expTax: N; v29: N; v32: N; v33: N; v34: N;
  rightsLabels: string;
};

export function table6Hints(v: Table6HintValues): Record<string, string> {
  const iLabel = v.v3 !== null ? '③' : '②';
  const iLine = `イ ＝ ${iLabel} ${rv(v.iValue)}円`
    + (v.v3 !== null ? '（③の記載があるので③を使います）' : '（③の記載がないので②を使います）');
  const v24Hint = `㉓ ${hv(v.v23, 1)}千円 × 1,000 ÷ ⑱ ${hv(v.v18)}株 ＝ ${ryen(v.v24raw)}（10銭未満切捨て）`
    + (v.v24Floored ? '\n２円50銭未満のため、下限の ２円50銭 を記載します' : '');
  const v29Hint = `㉗ ${hyen(v.expDiv)} － ㉘ ${hyen(v.expTax)} ＝ ${ryen(v.v29)}（円未満2位まで）`;

  // ④〜⑧のどれを使うかは第2表の判定結果で決まる（この表の紙面には出てこない）
  const baseLine = v.baseLabel === ''
    ? `第２表の判定結果は「${v.resultName}」なので、④〜⑧はいずれも使いません`
    : `第２表の判定結果は「${v.resultName}」なので ${v.baseLabel} を使います`;

  return {
    '④': `${iLine}\nロ ＝ ① ${rv(v.v1)}円 × 0.25 ＋ イ × 0.75`
      + `\nイとロの低い方 ＝ ${rv(v.p4)}円（円未満切捨て）`,
    '⑤': '第７表の３の㉗（株式等保有特定会社のS1＋S2方式による価額）を転記します',
    '⑥': `${iLine}\n土地保有特定会社は純資産価額のみで評価するため、そのまま ${rv(v.p6)}円 を記載します`,
    '⑦': `${iLine}\n開業後３年未満の会社等は純資産価額のみで評価するため、そのまま ${rv(v.p7)}円 を記載します`,
    '⑧': `② ${rv(v.v2)}円（開業前又は休業中の会社は80％評価の③を使いません）\n記載する金額 ${rv(v.p8)}円`,

    '⑩': baseLine
      + `\n${v.baseLabel || '④〜⑧'} ${rv(v.base)}円 － ⑨ ${hyen(v.mod9Div)} ＝ ${rv(v.v10)}円（円未満切捨て）`,
    '⑭': `${v.base14Label} ${rv(v.base14)}円 ＋ ⑪ × ⑫ ÷（1株 ＋ ⑬）＝ ${rv(v.v14)}円（円未満切捨て）`,

    '⑱': `⑮ ${hv(v.cap)}千円 × 1,000 ÷ 50円 ＝ ${rv(v.v18)}株`,
    '⑲': `⑮ ${hv(v.cap)}千円 × 1,000 ÷（⑯ ${hv(v.issued)}株 － ⑰ ${hv(v.treasury ?? 0)}株 ＝ ${rv(v.sharesNet)}株）`
      + `\n＝ ${v.v19disp === '' ? '（未計算）' : v.v19disp}円（円未満切捨て。切捨てで0になるときは株数の桁に合わせた小数位で記載）`,
    '㋑': `直前期の ⑳ 年配当金額 － ㉑ 非経常的な配当金額 ＝ ${rv(v.ia, 1)}千円`,
    '㋺': `直前々期の ⑳ 年配当金額 － ㉑ 非経常的な配当金額 ＝ ${rv(v.ro, 1)}千円`,
    '㉓': `（㋑ ${hv(v.ia, 1)} ＋ ㋺ ${hv(v.ro, 1)}）÷ 2 ＝ ${rv(v.v23, 1)}千円`,
    '㉔円': v24Hint, '㉔銭': v24Hint,
    '㉕': `㉔ ${ryen(v.v24)} ÷ 10％ × ⑲ ${v.v19disp === '' ? '（未計算）' : v.v19disp}円 ÷ 50円 ＝ ${rv(v.v25)}円（円未満切捨て）`,
    '㉖': v.v25 !== null && v.jun !== null && v.v25 > v.jun
      ? `㉕ ${rv(v.v25)}円 が純資産価額方式等の価額 ${rv(v.jun)}円 を上回るため、${rv(v.jun)}円 を記載します`
      : `㉕ ${rv(v.v25)}円 をそのまま記載します（純資産価額方式等の価額 ${rv(v.jun)}円 以下）`,

    '㉙円': v29Hint, f82: v29Hint,
    '㉚': `適用方式は${v.method}。その価額 ${rv(v.baseRight)}円 を記載します`,
    '㉜': `㉚ ${rv(v.baseRight)}円 － ㉛ 割当株式1株当たりの払込金額 ＝ ${rv(v.v32)}円（円未満切捨て）`,
    '㉝': `㉚ ${rv(v.baseRight)}円 の円未満を切り捨てた ${rv(v.v33)}円`,
    '㉞': `㉚ ${rv(v.v34)}円 と同額`,
    '㉟': `適用方式は${v.method}\n記載する価額 ${rv(v.finalPrice)}円`,
    '㊱円': v.rightsLabels === ''
      ? '左の「株式に関する権利の評価」で該当する権利にチェックを入れると、その価額がここに入ります'
      : `チェックした権利の価額を並べます：${v.rightsLabels}`,
  };
}
