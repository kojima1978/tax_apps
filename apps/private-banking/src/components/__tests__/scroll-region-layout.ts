import { vi } from "vitest";

type Layout = { scrollWidth: number; clientWidth: number; scrollHeight?: number; clientHeight?: number; overflow?: string };

/**
 * jsdom はレイアウトを持たない（幅はどれも 0・ResizeObserver も無い）ので、ScrollRegion が見る値を差し替える。
 * 返した値の scrollWidth などを書き換えて notifyResize() を呼ぶと、幅が変わったときの動きを確かめられる。
 * 後始末は呼び出し側の afterEach で vi.unstubAllGlobals() と vi.restoreAllMocks()。
 */
export function stubScrollRegionLayout(initial: Layout) {
  const layout = {
    scrollHeight: 100, clientHeight: 100, overflow: "auto", ...initial,
    observed: [] as Element[],
    notifyResize: () => { for (const callback of callbacks) callback(); },
  };
  const callbacks = new Set<() => void>();
  const isRegion = (element: Element) => element.classList.contains("scroll-region");
  for (const key of ["scrollWidth", "clientWidth", "scrollHeight", "clientHeight"] as const) {
    vi.spyOn(HTMLElement.prototype, key, "get").mockImplementation(function (this: HTMLElement) { return isRegion(this) ? layout[key] : 0; });
  }
  const realGetComputedStyle = window.getComputedStyle.bind(window);
  vi.spyOn(window, "getComputedStyle").mockImplementation((element, pseudo) => {
    const style = realGetComputedStyle(element, pseudo);
    // 本物のスタイルは overflowX を書き換えられない（セッターが実体を確かめる）ので、読むときだけ差し替える。
    return isRegion(element) ? new Proxy(style, { get: (target, key) => key === "overflowX" || key === "overflowY" ? layout.overflow : Reflect.get(target, key, target) }) : style;
  });
  vi.stubGlobal("ResizeObserver", class {
    private readonly callback: () => void;
    constructor(callback: () => void) { this.callback = callback; callbacks.add(callback); }
    // 本物と同じく、見張り始めた直後に1回知らせる。
    observe(element: Element) { layout.observed.push(element); this.callback(); }
    unobserve() {}
    disconnect() { callbacks.delete(this.callback); }
  });
  return layout;
}
