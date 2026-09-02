/**
 * 様式の右上に印刷するQRコードを描くための、モジュール（base64）→ SVGパスの変換。
 *
 * モジュール1個＝1×1の単位で描くので、SVG側は `viewBox="0 0 29 29"` で受ける。
 * 印刷される様式は最大24枚がDOMに載るため、モジュールを `<rect>` で並べると1万個を超える。
 * 1本のパスに畳んだうえで様式IDごとに結果を持ち回る。
 */

import { FORM_QR, QR_SIZE } from '../data/formQr';

/** base64 の1文字が表す6ビット */
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** base64 → 29×29 の真偽値（行優先）。長さが足りない値は null（呼び出し側で描画を諦める） */
function decode(base64: string): boolean[] | null {
  const bits: boolean[] = [];
  for (const ch of base64) {
    const v = B64.indexOf(ch);
    if (v < 0) continue;
    for (let i = 5; i >= 0; i -= 1) bits.push((v >> i & 1) === 1);
  }
  return bits.length >= QR_SIZE * QR_SIZE ? bits.slice(0, QR_SIZE * QR_SIZE) : null;
}

/**
 * 1行の中で続いている暗モジュールは1つの矩形にまとめる。
 * モジュール数の半分ほどが暗いので、まとめるだけでパス長が3割ほど短くなる。
 */
function toPath(bits: boolean[]): string {
  const parts: string[] = [];
  for (let y = 0; y < QR_SIZE; y += 1) {
    let x = 0;
    while (x < QR_SIZE) {
      if (!bits[y * QR_SIZE + x]) { x += 1; continue; }
      let end = x;
      while (end < QR_SIZE && bits[y * QR_SIZE + end]) end += 1;
      parts.push(`M${x} ${y}h${end - x}v1h-${end - x}z`);
      x = end;
    }
  }
  return parts.join('');
}

/** 一度組み立てたパスは使い回す（様式を切り替えるたびに841ビットを畳み直さない） */
const cache = new Map<string, string | null>();

/** 様式IDのQRを描くSVGパス。QRを持たない様式IDは null */
export function formQrPath(formCode: string): string | null {
  const hit = cache.get(formCode);
  if (hit !== undefined) return hit;
  const base64 = FORM_QR[formCode];
  const bits = base64 === undefined ? null : decode(base64);
  const path = bits === null ? null : toPath(bits);
  cache.set(formCode, path);
  return path;
}

/** テスト用。QRのモジュールをそのまま取り出す */
export function formQrModules(formCode: string): boolean[] | null {
  const base64 = FORM_QR[formCode];
  return base64 === undefined ? null : decode(base64);
}
