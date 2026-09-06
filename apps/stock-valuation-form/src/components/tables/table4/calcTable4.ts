/**
 * 第4表の自動計算（類似業種比準価額）。
 *
 * 令和8年様式で旧第4表は「第4表の1」「第4表の2」に分けたが、計算はここの1本に集めている。
 * 第2・3・6・7表やお客様サマリーもここを参照するため、様式の描画とは切り離しておく。
 */
import { calcCompanySize } from '../table1-2/Table1_2Grid';
import type { TableProps } from '@/types/form';
import { forcesSmallCompany } from '@/lib/valuationPurpose';

// ── 端数処理（第4表記載要領） ──
const fl = (v: number) => Math.floor(v + 1e-9);                 // 円未満切捨て
const fl10sen = (v: number) => Math.floor(v * 10 + 1e-7) / 10;  // 10銭未満切捨て
const fl2 = (v: number) => Math.floor(v * 100 + 1e-7) / 100;    // 小数点以下2位未満切捨て

/** 第4表の自動計算（第3表の①などからも参照する） */
export function calcTable4(getField: TableProps['getField']) {
  const raw = (f: string) => getField('table4', f);
  const parseNum = (value: string): number | null => {
    const s = value.replace(/,/g, '').trim();
    if (s === '') return null;
    const v = Number(s);
    return isNaN(v) ? null : v;
  };
  const num = (f: string) => parseNum(raw(f));

  // 1. 資本金等
  const cap = num('①');                         // 千円
  // ②発行済株式数＝第1表の1の⑤（評価会社の発行済株式数）を転記
  const issued = parseNum(getField('table1_1', '⑤'));
  const treasuryShares = parseNum(
    getField('table1_1', 'f63') || getField('table1_1', 'treasury_shares'),
  );
  const sharesNet = issued !== null ? issued - (treasuryShares ?? 0) : null; // ②－③
  // ④: 円未満切捨て。切捨てで0となる場合は発行済株式数(②－③)の桁数の小数位未満を切捨てて記載（記載要領の端数処理の例）
  let cap4: number | null = null;
  let cap4disp = '';
  if (cap !== null && sharesNet !== null && sharesNet > 0) {
    const v = (cap * 1000) / sharesNet;
    if (fl(v) > 0) {
      cap4 = fl(v);
      cap4disp = cap4.toLocaleString('ja-JP');
    } else {
      const m = Math.pow(10, String(Math.floor(sharesNet)).length);
      cap4 = Math.floor(v * m + 1e-9) / m;
      cap4disp = String(cap4);
    }
  }
  const cap5 = cap !== null ? fl(cap * 20) : null; // ⑤株 = ①×1000÷50
  const per50 = (kc: number | null) => (kc !== null && cap5 !== null && cap5 > 0 ? (kc * 1000) / cap5 : null); // 千円→1株50円当たり円

  // 医療法人（持分あり）: 剰余金の配当が禁止のため配当要素（Ⓑ/B）を除外して評価する
  // （評価通達194-2。第1表の1のチェックで切替）
  const medical = getField('table1_1', 'medical') === '1';

  // 2. 配当（⑧=⑥-⑦, ⑨⑩=2年平均, B=10銭未満切捨て）
  // 医療法人は⑥⑦を入力させないので、⑧（㋑㋺㋩）・⑨⑩からⒷ1・Ⓑ2・Ⓑまで一括で記載しない
  const sub = (a: string, b: string) => { const x = num(a); return x === null ? null : x - (num(b) ?? 0); };
  const i1 = medical ? null : sub('f28', 'f29');
  const i2 = medical ? null : sub('f32', 'f33');
  const i3 = medical ? null : sub('f36', 'f37');
  const avg = (a: number | null, b: number | null) => (a !== null && b !== null ? (a + b) / 2 : null);
  const v9 = avg(i1, i2), v10 = avg(i2, i3);
  const b1 = per50(v9) !== null ? fl10sen(per50(v9)!) : null;
  const b2 = per50(v10) !== null ? fl10sen(per50(v10)!) : null;
  const Bv = b1;

  // 2. 利益（⑯=⑪-⑫+⑬-⑭+⑮, C=単年と2年平均の低い方・円未満切捨て）
  const profit = (a: string, b: string, c: string, d: string, e: string) => {
    const x = num(a);
    return x === null ? null : x - (num(b) ?? 0) + (num(c) ?? 0) - (num(d) ?? 0) + (num(e) ?? 0);
  };
  const p1 = profit('e18', 'e19', 'e20', 'e21', 'e22');
  const p2 = profit('e25', 'e26', 'e27', 'e28', 'e29');
  const p3 = profit('e32', 'e33', 'e34', 'e35', 'e36');
  // C1/C2は単年か2年平均かを納税者が選択（既定は低い方を自動選択）
  const pickProfit = (single: number | null, two: number | null, mode: string) =>
    mode === 'single' ? single : mode === 'avg' ? two : single === null ? null : two === null ? single : Math.min(single, two);
  const pickProfitSide = (single: number | null, two: number | null, mode: string): 'left' | 'right' | undefined => {
    if (mode === 'single') return 'left';
    if (mode === 'avg') return 'right';
    if (single === null && two === null) return undefined;
    if (single === null) return 'right';
    if (two === null) return 'left';
    return single <= two ? 'left' : 'right';
  };
  const avg12 = p1 !== null && p2 !== null ? (p1 + p2) / 2 : null;
  const avg23 = p2 !== null && p3 !== null ? (p2 + p3) / 2 : null;
  const c1base = pickProfit(p1, avg12, raw('c1_mode'));
  const c1baseSide = pickProfitSide(p1, avg12, raw('c1_mode'));
  const c2base = pickProfit(p2, avg23, raw('c2_mode'));
  const c2baseSide = pickProfitSide(p2, avg23, raw('c2_mode'));
  // C1・C2・Ⓒが負数のときは0（記載要領3⑷⑸の注）
  const c1 = per50(c1base) !== null ? Math.max(0, fl(per50(c1base)!)) : null;
  const c2 = per50(c2base) !== null ? Math.max(0, fl(per50(c2base)!)) : null;
  const Cv = c1;

  // 2. 純資産（⑲=⑰+⑱, D=円未満切捨て）
  const na = (a: string, b: string) => { const x = num(a), y = num(b); return x === null && y === null ? null : (x ?? 0) + (y ?? 0); };
  const retained1 = num('n53');
  const t1 = cap === null && retained1 === null ? null : (cap ?? 0) + (retained1 ?? 0);
  const t2 = na('n56', 'n57');
  // D1・D2が負数のときは0（記載要領3⑺の注）
  const d1 = per50(t1) !== null ? Math.max(0, fl(per50(t1)!)) : null;
  const d2 = per50(t2) !== null ? Math.max(0, fl(per50(t2)!)) : null;
  const Dv = d1;

  // 3. 類似業種比準価額（A=最低株価, 割合=2位未満切捨て, 価額=10銭未満切捨て）
  const minOf = (fs: string[]) => { const vs = fs.map(num).filter((v): v is number => v !== null); return vs.length ? Math.min(...vs) : null; };
  const A1 = minOf(['㋷', '㋦', '㋸', '㋾', '㋻']);
  const A2 = minOf(['㋕', '㋵', '㋟', '㋹', '㋞']);
  const senPair = (y: string, s: string) => { const a = num(y); return a === null ? null : a + (num(s) ?? 0) / 100; };
  const elem = (v: number | null, base: number | null) => (v !== null && base !== null && base > 0 ? fl2(v / base) : null);
  // 比準割合: 通常は（Ⓑ/B＋Ⓒ/C＋Ⓓ/D）÷3。医療法人は配当要素を除いた（Ⓒ/C＋Ⓓ/D）÷2
  const ratio3 = (a: number | null, b: number | null, c: number | null) => (
    medical
      ? (b !== null && c !== null ? fl2((b + c) / 2) : null)
      : (a !== null && b !== null && c !== null ? fl2((a + b + c) / 3) : null)
  );
  // 斟酌率: 第1表の2の会社規模から自動連動（大0.7/中0.6/小0.5）
  const size = calcCompanySize((f) => getField('table1_2', f), forcesSmallCompany(getField)).result;
  const shin = size === null ? null : size === 4 ? 0.7 : size === 0 ? 0.5 : 0.6;
  const e1B = elem(Bv, senPair('r1sB1', 'r1sB2')), e1C = elem(Cv, num('r1sC')), e1D = elem(Dv, num('r1sD'));
  // 医療法人は類似業種を1つだけ選んで評価するため、2つ目のブロック（㉓～㉕）は使わない
  const e2B = medical ? null : elem(Bv, senPair('r2sB1', 'r2sB2'));
  const e2C = medical ? null : elem(Cv, num('r2sC'));
  const e2D = medical ? null : elem(Dv, num('r2sD'));
  const r21 = ratio3(e1B, e1C, e1D); // ㉑
  const r24 = ratio3(e2B, e2C, e2D); // ㉔
  const price = (A: number | null, r: number | null) => (A !== null && r !== null && shin !== null ? fl10sen(A * r * shin) : null);
  const p22 = price(A1, r21), p25 = price(A2, r24);
  const minP = p22 !== null && p25 !== null ? Math.min(p22, p25) : p22 ?? p25;
  const v26 = minP !== null && cap4 !== null ? fl((minP * cap4) / 50) : null;

  // 比準価額の修正: ㉗=㉖－1株当たりの配当金額、㉘=(㉗(ないときは㉖)＋払込金額×割当株式数)÷(1＋割当・交付株式数)
  const modDiv = senPair('mod_div', 'mod_div_sen');
  const v27 = v26 !== null && modDiv !== null ? fl(v26 - modDiv) : null;
  const modPay = senPair('mod_pay', 'mod_pay_sen'), modRatio = num('mod_ratio'), modRatio2 = num('mod_ratio2');
  const base28 = v27 ?? v26;
  const v28 = base28 !== null && modRatio2 !== null ? fl((base28 + (modPay ?? 0) * (modRatio ?? 0)) / (1 + modRatio2)) : null;

  return { issued, treasuryShares, cap4, cap4disp, cap5, i1, i2, i3, v9, v10, b1, b2, Bv, p1, p2, p3, c1, c1baseSide, c2, c2baseSide, Cv, t1, t2, d1, d2, Dv, A1, A2, e1B, e1C, e1D, e2B, e2C, e2D, r21, r24, size, shin, p22, p25, v26, v27, v28 };
}
