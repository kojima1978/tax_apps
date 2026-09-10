import { useEffect, type RefObject } from 'react';

/**
 * 要素の高さを CSS 変数（ルート要素）へ書き出す。
 *
 * 上端に貼り付けた帯の下へ別の帯を重ねる、見出しのスクロール位置を帯の下端に合わせる、
 * といった「他所の高さ」に依存する寸法のために使う。帯の高さはボタンの折り返しで変わるので、
 * CSS に固定値を置くとどこかの画面幅で必ずずれる。実測を渡して calc() で組み立てる。
 */
export function useHeightVar(ref: RefObject<HTMLElement | null>, name: string) {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const write = () => {
      document.documentElement.style.setProperty(name, `${Math.round(element.getBoundingClientRect().height)}px`);
    };
    write();

    const observer = new ResizeObserver(write);
    observer.observe(element);
    return () => {
      observer.disconnect();
      // 消えた要素の高さが残ると、次に描くものの位置がずれる（CSS 側の既定値に戻す）
      document.documentElement.style.removeProperty(name);
    };
  }, [ref, name]);
}
