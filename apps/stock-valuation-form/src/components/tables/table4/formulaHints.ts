import { MEDICAL_NO_DIVIDEND, MEDICAL_NO_SECOND_INDUSTRY, hs, hv, hyen, rv, ryen } from '@/lib/formulaHint';
import type { calcTable4 } from './calcTable4';

// 第4表の1・第4表の2の自動計算欄に出すツールチップ。
// calcTable4 が「実際に採用した値」と「なぜその分岐になったか」を文にする。
// 端数処理の但し書き（切捨て・負数は0）も添える。様式の注記を読み直さずに済ませるため。

type Calc = ReturnType<typeof calcTable4>;
type Raw = (field: string) => string;


/** 千円単位の金額 → 1株（50円）当たりの円。⑤で割る形はⒷ・Ⓒ・Ⓓに共通 */
const per50Line = (label: string, value: number | null, cap5: number | null) =>
  `${label} ${hv(value, 1)}千円 × 1,000 ÷ ⑤ ${hv(cap5)}株`;

/** 単年と2年平均のどちらを採ったか（Ⓒ1・Ⓒ2）。自動選択なら「低い方」と理由まで書く */
function profitBaseLine(
  single: number | null,
  singleLabel: string,
  two: number | null,
  twoLabel: string,
  side: 'left' | 'right' | undefined,
  mode: string,
): { line: string; value: number | null } {
  if (side === undefined) return { line: '採用する金額がまだ計算できません', value: null };
  const value = side === 'left' ? single : two;
  const label = side === 'left' ? singleLabel : twoLabel;
  const why = mode === 'single' || mode === 'avg'
    ? 'ツールバーで選択中'
    : single !== null && two !== null
      ? '低い方を自動採用'
      : 'もう一方が計算できないため';
  return { line: `${label} ${hv(value, 1)}千円 を採用（${why}）`, value };
}

/** 第4表の1（1.資本金等の額等 ＋ 2.比準要素等の金額） */
export function table4_1Hints(c: Calc, raw: Raw, medical: boolean): Record<string, string> {
  const net = c.issued === null ? null : c.issued - (c.treasuryShares ?? 0);

  /** ⑧＝⑥－⑦（3期分とも同じ形）。医療法人は⑥⑦を入力させないので計算しない */
  const dividend = (total: string, extra: string, value: number | null) =>
    (medical ? MEDICAL_NO_DIVIDEND : `⑥ ${hs(raw(total))}千円 － ⑦ ${hs(raw(extra))}千円 ＝ ${rv(value, 1)}千円`);
  /** ⑯＝⑪－⑫＋⑬－⑭＋⑮（3期分とも同じ形） */
  const profit = (fs: readonly [string, string, string, string, string], value: number | null) =>
    `⑪ ${hs(raw(fs[0]))} － ⑫ ${hs(raw(fs[1]))} ＋ ⑬ ${hs(raw(fs[2]))} － ⑭ ${hs(raw(fs[3]))} ＋ ⑮ ${hs(raw(fs[4]))}（千円）`
    + `\n＝ ${rv(value, 1)}千円`;
  /** Ⓑ1・Ⓑ2（10銭未満切捨て）。医療法人は記載しない */
  const bHint = (label: string, value: number | null, result: number | null) =>
    (medical ? MEDICAL_NO_DIVIDEND : `${per50Line(label, value, c.cap5)}\n＝ ${ryen(result)}（10銭未満切捨て）`);
  /** Ⓒ1・Ⓒ2（円未満切捨て・負数は0） */
  const cHint = (
    single: number | null, singleLabel: string, two: number | null, twoLabel: string,
    side: 'left' | 'right' | undefined, mode: string, result: number | null,
  ) => {
    const base = profitBaseLine(single, singleLabel, two, twoLabel, side, mode);
    return `${base.line}\n${hv(base.value, 1)}千円 × 1,000 ÷ ⑤ ${hv(c.cap5)}株 ＝ ${rv(result)}円（円未満切捨て・負数は0）`;
  };
  /** Ⓓ1・Ⓓ2（円未満切捨て・負数は0） */
  const dHint = (label: string, value: number | null, result: number | null) =>
    `${per50Line(label, value, c.cap5)}\n＝ ${rv(result)}円（円未満切捨て・負数は0）`;

  const avg12 = c.p1 !== null && c.p2 !== null ? (c.p1 + c.p2) / 2 : null;
  const avg23 = c.p2 !== null && c.p3 !== null ? (c.p2 + c.p3) / 2 : null;
  const b1 = bHint('⑨', c.v9, c.b1);
  const c1 = cHint(c.p1, '直前期 ㊁', avg12, '（㊁＋㋭）÷２', c.c1baseSide, raw('c1_mode'), c.c1);
  const d1 = dHint('㋣', c.t1, c.d1);

  return {
    '④': `① ${hs(raw('①'))}千円 × 1,000 ÷ （② ${hv(c.issued)}株 － ③ ${hv(c.treasuryShares ?? 0)}株 ＝ ${rv(net)}株）`
      + `\n＝ ${c.cap4disp === '' ? '（未計算）' : c.cap4disp}円（円未満切捨て。切捨てで0になるときは株数の桁に合わせた小数位で記載）`,
    '⑤': `① ${hs(raw('①'))}千円 × 1,000 ÷ 50円 ＝ ${rv(c.cap5)}株`,

    '㋑': dividend('f28', 'f29', c.i1),
    '㋺': dividend('f32', 'f33', c.i2),
    '㋩': dividend('f36', 'f37', c.i3),
    '⑨': medical ? MEDICAL_NO_DIVIDEND : `（㋑ ${hv(c.i1, 1)} ＋ ㋺ ${hv(c.i2, 1)}）÷ 2 ＝ ${rv(c.v9, 1)}千円`,
    '⑩': medical ? MEDICAL_NO_DIVIDEND : `（㋺ ${hv(c.i2, 1)} ＋ ㋩ ${hv(c.i3, 1)}）÷ 2 ＝ ${rv(c.v10, 1)}千円`,
    B1: b1, f45: b1,
    B2: bHint('⑩', c.v10, c.b2), f48: bHint('⑩', c.v10, c.b2),
    B: medical ? MEDICAL_NO_DIVIDEND : `Ⓑ₁ ${ryen(c.b1)} をそのまま記載します`,
    f52: medical ? MEDICAL_NO_DIVIDEND : `Ⓑ₁ ${ryen(c.b1)} をそのまま記載します`,

    '㊁': profit(['e18', 'e19', 'e20', 'e21', 'e22'], c.p1),
    '㋭': profit(['e25', 'e26', 'e27', 'e28', 'e29'], c.p2),
    '㋬': profit(['e32', 'e33', 'e34', 'e35', 'e36'], c.p3),
    C1: c1,
    C2: cHint(c.p2, '直前々期 ㋭', avg23, '（㋭＋㋬）÷２', c.c2baseSide, raw('c2_mode'), c.c2),
    C: `Ⓒ₁ ${rv(c.c1)}円 をそのまま記載します`,

    '㋣': `⑰ ${hs(raw('①'))}千円 ＋ ⑱ ${hs(raw('n53'))}千円 ＝ ${rv(c.t1, 1)}千円`,
    '㋠': `⑰ ${hs(raw('n56'))}千円 ＋ ⑱ ${hs(raw('n57'))}千円 ＝ ${rv(c.t2, 1)}千円`,
    D1: d1,
    D2: dHint('㋠', c.t2, c.d2),
    D: `Ⓓ₁ ${rv(c.d1)}円 をそのまま記載します`,
  };
}

/** 会社規模と斟酌率（大0.7／中0.6／小0.5）。第7表の2とも共用するため構造だけ要求する */
export const shinLabel = (c: { shin: number | null; size: number | null }) => {
  if (c.shin === null) return '第１表の２の会社規模が未判定のため斟酌率が決まりません';
  const size = c.size === 4 ? '大会社' : c.size === 0 ? '小会社' : '中会社';
  return `斟酌率 ${c.shin.toFixed(1)}（${size}）`;
};

export const PRICE_LABELS = ['課税時期の属する月', 'その前月', 'その前々月', '前年平均', '課税時期の属する月以前2年間の平均'] as const;

/** 第4表の2（3.類似業種比準価額の計算 ＋ 比準価額の修正） */
export function table4_2Hints(c: Calc, raw: Raw, medical: boolean, taxMonth: string): Record<string, string> {
  const hints: Record<string, string> = {};
  const senPair = (yen: string, sen: string) => {
    const v = raw(yen).replace(/,/g, '').trim();
    if (v === '' || isNaN(Number(v))) return null;
    return Number(v) + Number(raw(sen).replace(/,/g, '').trim() || 0) / 100;
  };

  const blocks = [
    {
      fp: 'r1', months: ['h8', 'h11', 'h13'], prices: ['㋷', '㋦', '㋸', '㋾', '㋻'],
      aField: '⑳', aValue: c.A1, ratioField: '㉑', ratioValue: c.r21,
      priceField: '㉒', priceValue: c.p22, eB: c.e1B, eC: c.e1C, eD: c.e1D,
    },
    {
      fp: 'r2', months: ['h61', 'h64', 'h67'], prices: ['㋕', '㋵', '㋟', '㋹', '㋞'],
      aField: '㉓', aValue: c.A2, ratioField: '㉔', ratioValue: c.r24,
      priceField: '㉕', priceValue: c.p25, eB: c.e2B, eC: c.e2C, eD: c.e2D,
    },
  ] as const;

  for (const b of blocks) {
    // 医療法人（持分あり）は下側のブロックを使わないので、ヒントもその旨だけにする
    if (medical && b.fp === 'r2') {
      const unused: string[] = [
        ...b.months, ...b.prices, b.aField, b.ratioField, b.priceField, `${b.fp}px`,
        `${b.fp}vB1`, `${b.fp}vB2`, `${b.fp}vC`, `${b.fp}vD`,
        `${b.fp}sB1`, `${b.fp}sB2`, `${b.fp}sC`, `${b.fp}sD`,
        `${b.fp}eB`, `${b.fp}eC`, `${b.fp}eD`,
      ];
      for (const f of unused) hints[f] = MEDICAL_NO_SECOND_INDUSTRY;
      continue;
    }
    const source = `業種目番号 ${hs(raw(`${b.fp}gyonum`))}（${hs(raw(`${b.fp}gyo`))}）として公表されている金額です`;
    const sB = senPair(`${b.fp}sB1`, `${b.fp}sB2`);
    const ratio2 = (v: number | null) => (v === null ? '（未計算）' : v.toFixed(2));

    hints[b.months[0]] = `第１表の１の課税時期（${hs(taxMonth)}月）から自動で入れています`;
    hints[b.months[1]] = `課税時期の属する月（${hs(taxMonth)}月）の前月`;
    hints[b.months[2]] = `課税時期の属する月（${hs(taxMonth)}月）の前々月`;
    b.prices.forEach((p, i) => { hints[p] = `${PRICE_LABELS[i]}の株価。${source}`; });
    hints[b.aField] = `${b.prices.map((p) => `${p} ${hs(raw(p))}円`).join('　')}\nのうち最も低い ${rv(b.aValue)}円`;

    const vB = medical ? MEDICAL_NO_DIVIDEND : `第４表の１のⒷ ${ryen(c.Bv)}`;
    hints[`${b.fp}vB1`] = vB;
    hints[`${b.fp}vB2`] = vB;
    hints[`${b.fp}vC`] = `第４表の１のⒸ ${rv(c.Cv)}円`;
    hints[`${b.fp}vD`] = `第４表の１のⒹ ${rv(c.Dv)}円`;
    hints[`${b.fp}sB1`] = source;
    hints[`${b.fp}sB2`] = source;
    hints[`${b.fp}sC`] = source;
    hints[`${b.fp}sD`] = source;

    hints[`${b.fp}eB`] = medical
      ? MEDICAL_NO_DIVIDEND
      : `Ⓑ ${ryen(c.Bv)} ÷ B ${hyen(sB)} ＝ ${ratio2(b.eB)}（小数点2位未満切捨て）`;
    hints[`${b.fp}eC`] = `Ⓒ ${rv(c.Cv)}円 ÷ C ${hs(raw(`${b.fp}sC`))}円 ＝ ${ratio2(b.eC)}（小数点2位未満切捨て）`;
    hints[`${b.fp}eD`] = `Ⓓ ${rv(c.Dv)}円 ÷ D ${hs(raw(`${b.fp}sD`))}円 ＝ ${ratio2(b.eD)}（小数点2位未満切捨て）`;
    hints[b.ratioField] = medical
      ? `（Ⓒ÷C ${ratio2(b.eC)} ＋ Ⓓ÷D ${ratio2(b.eD)}）÷ 2 ＝ ${ratio2(b.ratioValue)}`
        + `\n医療法人（持分あり）は配当要素を除いた2要素で計算します（評価通達194－2。小数点2位未満切捨て）`
      : `（Ⓑ÷B ${ratio2(b.eB)} ＋ Ⓒ÷C ${ratio2(b.eC)} ＋ Ⓓ÷D ${ratio2(b.eD)}）÷ 3`
        + `\n＝ ${ratio2(b.ratioValue)}（小数点2位未満切捨て）`;
    const priceHint = `${b.aField} ${rv(b.aValue)}円 × ${b.ratioField} ${ratio2(b.ratioValue)} × ${shinLabel(c)}`
      + `\n＝ ${ryen(b.priceValue)}（10銭未満切捨て）`;
    hints[b.priceField] = priceHint;
    hints[`${b.fp}px`] = priceHint;
  }

  const minPrice = c.p22 !== null && c.p25 !== null ? Math.min(c.p22, c.p25) : c.p22 ?? c.p25;
  const modDiv = senPair('mod_div', 'mod_div_sen');
  const capLine = `× 第４表の１の④ ${c.cap4disp === '' ? '（未計算）' : c.cap4disp}円 ÷ 50円 ＝ ${rv(c.v26)}円（円未満切捨て）`;
  hints['㉖'] = medical
    ? `㉒ ${ryen(c.p22)}\n${capLine}\n医療法人（持分あり）は類似業種が1つなので、㉕とは比べません`
    : `㉒ ${ryen(c.p22)} と ㉕ ${ryen(c.p25)} のうち低い方 ${ryen(minPrice)}\n${capLine}`;
  hints['㉘'] = `㉖ ${rv(c.v26)}円 － ㉗ ${hyen(modDiv)} ＝ ${rv(c.v27)}円（円未満切捨て）`;
  hints['㉜'] = `${c.v27 !== null ? `㉘ ${rv(c.v27)}円` : `㉖ ${rv(c.v26)}円`}`
    + ` ＋ ㉙ ${hyen(senPair('mod_pay', 'mod_pay_sen'))} × ㉚ ${hs(raw('mod_ratio'))}株`
    + `\n÷（1株 ＋ ㉛ ${hs(raw('mod_ratio2'))}株）＝ ${rv(c.v28)}円（円未満切捨て）`;

  return hints;
}
