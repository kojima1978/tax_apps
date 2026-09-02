import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

/**
 * 印刷中かどうか。
 *
 * 画面には選択中の様式だけを置いている（24様式すべてを隠して置くと、1文字打つたびに
 * 全部を描き直すことになるため）。印刷のときだけ「使用する」様式を全部出す必要があるので、
 * その切り替えをこのフックで持つ。
 *
 * ツールバーからは先に印刷用DOMへ切り替え、レイアウトが済んだ次のフレームで印刷を開く。
 * Ctrl+P の場合だけ `beforeprint` で同期的に切り替える。
 */
export function usePrinting(): { printing: boolean; print: () => void } {
  const [printing, setPrinting] = useState(false);
  const printingRef = useRef(false);
  const firstFrameRef = useRef<number | null>(null);
  const secondFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const before = () => {
      if (printingRef.current) return;
      printingRef.current = true;
      flushSync(() => setPrinting(true));
    };
    const after = () => {
      printingRef.current = false;
      setPrinting(false);
    };
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => {
      if (firstFrameRef.current !== null) cancelAnimationFrame(firstFrameRef.current);
      if (secondFrameRef.current !== null) cancelAnimationFrame(secondFrameRef.current);
      window.removeEventListener('beforeprint', before);
      window.removeEventListener('afterprint', after);
    };
  }, []);

  const print = useCallback(() => {
    if (printingRef.current) return;
    printingRef.current = true;
    setPrinting(true);
    firstFrameRef.current = requestAnimationFrame(() => {
      secondFrameRef.current = requestAnimationFrame(() => window.print());
    });
  }, []);

  return { printing, print };
}
