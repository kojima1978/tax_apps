import { hs, hv, hyen, rv, ryen } from '@/lib/formulaHint';
import type { TableProps } from '@/types/form';
import type { calcTable3 } from './Table3Grid';

// 第3表の自動計算欄に出すツールチップ。
// 会社規模でどの欄を使うか・配当還元と原則のどちらを採ったかが値だけでは見えないので、
// 「採用した根拠」を明示する。

type Calc = ReturnType<typeof calcTable3>;
type Raw = (field: string) => string;

const parse = (s: string): number | null => {
  const v = s.replace(/,/g, '').trim();
  return v === '' || isNaN(Number(v)) ? null : Number(v);
};

/** 円＋銭の2欄で持っている入力値 */
const senPair = (raw: Raw, yen: string, sen: string): number | null => {
  const y = parse(raw(yen));
  return y === null ? null : y + (parse(raw(sen)) ?? 0) / 100;
};

export function table3Hints(c: Calc, raw: Raw, getField: TableProps['getField']): Record<string, string> {
  // 会社規模に応じて④⑤⑥のどれを使うか（⑧⑫の出発点）
  const base = c.size === 4 ? c.v4 : c.size === 0 ? c.v6 : c.size !== null ? c.v5 : null;
  const baseLabel = c.size === 4 ? '④' : c.size === 0 ? '⑥' : c.size !== null ? '⑤' : '④⑤⑥';
  const lowBase = c.v1 !== null && c.v2 !== null ? Math.min(c.v1, c.v2) : null;
  const blended = c.v1 !== null && c.iSmall !== null ? c.v1 * 0.5 + c.iSmall * 0.5 : null;
  const mod1Div = senPair(raw, 'mod1_div', 'mod1_div_sen');
  const base12 = c.v8 ?? base;
  const v13 = getField('table4', '①');
  const issued = parse(getField('table1_1', '⑤'));
  const sharesNet = issued === null ? null : issued - (parse(c.linkedTreasuryShares) ?? 0);
  const expDiv = senPair(raw, 'exp_div', 'exp_div_sen');
  const expTax = senPair(raw, 'exp_tax', 'exp_tax_sen');
  const method = c.medical
    ? '医療法人（持分あり）は配当還元方式を適用しないため、原則的評価方式'
    : raw('hoshiki') === 'haito' ? '配当還元方式（ツールバーで選択中）'
      : raw('hoshiki') === 'gensoku' ? '原則的評価方式（ツールバーで選択中）'
        : c.useHaito === null ? '第１表の株主判定がまだ決まっていません'
          : c.useHaito ? '配当還元方式（第１表の株主判定に連動）' : '原則的評価方式（第１表の株主判定に連動）';

  const v22Hint = `㉑ ${hv(c.v21, 1)}千円 × 1,000 ÷ ⑯ ${hv(c.v16)}株 ＝ ${ryen(c.v22raw)}（10銭未満切捨て）`
    + (c.v22Floored ? '\n２円50銭未満のため、下限の ２円50銭 を記載します' : '');
  const v27Hint = `㉕ ${hyen(expDiv)} － ㉖ ${hyen(expTax)} ＝ ${ryen(c.v27)}（円未満2位まで）`;

  return {
    '①': '第４表の比準価額。修正後があればそちらを使います（㉜→㉘→㉖の順）',
    '④': `イ ${rv(c.v1)}円 と ロ ${rv(c.v2)}円 のうち低い方 ＝ ${rv(c.v4)}円（大会社）`,
    '⑤': `（イ ${rv(c.v1)}円 と ロ ${rv(c.v2)}円 の低い方 ${rv(lowBase)}円）× L ${c.lRate ?? '－'}`
      + `\n＋ ${rv(c.iSmall)}円 ×（1 － L ${c.lRate ?? '－'}）＝ ${rv(c.v5)}円（円未満切捨て・中会社）`,
    '⑥': `（イ ${rv(c.v1)}円 × 0.5 ＋ ロ ${rv(c.iSmall)}円 × 0.5 ＝ ${rv(blended)}円）と ロ ${rv(c.iSmall)}円`
      + `\nのうち低い方 ＝ ${rv(c.v6)}円（円未満切捨て・小会社）`,
    L割合: 'Ｌの割合は第１表の２の会社規模の判定に連動します（中会社 大＝0.90／中＝0.75／小＝0.60）',
    '⑧': `${baseLabel} ${rv(base)}円 － ⑦ ${hyen(mod1Div)} ＝ ${rv(c.v8)}円（円未満切捨て）`,
    '⑫': `${c.v8 !== null ? '⑧' : baseLabel} ${rv(base12)}円 ＋ ⑨ ${hs(raw('mod2_pay'))}円 × ⑩ ${hs(raw('mod2_ratio'))}株`
      + `\n÷（1株 ＋ ⑪ ${hs(raw('mod2_ratio2'))}株）＝ ${rv(c.v12)}円（円未満切捨て）`,

    '⑯': `⑬ ${hs(v13)}千円 × 1,000 ÷ 50円 ＝ ${rv(c.v16)}株`,
    '⑰': `⑬ ${hs(v13)}千円 × 1,000 ÷ （⑭ ${hv(issued)}株 － ⑮ ${hv(parse(c.linkedTreasuryShares) ?? 0)}株 ＝ ${rv(sharesNet)}株）`
      + `\n＝ ${c.v17disp === '' ? '（未計算）' : c.v17disp}円（円未満切捨て。切捨てで0になるときは株数の桁に合わせた小数位で記載）`,
    イ: `⑱ ${hs(getField('table4', 'f28'))}千円 － ⑲ ${hs(getField('table4', 'f29'))}千円 ＝ ${rv(c.ia, 1)}千円`,
    ロ: `⑱ ${hs(getField('table4', 'f32'))}千円 － ⑲ ${hs(getField('table4', 'f33'))}千円 ＝ ${rv(c.ro, 1)}千円`,
    '㉑': `（イ ${hv(c.ia, 1)} ＋ ロ ${hv(c.ro, 1)}）÷ 2 ＝ ${rv(c.v21, 1)}千円`,
    '㉒円': v22Hint, '㉒銭': v22Hint,
    '㉓': `㉒ ${ryen(c.v22)} ÷ 10％ × ⑰ ${c.v17disp === '' ? '（未計算）' : c.v17disp}円 ÷ 50円 ＝ ${rv(c.v23)}円（円未満切捨て）`,
    '㉔': c.v23 !== null && c.gensoku !== null && c.v23 > c.gensoku
      ? `㉓ ${rv(c.v23)}円 が原則的評価方式の価額 ${rv(c.gensoku)}円 を上回るため、${rv(c.gensoku)}円 を記載します`
      : `㉓ ${rv(c.v23)}円 をそのまま記載します（原則的評価方式の価額 ${rv(c.gensoku)}円 以下）`,

    '㉗円': v27Hint, f72: v27Hint,
    '㉘': `適用方式は${method}。その価額 ${rv(c.base28)}円 を記載します`,
    '㉚': `㉘ ${rv(c.base28)}円 － ㉙ ${hs(raw('r22_pay'))}円 ＝ ${rv(c.v30)}円（円未満切捨て）`,
    '㉛': `㉘ ${rv(c.base28)}円 の円未満を切り捨てた ${rv(c.v31)}円`,
    '㉜': `㉘ ${rv(c.base28)}円 と同額`,
    '㉝': `適用方式は${method}\n記載する価額 ${rv(c.finalPrice)}円`,
  };
}
