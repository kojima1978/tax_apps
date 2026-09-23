import { useLayoutEffect, useState } from 'react';

/**
 * 会社名のように「何文字入るか分からない自由入力」を、枠の幅に合わせて縮める。
 *
 * 様式の欄は幅が決まっているので、長い社名は黙って切れる（画面の input は横スクロールで
 * 末尾が隠れ、印刷は overflow:hidden で切り落とされる）。提出物で社名の末尾が消えるのが
 * いちばん困るため、入りきらないぶんだけ字を小さくして1行に収める。
 *
 * 折り返して2行にしないのは、様式の会社名欄が1行ぶんの高さしかないから。2行にすると
 * 1行あたりの高さが半分になり、結局この縮小より小さい字になったうえ原本と見え方も変わる。
 */

/** これ以上小さくすると読めないので止める（そこから先は従来どおり切れる）。 */
export const MIN_FIT_FONT_SIZE = 5;

/** 端で1文字が半分だけ見える状態を避けるための余白（px）。 */
const FIT_MARGIN = 1;

/**
 * 基準サイズ base で幅 natural の文字を、幅 avail の枠に収める文字サイズ。
 * 文字の幅は font-size に比例するので、比をそのまま掛ければよい。
 * 測れなかった（natural=0）ときや元から収まるときは base のまま。
 */
export function fitFontSize(natural: number, avail: number, base: number): number {
  if (!(natural > 0) || !(avail > 0) || natural <= avail) return base;
  return Math.max(MIN_FIT_FONT_SIZE, Math.min(base, (avail / natural) * base));
}

let measureCanvas: HTMLCanvasElement | null = null;

/** font で text を描いたときの幅（px）。canvas を持たない環境では 0。 */
function measureTextWidth(text: string, font: string): number {
  if (typeof document === 'undefined') return 0;
  measureCanvas ??= document.createElement('canvas');
  const ctx = measureCanvas.getContext('2d');
  if (!ctx) return 0;
  ctx.font = font;
  return ctx.measureText(text).width;
}

/**
 * text を1行で収めるための文字サイズと、測る対象につける ref。
 *
 * DOM に複製を置いて測ると、縮めた結果をまた測ってさらに縮める堂々巡りになるので、
 * canvas で「基準サイズなら何pxになるか」を直接測る。枠幅は要素の clientWidth なので
 * font-size を変えても動かない。画面幅や印刷スケールの変化には ResizeObserver で追う。
 *
 * ref を自前で持たず state に入れているのは、印刷の切り替えで input と div が入れ替わるため
 * （ref オブジェクトだと差し替わったことに気づけず、外れた要素を測り続ける）。
 */
export function useFitFontSize(text: string, base: number): {
  ref: (element: HTMLElement | null) => void;
  fontSize: number;
} {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const [fontSize, setFontSize] = useState(base);

  useLayoutEffect(() => {
    if (!element) return;

    const fit = () => {
      const style = window.getComputedStyle(element);
      // font ショートハンドはサイズを含むので、基準サイズに差し替えてから測る
      const font = `${style.fontStyle} ${style.fontWeight} ${base}px ${style.fontFamily}`;
      const avail =
        element.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - FIT_MARGIN;
      setFontSize(fitFontSize(measureTextWidth(text, font), avail, base));
    };
    fit();

    const observer = new ResizeObserver(fit);
    observer.observe(element);
    return () => observer.disconnect();
  }, [element, text, base]);

  return { ref: setElement, fontSize };
}
