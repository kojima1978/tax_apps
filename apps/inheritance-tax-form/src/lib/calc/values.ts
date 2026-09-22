/**
 * 数値と単位の変換。様式の欄は文字列で持ち、計算のときだけ数値に直す。
 *
 * 様式には末尾の「000」「00」があらかじめ印字されている欄がある（⑥・Ⓑ・⑦・⑰・⑳・㉑・㉔）。
 * これらは切り捨て後の上位桁だけを記入する欄なので、状態にも上位桁だけを保持し、
 * 計算に使うときだけ SCALE 倍して円に戻す。表示と保存が様式の記載どおりに揃う。
 */

import { TABLE6_COLS } from '../../forms/table6';

export type Values = Record<string, string>;

/**
 * 第6表② 控除額と、その計。様式に「0,000」まで印字されているので万円単位で保持する。
 * 未成年者（m）・障害者（d）の各3列＋計で8欄あるので、キーは組み立てて作る。
 */
const TABLE6_SCALE = Object.fromEntries(
  ['m', 'd'].flatMap((k) => [
    `t6${k}T2`,
    ...Array.from({ length: TABLE6_COLS }, (_, i) => `t6${k}${i}v2`),
  ]).map((key) => [key, 10000]),
);

/** 上位桁のみ記入する欄（値 × SCALE ＝ 円） */
export const SCALE: Record<string, number> = {
  ...TABLE6_SCALE,
  v6: 1000,      // ⑥ 課税価格（1,000円未満切捨て）
  tB: 1000000,   // Ⓑ 遺産に係る基礎控除額
  t7: 100,       // ⑦ 相続税の総額 ＝ 第2表⑧
  t11: 100,      // 第2表⑪ 相続税の総額（農業投資価格による）
  v17: 100,      // ⑰ 相続時精算課税分の贈与税額控除額
  v20: 100,      // ⑳ 納税猶予税額
  v21: 100,      // ㉑ 申告期限までに納付すべき税額
  v24: 100,      // ㉔ 納税猶予税額（この修正前の）
  t15v38: 1000,  // 第15表㊳ 課税価格（1,000円未満切捨て）
  t5s1v6: 1000,  // 第5表⑥ 配偶者の税額軽減額を計算する場合の課税価格（1,000円未満切捨て）
  t5s2v6: 1000,  // 第5表⑯ 同上（農業相続人がいる場合）
  t5a3: 1000,    // 第5表 第3表のⒶの金額（課税価格の合計額）
  t5v17: 100,    // 第5表⑰ 第3表の⑦の金額（相続税の総額）
  t9A: 1000000,  // 第9表Ⓐ 保険金の非課税限度額（百万円単位で記入する）
  t10A: 1000000, // 第10表Ⓐ 退職手当金などの非課税限度額（百万円単位で記入する）
  // 第2表①②③欄
  k2: 1000,      // ㋭ 第3表の課税価格の合計額
  k4: 10000,     // ㋩ 遺産に係る基礎控除額（万円単位で記入する）
  k5: 1000,      // ㋥ 課税遺産総額
  k6: 1000,      // ㋬ 農業投資価格による課税遺産総額
};

/** 文字列（カンマ・△付き）を数値に。空欄は 0。 */
export function num(v: string | undefined): number {
  if (!v) return 0;
  const raw = v.replace(/,/g, '').replace(/△/g, '-').trim();
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

/** 数値を欄の保存形式（符号なし整数文字列）に。0 は空欄のままにせず 0 を表示する。 */
export function str(n: number): string {
  return String(Math.trunc(n));
}

/** 還付欄など △ を許す欄の保存形式 */
export function signed(n: number): string {
  const t = Math.trunc(n);
  return t < 0 ? `△${Math.abs(t)}` : String(t);
}

/** 円に戻した値を取り出す（上位桁のみの欄は SCALE 倍） */
export function yen(values: Values, key: string): number {
  return num(values[key]) * (SCALE[key] ?? 1);
}

/** 「入力されているか」— 0 と未入力を区別する（⑩の有無で⑯の算式が変わるため） */
export function filled(values: Values, key: string): boolean {
  return (values[key] ?? '').trim() !== '';
}

/** 100円未満切捨て（黒字のときのみ。赤字はそのまま） */
export function truncHundred(n: number): number {
  return n > 0 ? Math.floor(n / 100) * 100 : n;
}

/**
 * 小数のまま扱う値の表示形。
 * 掛け算の結果は 1.1 × 0.98 = 1.0780000000000001 のように誤差が出るので、
 * 倍数として意味のある桁で丸めてから文字にする。
 */
export function decimal(n: number): string {
  return String(Number(n.toFixed(10)));
}

/** 面積欄の保存形式（小数第2位まで）。0 は空欄にする。 */
export function area(n: number): string {
  return n === 0 ? '' : n.toFixed(2);
}
