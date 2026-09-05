import { MEDICAL_NO_DIVIDEND, MEDICAL_NO_SECOND_INDUSTRY, hs, hv, hyen, rv, ryen } from '@/lib/formulaHint';
import { PRICE_LABELS, shinLabel } from '../table4/formulaHints';
import type { calcTable7 } from './Table7Grid';

// 第7表の1・第7表の2の自動計算欄に出すツールチップ。
// この2表は値のほとんどが第4表・第5表からの転記なので、「どこから来た数字か」を最初に書く。
// 受取配当金等収受割合（㋩）で減額した後の金額かどうかも、値だけでは見分けが付かない。

type Calc = ReturnType<typeof calcTable7>;
type Raw = (field: string) => string;

const ratio2 = (v: number | null) => (v === null ? '（未計算）' : v.toFixed(2));

/** 第7表の1（受取配当金等収受割合の計算 ＋ Ⓑ－ⓑ／Ⓒ－ⓒ／Ⓓ－ⓓ） */
export function table7_1Hints(c: Calc, raw: Raw, medical: boolean): Record<string, string> {
  const ha = c.ha === null ? '（未計算）' : c.ha.toFixed(3);
  // ㋩は1が上限。営業利益がマイナスだと計算値が1を超えるので、そのときは理由を書く
  const denom = (c.ia ?? 0) + (c.ro ?? 0);
  const haCapped = c.ia !== null && denom > 0 && c.ia / denom > 1;
  const haHint = `㋑ ${hv(c.ia, 1)} ÷（㋑ ${hv(c.ia, 1)} ＋ ㋺ ${hv(c.ro, 1)}）＝ ${ha}`
    + (haCapped
      ? '\n計算値が1を超えたため、上限の 1.000 としています（小数点以下3位未満切捨て）'
      : '\n小数点以下3位未満切捨て（1が上限）');

  // ⑯はⒹの金額（⑨）が上限。頭打ちになったかどうかは値を見ても分からない
  const lowerDraw = c.iKin === null && c.roKin === null ? null : (c.iKin ?? 0) + (c.roKin ?? 0);
  const dCapped = lowerDraw !== null && c.Dv !== null && lowerDraw > c.Dv;

  const b3 = medical ? MEDICAL_NO_DIVIDEND : `第４表の１のⒷ ${ryen(c.Bv)}`;
  const b4 = medical ? MEDICAL_NO_DIVIDEND
    : `③ ${ryen(c.Bv)} × ㋩ ${ha} ＝ ${ryen(c.lowerB)}（10銭未満切捨て）`;
  const b5 = medical ? MEDICAL_NO_DIVIDEND
    : `③ ${ryen(c.Bv)} － ④ ${ryen(c.lowerB)} ＝ ${ryen(c.adjB)}`;

  return {
    '㋑': `受取配当金等の額　直前期 ${hs(raw('f10'))} ＋ 直前々期 ${hs(raw('f11'))} ＝ ${rv(c.ia, 1)}千円`,
    '㋺': `営業利益の金額　直前期 ${hs(raw('f13'))} ＋ 直前々期 ${hs(raw('f14'))} ＝ ${rv(c.ro, 1)}千円`,
    '㋩': haHint,

    '③': b3, f23: b3,
    '④': b4, f25: b4,
    '⑤': b5, f27: b5,

    '⑥': `第４表の１のⒸ ${rv(c.Cv)}円`,
    '⑦': `⑥ ${rv(c.Cv)}円 × ㋩ ${ha} ＝ ${rv(c.lowerC)}円（円未満切捨て）`,
    '⑧': `⑥ ${rv(c.Cv)}円 － ⑦ ${rv(c.lowerC)}円 ＝ ${rv(c.adjC)}円`,

    '⑨': `第４表の１のⒹ ${rv(c.Dv)}円`,
    '⑩': `第５表の㋺（株式等の帳簿価額の合計額）${rv(c.kabuBook, 1)}千円`,
    '⑪': `第５表の②（資産の部の帳簿価額の合計）${rv(c.totalBook, 1)}千円`
      + '\n直前期末の総資産価額が第５表と異なるときは、この欄に直接入力すると上書きできます',
    '⑫': `⑨ ${rv(c.Dv)}円 ×（⑩ ${hv(c.kabuBook, 1)}千円 ÷ ⑪ ${hv(c.totalBook, 1)}千円）＝ ${rv(c.iKin)}円（円未満切捨て）`,
    '⑬': `第４表の１の⑱「直前期」欄の利益積立金額 ${rv(c.ekiseki, 1)}千円`,
    '⑭': `第４表の１の⑤（1株当たりの資本金等の額を50円とした場合の発行済株式数）${rv(c.shares50)}株`,
    '⑮': `（⑬ ${hv(c.ekiseki, 1)}千円 ÷ ⑭ ${hv(c.shares50)}株）× ㋩ ${ha} ＝ ${rv(c.roKin)}円（円未満切捨て）`,
    '⑯': `⑫ ${rv(c.iKin)}円 ＋ ⑮ ${rv(c.roKin)}円 ＝ ${rv(lowerDraw)}円`
      + (dCapped ? `\nⒹの金額（⑨ ${rv(c.Dv)}円）が上限のため、${rv(c.lowerD)}円 を記載します` : ''),
    '⑰': `⑨ ${rv(c.Dv)}円 － ⑯ ${rv(c.lowerD)}円 ＝ ${rv(c.adjD)}円`,
  };
}

/** 第7表の2（S1の類似業種比準価額の計算 ＋ 比準価額の修正） */
export function table7_2Hints(c: Calc, raw: Raw, t4raw: Raw, medical: boolean): Record<string, string> {
  const hints: Record<string, string> = {};
  const senPair = (get: Raw, yen: string, sen: string) => {
    const v = get(yen).replace(/,/g, '').trim();
    if (v === '' || isNaN(Number(v))) return null;
    return Number(v) + Number(get(sen).replace(/,/g, '').trim() || 0) / 100;
  };

  // 株価欄は [この表のフィールド名, 表示記号, 第4表の2のフィールド名] の3つ組。
  // ブロック2は表示記号とフィールド名が食い違う（b2_㊁ を ㋷ と表示する）ので記号を分けて持つ。
  const blocks = [
    {
      fp: 'r1', months: ['f66', 'f68', 'f70'],
      prices: [['㊁', '㊁', '㋷'], ['㋭', '㋭', '㋦'], ['㋬', '㋬', '㋸'], ['㋣', '㋣', '㋾'], ['㋠', '㋠', '㋻']],
      aField: '⑱', aValue: c.A1,
      ev5: 'f103', ev5sen: 'f104', ev8: 'f106', ev17: 'f108',
      sB1: 'f110', sB2: 'f111', sC: 'f113', sD: 'f115',
      eB: 'f117', eC: 'f119', eD: 'f121', eBv: c.e1B, eCv: c.e1C, eDv: c.e1D,
      ratioField: '⑲', ratioValue: c.r19, priceField: '⑳', priceSen: 'f125', priceValue: c.p20,
    },
    {
      fp: 'r2', months: ['b2_f66', 'b2_f68', 'b2_f70'],
      prices: [['b2_㊁', '㋷', '㋕'], ['b2_㋭', '㋦', '㋵'], ['b2_㋬', '㋸', '㋟'], ['b2_㋣', '㋾', '㋹'], ['b2_㋠', '㋻', '㋞']],
      aField: '㉑', aValue: c.A2,
      ev5: 'b2_f103', ev5sen: 'b2_f104', ev8: 'b2_f106', ev17: 'b2_f108',
      sB1: 'b2_f110', sB2: 'b2_f111', sC: 'b2_f113', sD: 'b2_f115',
      eB: 'b2_f117', eC: 'b2_f119', eD: 'b2_f121', eBv: c.e2B, eCv: c.e2C, eDv: c.e2D,
      ratioField: '㉒', ratioValue: c.r22, priceField: '㉓', priceSen: 'b2_f125', priceValue: c.p23,
    },
  ] as const;

  for (const b of blocks) {
    // 医療法人（持分あり）は下側のブロックを使わないので、ヒントもその旨だけにする
    if (medical && b.fp === 'r2') {
      const unused: string[] = [
        'b2_f61', 'b2_f61num',
        ...b.months, ...b.prices.map(([field]) => field), b.aField,
        b.ev5, b.ev5sen, b.ev8, b.ev17,
        b.sB1, b.sB2, b.sC, b.sD,
        b.eB, b.eC, b.eD,
        b.ratioField, b.priceField, b.priceSen,
      ];
      for (const f of unused) hints[f] = MEDICAL_NO_SECOND_INDUSTRY;
      continue;
    }
    const source = `第４表の２から自動で入っています（業種目番号 ${hs(t4raw(`${b.fp}gyonum`))}／${hs(t4raw(`${b.fp}gyo`))}）`;
    const sB = senPair(t4raw, `${b.fp}sB1`, `${b.fp}sB2`);

    hints[b.months[0]] = `課税時期の属する月。${source}`;
    hints[b.months[1]] = `課税時期の属する月の前月。${source}`;
    hints[b.months[2]] = `課税時期の属する月の前々月。${source}`;
    b.prices.forEach(([field], i) => { hints[field] = `${PRICE_LABELS[i]}の株価。${source}`; });
    hints[b.aField] = b.prices.map(([, mark, t4field]) => `${mark} ${hs(t4raw(t4field))}円`).join('　')
      + `\nのうち最も低い ${rv(b.aValue)}円`;

    // 評価会社の行は第7表の1の⑤⑧⑰（受取配当金等収受割合で減額した後）を書く欄。
    // 第4表のⒷⒸⒹとは別物なので、減額前の金額も併せて出す。
    const ev5 = medical ? MEDICAL_NO_DIVIDEND
      : `第７表の１の⑤（Ⓑ－ⓑ）${ryen(c.adjB)}\n減額前の第４表の１のⒷは ${ryen(c.Bv)}`;
    hints[b.ev5] = ev5;
    hints[b.ev5sen] = ev5;
    hints[b.ev8] = `第７表の１の⑧（Ⓒ－ⓒ）${rv(c.adjC)}円\n減額前の第４表の１のⒸは ${rv(c.Cv)}円`;
    hints[b.ev17] = `第７表の１の⑰（Ⓓ－ⓓ）${rv(c.adjD)}円\n減額前の第４表の１のⒹは ${rv(c.Dv)}円`;

    hints[b.sB1] = source;
    hints[b.sB2] = source;
    hints[b.sC] = source;
    hints[b.sD] = source;

    hints[b.eB] = medical ? MEDICAL_NO_DIVIDEND
      : `⑤ ${ryen(c.adjB)} ÷ B ${hyen(sB)} ＝ ${ratio2(b.eBv)}（小数点2位未満切捨て）`;
    hints[b.eC] = `⑧ ${rv(c.adjC)}円 ÷ C ${hs(t4raw(`${b.fp}sC`))}円 ＝ ${ratio2(b.eCv)}（小数点2位未満切捨て）`;
    hints[b.eD] = `⑰ ${rv(c.adjD)}円 ÷ D ${hs(t4raw(`${b.fp}sD`))}円 ＝ ${ratio2(b.eDv)}（小数点2位未満切捨て）`;
    hints[b.ratioField] = medical
      ? `（[⑧]÷C ${ratio2(b.eCv)} ＋ [⑰]÷D ${ratio2(b.eDv)}）÷ 2 ＝ ${ratio2(b.ratioValue)}`
        + '\n医療法人（持分あり）は配当要素を除いた2要素で計算します（評価通達194－2。小数点2位未満切捨て）'
      : `（[⑤]÷B ${ratio2(b.eBv)} ＋ [⑧]÷C ${ratio2(b.eCv)} ＋ [⑰]÷D ${ratio2(b.eDv)}）÷ 3`
        + `\n＝ ${ratio2(b.ratioValue)}（小数点2位未満切捨て）`;

    const priceHint = `${b.aField} ${rv(b.aValue)}円 × ${b.ratioField} ${ratio2(b.ratioValue)} × ${shinLabel(c)}`
      + `\n＝ ${ryen(b.priceValue)}（10銭未満切捨て）`;
    hints[b.priceField] = priceHint;
    hints[b.priceSen] = priceHint;
  }

  const minPrice = c.p20 !== null && c.p23 !== null ? Math.min(c.p20, c.p23) : c.p20 ?? c.p23;
  const modDiv = senPair(raw, 'mod_div', 'mod_div_sen');

  const capLine = `× 第４表の１の④（1株当たりの資本金等の額）÷ 50円 ＝ ${rv(c.v24)}円（円未満切捨て）`;
  hints['㉔'] = medical
    ? `⑳ ${ryen(c.p20)}\n${capLine}\n医療法人（持分あり）は類似業種が1つなので、㉓とは比べません`
    : `⑳ ${ryen(c.p20)} と ㉓ ${ryen(c.p23)} のうち低い方 ${ryen(minPrice)}\n${capLine}`;
  hints['㉖'] = `㉔ ${rv(c.v24)}円 － ㉕ ${hyen(modDiv)} ＝ ${rv(c.v25)}円（円未満切捨て）`;
  hints['㉚'] = (c.v25 !== null ? `㉖ ${rv(c.v25)}円` : `㉔ ${rv(c.v24)}円`)
    + ` ＋ ㉗ ${hyen(senPair(raw, 'mod_pay', 'mod_pay_sen'))} × ㉘ ${hs(raw('mod_ratio'))}株`
    + `\n÷（1株 ＋ ㉙ ${hs(raw('mod_ratio2'))}株）＝ ${rv(c.v26)}円（円未満切捨て）`;

  return hints;
}
