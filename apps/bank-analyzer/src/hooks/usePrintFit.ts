// 印刷のときだけ、表を用紙の印刷できる幅へ縮める。
// 表の幅は中身（通帳有無一覧なら年数）で変わるので、@media print の CSS だけでは決められない。
// 印刷の直前に表の本来の幅を測って zoom を掛け、終わったら外す。
// 用紙より狭い表は縮めない（拡大もしない）。

import { useEffect, type RefObject } from 'react';

const PX_PER_MM = 96 / 25.4;

/** 本来の幅 widthPx の表を printableMm へ収める倍率（1 を超えない） */
export function printFitScale(widthPx: number, printableMm: number): number {
  if (!(widthPx > 0)) return 1;
  return Math.min(1, (printableMm * PX_PER_MM) / widthPx);
}

/**
 * @param wrapper 縮める箱（zoom を掛ける先）
 * @param printableMm 用紙の印刷できる幅（@page の用紙幅 − 左右の余白）
 */
export function usePrintFit(wrapper: RefObject<HTMLElement | null>, printableMm: number) {
  useEffect(() => {
    const before = () => {
      const el = wrapper.current;
      const table = el?.querySelector('table');
      if (!el || !table) return;
      // 画面では w-full で箱いっぱいに引き伸ばされているので、中身なりの幅に戻して測る
      const prev = table.style.width;
      table.style.width = 'max-content';
      // 印刷の直前はまだ画面の見た目なので、印刷では消える列（print:hidden の見出し）のぶんを引く
      const hidden = [...table.querySelectorAll<HTMLElement>('thead tr:first-child > .print\\:hidden')]
        .reduce((sum, th) => sum + th.offsetWidth, 0);
      const width = table.offsetWidth - hidden;
      table.style.width = prev;
      el.style.zoom = String(printFitScale(width, printableMm));
    };
    const after = () => {
      if (wrapper.current) wrapper.current.style.zoom = '';
    };
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => {
      window.removeEventListener('beforeprint', before);
      window.removeEventListener('afterprint', after);
    };
  }, [wrapper, printableMm]);
}
