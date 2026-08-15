import { useCallback, useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

/**
 * 印刷中かどうか。
 *
 * 画面には選択中の様式だけを置いている（24様式すべてを隠して置くと、1文字打つたびに
 * 全部を描き直すことになるため）。印刷のときだけ「使用する」様式を全部出す必要があるので、
 * その切り替えをこのフックで持つ。
 *
 * ブラウザは `beforeprint` の後に紙面を組むので、そこで `flushSync` して描き切れば
 * ツールバーの印刷ボタンからでも Ctrl+P からでも同じ経路に乗る。
 */
export function usePrinting(): { printing: boolean; print: () => void } {
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    const before = () => { flushSync(() => setPrinting(true)); };
    const after = () => setPrinting(false);
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => {
      window.removeEventListener('beforeprint', before);
      window.removeEventListener('afterprint', after);
    };
  }, []);

  // React のイベント処理の中から flushSync を呼ばないよう、一拍おいてから印刷を始める
  const print = useCallback(() => { setTimeout(() => window.print(), 0); }, []);

  return { printing, print };
}
