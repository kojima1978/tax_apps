import { useEffect, useState } from "react";
import { flushSync } from "react-dom";

/**
 * 印刷中かどうか。ページ送りで隠れている行も紙には全部出すために、一覧の画面が使う。
 * beforeprint の中で描き直しを終わらせる（flushSync）── そうしないと、印刷は描き直す前の
 * 画面（今のページのぶんだけ）で始まってしまう。
 */
export function usePrinting() {
  const [printing, setPrinting] = useState(false);
  useEffect(() => {
    const before = () => flushSync(() => setPrinting(true));
    const after = () => setPrinting(false);
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => { window.removeEventListener("beforeprint", before); window.removeEventListener("afterprint", after); };
  }, []);
  return printing;
}
