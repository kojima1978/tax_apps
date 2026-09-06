/**
 * 第7表の自動計算（S1の類似業種比準価額）。
 *
 * 令和8年様式で旧第7表は「第7表の1」「第7表の2」に分けたが、計算はここの1本に集めている。
 * 第7表の3（旧第8表）もここを参照するため、様式の描画とは切り離しておく。
 */
import { calcTable4 } from '../table4/calcTable4';
import { calcTable5 } from '../table5/Table5Grid';
import { calcCompanySize } from '../table1-2/Table1_2Grid';
import type { TableProps } from '@/types/form';
import { forcesSmallCompany } from '@/lib/valuationPurpose';

// ── 端数処理（第7表記載要領＝第4表の記載方法等4に準ずる） ──
const fl = (v: number) => Math.floor(v + 1e-9);                 // 円未満切捨て
const fl10sen = (v: number) => Math.floor(v * 10 + 1e-7) / 10;  // 10銭未満切捨て
const fl2 = (v: number) => Math.floor(v * 100 + 1e-7) / 100;    // 小数点以下2位未満切捨て
const fl3 = (v: number) => Math.floor(v * 1000 + 1e-7) / 1000;  // 小数点以下3位未満切捨て


/** 第7表のS1比準価額計算（第8表からも参照する） */
export function calcTable7(getField: TableProps['getField']) {
  const raw = (f: string) => getField('table7', f);
  const parseNum = (value: string): number | null => {
    const s = value.replace(/,/g, '').trim();
    if (s === '') return null;
    const v = Number(s);
    return isNaN(v) ? null : v;
  };
  const num = (f: string) => parseNum(raw(f));
  const senPair = (y: string, s: string) => { const a = num(y); return a === null ? null : a + (num(s) ?? 0) / 100; };

  const t4 = calcTable4(getField);
  const t5 = calcTable5(getField);
  const size = calcCompanySize((f) => getField('table1_2', f), forcesSmallCompany(getField)).result;
  const shin = size === null ? null : size === 4 ? 0.7 : size === 0 ? 0.5 : 0.6;

  // ⑴ 受取配当金等収受割合 ㋩ ＝ ㋑÷(㋑＋㋺)（小数3位未満切捨て、上限1）
  const r10 = num('f10'), r11 = num('f11');
  const ia = r10 === null && r11 === null ? null : (r10 ?? 0) + (r11 ?? 0);   // ㋑
  const o13 = num('f13'), o14 = num('f14');
  const ro = o13 === null && o14 === null ? null : (o13 ?? 0) + (o14 ?? 0);   // ㋺
  const denom = (ia ?? 0) + (ro ?? 0);
  const ha = ia !== null && denom > 0 ? Math.min(1, fl3(ia / denom)) : null;  // ㋩

  // Ⓑ－ⓑ（年配当・円/銭）: ③=第4表Ⓑ, ④=ⓑ=③×㋩, ⑤=③－④
  const Bv = t4.Bv;
  const lowerB = Bv !== null && ha !== null ? fl10sen(Bv * ha) : null;        // ④ ⓑ
  const adjB = Bv !== null && lowerB !== null ? fl10sen(Bv - lowerB) : null;  // ⑤

  // 🄫－©（年利益・円）: ⑥=第4表Ⓒ, ⑦=©=⑥×㋩, ⑧=⑥－⑦
  const Cv = t4.Cv;
  const lowerC = Cv !== null && ha !== null ? fl(Cv * ha) : null;             // ⑦ ©
  const adjC = Cv !== null && lowerC !== null ? Cv - lowerC : null;           // ⑧

  // Ⓓ－ⓓ（純資産・円）
  const Dv = t4.Dv;                                                          // ⑨ 第4表Ⓓ
  const kabuBook: number | null = t5['ロ'] ?? null;                         // ⑩ 株式等帳簿価額（第5表ロ・直接連動）
  const totalBook: number | null = num('⑪') ?? t5['②'] ?? null;            // ⑪ 総資産帳簿価額（第5表②）
  const iKin = Dv !== null && kabuBook !== null && totalBook !== null && totalBook > 0
    ? fl(Dv * (kabuBook / totalBook)) : null;                                // ⑫ (イ)
  const ekiseki = parseNum(getField('table4', 'n53'));                       // ⑬ 利益積立金額（第4表⑱直前期）
  const shares50 = t4.cap5;                                                   // ⑭ 第4表⑤株式数
  // ⑬は千円・⑮は円なので、株数で割る前に千円→円へ直す（第4表の per50 と同じ換算）
  const roKin = ekiseki !== null && shares50 !== null && shares50 > 0 && ha !== null
    ? fl(((ekiseki * 1000) / shares50) * ha) : null;                          // ⑮ (ロ)
  const lowerDraw = iKin === null && roKin === null ? null : (iKin ?? 0) + (roKin ?? 0);
  const lowerD = lowerDraw === null ? null : Dv !== null ? Math.min(lowerDraw, Dv) : lowerDraw; // ⑯ ⓓ（⑨上限）
  const adjD = Dv !== null && lowerD !== null ? Dv - lowerD : null;           // ⑰

  // ⑵ S1の類似業種比準価額。
  // 類似業種側の株価A・B・C・Dは第4表の2からの転記だが、評価会社側の要素は第4表のⒷⒸⒹではなく、
  // 受取配当金等収受割合で減額した後の⑤⑧⑰（Ⓑ－ⓑ／Ⓒ－ⓒ／Ⓓ－ⓓ）を使う（様式の欄名のとおり）
  const t4num = (f: string) => parseNum(getField('table4', f));
  const t4senPair = (y: string, s2: string) => { const a = t4num(y); return a === null ? null : a + (t4num(s2) ?? 0) / 100; };
  const A1 = t4.A1;             // 第4表⑳ → 第7表⑱
  const A2 = t4.A2;             // 第4表㉓ → 第7表㉑
  const elem = (v: number | null, base: number | null) => (v !== null && base !== null && base > 0 ? fl2(v / base) : null);
  // 医療法人（持分あり）は配当要素を除いた2要素で比準割合を出す（評価通達194-2。第4表と同じ扱い）
  const medical = getField('table1_1', 'medical') === '1';
  const e1B = elem(adjB, t4senPair('r1sB1', 'r1sB2')), e1C = elem(adjC, t4num('r1sC')), e1D = elem(adjD, t4num('r1sD'));
  // 医療法人は類似業種を1つだけ選んで評価するため、2つ目のブロック（㉑～㉓）は使わない
  const e2B = medical ? null : elem(adjB, t4senPair('r2sB1', 'r2sB2'));
  const e2C = medical ? null : elem(adjC, t4num('r2sC'));
  const e2D = medical ? null : elem(adjD, t4num('r2sD'));
  const ratio3 = (a: number | null, b: number | null, d: number | null) => (
    medical
      ? (b !== null && d !== null ? fl2((b + d) / 2) : null)
      : (a !== null && b !== null && d !== null ? fl2((a + b + d) / 3) : null)
  );
  const r19 = ratio3(e1B, e1C, e1D);  // ⑲
  const r22 = ratio3(e2B, e2C, e2D);  // ㉒
  const price = (A: number | null, r: number | null) => (A !== null && r !== null && shin !== null ? fl10sen(A * r * shin) : null);
  const p20 = price(A1, r19), p23 = price(A2, r22);   // ⑳・㉓
  const minP = p20 !== null && p23 !== null ? Math.min(p20, p23) : p20 ?? p23;
  const v24 = minP !== null && t4.cap4 !== null ? fl((minP * t4.cap4) / 50) : null; // ㉔

  // 比準価額の修正
  const modDiv = senPair('mod_div', 'mod_div_sen');
  const v25 = v24 !== null && modDiv !== null ? fl(v24 - modDiv) : null;       // ㉕
  const modPay = senPair('mod_pay', 'mod_pay_sen'), modRatio = num('mod_ratio'), modRatio2 = num('mod_ratio2');
  const base26 = v25 ?? v24;
  const v26 = base26 !== null && modRatio2 !== null ? fl((base26 + (modPay ?? 0) * (modRatio ?? 0)) / (1 + modRatio2)) : null; // ㉖

  // S1の比準価額（修正後があればそれ、なければ㉔）
  const s1Hijun = v26 ?? v25 ?? v24;

  return {
    ia, ro, ha, Bv, lowerB, adjB, Cv, lowerC, adjC, Dv, kabuBook, totalBook, iKin, ekiseki, shares50, roKin, lowerD, adjD,
    A1, A2, e1B, e1C, e1D, e2B, e2C, e2D, r19, r22, p20, p23, v24, v25, v26, shin, size, s1Hijun,
  };
}

/** 第7表（CSSグリッド方式・完成版） */
