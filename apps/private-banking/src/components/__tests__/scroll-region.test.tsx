// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ScrollRegion, scrollAxesOf } from "@/components/scroll-region";
import { stubScrollRegionLayout } from "@/components/__tests__/scroll-region-layout";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

const size = (scrollWidth: number, clientWidth: number, scrollHeight = 100, clientHeight = 100) => ({ scrollWidth, clientWidth, scrollHeight, clientHeight });
const auto = { overflowX: "auto", overflowY: "auto" };

describe("scrollAxesOf（どの向きにスクロールできるか）", () => {
  it("中身が枠より広ければ横、高ければ縦、両方なら縦横", () => {
    expect(scrollAxesOf(size(1200, 934), auto)).toBe("x");
    expect(scrollAxesOf(size(934, 934, 900, 500), auto)).toBe("y");
    expect(scrollAxesOf(size(1200, 934, 900, 500), auto)).toBe("xy");
  });

  it("収まっていれば空。1px 未満の端数では「はみ出している」と数えない", () => {
    expect(scrollAxesOf(size(934, 934), auto)).toBe("");
    expect(scrollAxesOf(size(935, 934), auto)).toBe("");
    expect(scrollAxesOf(size(936, 934), auto)).toBe("x");
  });

  // 印刷や、狭い画面でカードに組み替えたときは overflow: visible にしている。
  it("overflow が visible・hidden の向きは、はみ出していてもスクロールできない", () => {
    expect(scrollAxesOf(size(1200, 934), { overflowX: "visible", overflowY: "visible" })).toBe("");
    expect(scrollAxesOf(size(1200, 934, 900, 500), { overflowX: "hidden", overflowY: "auto" })).toBe("y");
  });
});

describe("ScrollRegion（幅に収まらない表の枠）", () => {
  const renderRegion = () => render(<ScrollRegion className="table-scroll" label="年度推移表"><table><tbody><tr><td>行</td></tr></tbody></table></ScrollRegion>);
  const region = (container: HTMLElement) => container.querySelector(".scroll-region") as HTMLElement;

  it("はみ出しているときは Tab で止まり、名前と「横にスクロールできます」を伝える", () => {
    stubScrollRegionLayout({ scrollWidth: 1200, clientWidth: 934 });
    const { container } = renderRegion();
    expect(region(container).tabIndex).toBe(0);
    expect(region(container).getAttribute("role")).toBe("region");
    expect(region(container).getAttribute("aria-label")).toBe("年度推移表。横にスクロールできます");
    expect(region(container).className).toBe("scroll-region table-scroll");
  });

  // 以前は収まっている表でも Tab が止まり、押しても何も起きなかった（止まらない枠もあり、ばらばらだった）。
  it("収まっているときは Tab の停止位置にも領域にもしない", () => {
    stubScrollRegionLayout({ scrollWidth: 934, clientWidth: 934 });
    const { container } = renderRegion();
    expect(region(container).hasAttribute("tabindex")).toBe(false);
    expect(region(container).hasAttribute("role")).toBe(false);
    expect(region(container).hasAttribute("aria-label")).toBe(false);
  });

  it("カードに組み替えた幅（overflow: visible）では、はみ出していても止めない", () => {
    stubScrollRegionLayout({ scrollWidth: 1200, clientWidth: 300, overflow: "visible" });
    const { container } = renderRegion();
    expect(region(container).hasAttribute("tabindex")).toBe(false);
  });

  it("枠や中身の幅が変わったら測り直す", () => {
    const layout = stubScrollRegionLayout({ scrollWidth: 934, clientWidth: 934 });
    const { container } = renderRegion();
    expect(region(container).hasAttribute("tabindex")).toBe(false);
    // 画面を狭めた。
    layout.clientWidth = 600;
    act(() => layout.notifyResize());
    expect(region(container).tabIndex).toBe(0);
    // 列を減らして収まった。
    layout.scrollWidth = 600;
    act(() => layout.notifyResize());
    expect(region(container).hasAttribute("tabindex")).toBe(false);
  });

  it("縦にもはみ出す枠は、向きに合わせて伝える", () => {
    stubScrollRegionLayout({ scrollWidth: 1200, clientWidth: 934, scrollHeight: 900, clientHeight: 500 });
    const { container } = renderRegion();
    expect(region(container).getAttribute("aria-label")).toBe("年度推移表。縦横にスクロールできます");
  });

  it("枠だけでなく中の表も見張る（列の表示設定で表の幅だけが変わる）", () => {
    const layout = stubScrollRegionLayout({ scrollWidth: 934, clientWidth: 934 });
    const { container } = renderRegion();
    expect(layout.observed).toContain(region(container));
    expect(layout.observed).toContain(container.querySelector("table"));
  });
});
