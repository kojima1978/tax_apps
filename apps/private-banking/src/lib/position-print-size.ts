/**
 * 資産・負債一覧を印刷するときの文字の段階。
 *
 * 紙の幅（A4 横 277mm）は固定で、相続人の列だけが人数ぶん増える。列が少ない顧客まで
 * 一番狭い場合に合わせた 7px で刷ると読みにくいので、相続人の人数で2段階に分ける。
 *
 * 境目の根拠（2026-11-17、33明細と20明細の顧客で相続人の列を 3〜10 人へ増やして実測）:
 * - 8px にしても、相続人8人（列の幅 17.6mm）までは金額のはみ出し 0・折り返しの数も 7px と同じ。
 *   10人（14.7mm）で金額がはみ出した
 * - 6人なら列の幅は 22.0mm あり、8px で 100億円台の金額（「10,000,000,000」）でも1行に収まる。
 *   7人（19.5mm）以上は余裕が無いので 7px のまま
 * - 文字だけ 8px にすると 33明細の顧客が 7→8 ページに増えたが、同時に相続人の列の見出しの
 *   補足（画面用の 11px のまま刷られていた）を本文より小さくしたので、増える顧客は無くなった
 *   （10顧客のうち、33明細の顧客は 7 ページのまま・1顧客は 5→4・ほかは同じ）
 */
export const LARGE_PRINT_MAX_HEIRS = 6;

export type PositionPrintSize = "large" | "standard";

export function positionPrintSize(heirCount: number): PositionPrintSize {
  return heirCount <= LARGE_PRINT_MAX_HEIRS ? "large" : "standard";
}
