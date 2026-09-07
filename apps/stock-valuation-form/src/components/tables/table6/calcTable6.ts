/**
 * 第6表の自動計算（特定の評価会社の株式及び株式に関する権利の価額）。
 *
 * 第4表と同じ方針で、様式の描画（Table6Grid）とは切り離して計算だけをここに集める。
 * 来期の判定予測（lib/nextYearForecast.ts）が④・⑦の式を参照するため、
 * 計算をコンポーネントの中に閉じ込めず外から呼べるようにしている。
 */
import { calcTable2 } from '../table2/Table2Grid';
import { calcTable4 } from '../table4/calcTable4';
import { calcTable5 } from '../table5/Table5Grid';
import { calcShareholderJudgment } from '../Table1_1Grid';
import type { TableProps } from '@/types/form';

const T = 'table6' as const;

const fl = (v: number) => Math.floor(v + 1e-9);
const fl10sen = (v: number) => Math.floor(v * 10 + 1e-7) / 10;
const fl2sen = (v: number) => Math.floor(v * 100 + 1e-7) / 100;

export const numOf = (s: string): number | null => {
  const t = s.replace(/,/g, '').trim();
  if (t === '') return null;
  const n = Number(t);
  return isNaN(n) ? null : n;
};

/**
 * ④ 比準要素数１の会社の株式。
 * 次のうち低い方 ── イ：②（③があるときは③）／ロ：①×0.25＋イ×0.75。
 * 来期に比準要素数１となった場合の試算でも同じ式を使うため関数に切り出している。
 */
export function hijunYoso1Price(comparable: number | null, netAsset: number | null): number | null {
  if (netAsset === null) return null;
  return comparable === null ? fl(netAsset) : fl(Math.min(netAsset, comparable * 0.25 + netAsset * 0.75));
}

/** 第6表の自動計算（お客様サマリー・来期予測からも参照する） */
export function calcTable6(getField: TableProps['getField']) {
  const raw = (f: string) => getField(T, f);
  const num = (f: string) => numOf(raw(f));
  const amountWithSen = (yenField: string, senField: string) => {
    const yen = num(yenField);
    const senText = raw(senField).trim();
    if (yen === null && senText === '') return null;
    if (senText === '') return yen;
    return fl(yen ?? 0) + (numOf(senText) ?? 0) / 100;
  };

  const t4 = calcTable4(getField);
  const t5 = calcTable5(getField);
  const t2 = calcTable2(getField);
  const judge = calcShareholderJudgment(getField);

  // 1. 純資産価額方式等
  const v1 = t4.v28 ?? t4.v27 ?? t4.v26;  // ①
  const v2 = t5['⑪'] ?? null;             // ②
  const v3 = t5['⑫'] ?? null;             // ③（80%相当額）
  const iValue = v3 ?? v2;
  const p4 = hijunYoso1Price(v1, iValue);                // ④
  const p5 = numOf(getField('table8', '㉗'));           // ⑤ 第7表の3の㉗
  const p6 = iValue === null ? null : fl(iValue);        // ⑥
  const p7 = iValue === null ? null : fl(iValue);        // ⑦
  const p8 = v2 === null ? null : fl(v2);                // ⑧
  const baseByResult: Record<number, number | null> = { 1: p4, 2: p5, 3: p6, 4: p7, 5: p8 };
  const base = baseByResult[t2.result] ?? null;

  // 修正（⑩＝base－配当金額、⑭＝(⑩(なければbase)＋⑪×⑫)÷(1株＋⑬)）
  const mod9Div = amountWithSen('mod9_div', 'mod9_div_sen');
  const v10 = base !== null && mod9Div !== null ? fl(base - mod9Div) : null;
  const mod10Pay = num('mod10_pay'), mod10Ratio = num('mod10_ratio'), mod10Ratio2 = num('mod10_ratio2');
  const base14 = v10 ?? base;
  const v14 = base14 !== null && mod10Ratio2 !== null ? fl((base14 + (mod10Pay ?? 0) * (mod10Ratio ?? 0)) / (1 + mod10Ratio2)) : null;
  const jun = v14 ?? v10 ?? base; // 純資産価額方式等の最終価額

  // 2. 配当還元方式（⑮⑯⑰は第4表①②③を初期表示・手入力上書き可）
  const effStr = (own: string, fb: string) => (raw(own).trim() !== '' ? raw(own) : getField('table4', fb));
  const cap = numOf(effStr('⑮', '①'));
  const issued = numOf(effStr('⑯', '②'));
  const treasury = numOf(effStr('⑰', '③'));
  const v18 = cap !== null ? fl(cap * 20) : null; // ⑱=⑮×1000÷50
  const sharesNet = issued !== null ? issued - (treasury ?? 0) : null;
  let v19: number | null = null;
  let v19disp = '';
  if (cap !== null && sharesNet !== null && sharesNet > 0) {
    const v = (cap * 1000) / sharesNet;
    if (fl(v) > 0) { v19 = fl(v); v19disp = v19.toLocaleString('ja-JP'); }
    else { const m = Math.pow(10, String(Math.floor(sharesNet)).length); v19 = Math.floor(v * m + 1e-9) / m; v19disp = String(v19); }
  }
  const t4num = (f: string) => numOf(getField('table4', f));
  const subT4 = (a: string, b: string) => { const x = t4num(a); return x === null ? null : x - (t4num(b) ?? 0); };
  const ia = subT4('f28', 'f29');  // ㋑
  const ro = subT4('f32', 'f33');  // ㋺
  const v23 = ia !== null && ro !== null ? (ia + ro) / 2 : null; // ㉓年平均配当金額
  const v24raw = v23 !== null && v18 !== null && v18 > 0 ? fl10sen((v23 * 1000) / v18) : null; // ㉔切上前
  const v24 = v24raw === null ? null : Math.max(2.5, v24raw);
  const v24Floored = v24raw !== null && v24raw < 2.5;
  const v25 = v24 !== null && v19 !== null ? fl((v24 * v19) / 5) : null; // ㉕=㉔÷10%×⑲÷50円
  const v26 = v25 === null ? null : jun !== null && v25 > jun ? jun : v25; // ㉖

  // 医療法人（持分あり）は配当がないため配当還元方式を適用しない
  const medical = getField('table1_1', 'medical') === '1';
  const mode = raw('hoshiki');
  const useHaito = medical ? false : mode === 'haito' ? true : mode === 'junshisan' ? false : judge.isDozokuFinal === null ? null : !judge.isDozokuFinal;
  const finalPrice = useHaito === null ? null : useHaito ? v26 ?? v25 : jun; // ㉟

  // 3. 権利
  const expDiv = amountWithSen('exp_div', 'exp_div_sen');
  const expTax = amountWithSen('exp_tax', 'exp_tax_sen');
  const v29 = expDiv !== null ? fl2sen(expDiv - (expTax ?? 0)) : null; // ㉙配当期待権
  const baseRight = useHaito === null ? null : useHaito ? v26 ?? v25 : jun; // ⑭(配当還元は㉖)
  const v32 = baseRight !== null ? fl(baseRight - (num('r24_pay') ?? 0)) : null; // ㉜
  const v33 = baseRight === null ? null : fl(baseRight); // ㉝
  const v34 = baseRight; // ㉞

  return {
    t2, t4, t5, judge,
    v1, v2, v3, iValue, p4, p5, p6, p7, p8, base,
    mod9Div, v10, base14, v14,
    jun,                        // 純資産価額方式等の最終価額
    cap, issued, treasury, v18, sharesNet, v19, v19disp,
    ia, ro, v23, v24, v24raw, v24Floored, v25, v26,
    medical, mode, useHaito, finalPrice,
    expDiv, expTax, v29, baseRight, v32, v33, v34,
  };
}
