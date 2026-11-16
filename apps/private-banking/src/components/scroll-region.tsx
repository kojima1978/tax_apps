"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** 枠の中身がはみ出していて、利用者がスクロールできる向き。 */
export type ScrollAxes = "" | "x" | "y" | "xy";

type Measurable = Pick<HTMLElement, "scrollWidth" | "clientWidth" | "scrollHeight" | "clientHeight">;
type Overflow = { overflowX: string; overflowY: string };

// 端数の幅（1px 未満）で「はみ出している」と数えない。
const TOLERANCE = 1;
const scrolls = (overflow: string) => overflow === "auto" || overflow === "scroll";

/**
 * 枠がどの向きにスクロールできるか。
 * overflow が visible の間（印刷・狭い画面でカードに組み替えたとき）は、はみ出していてもスクロールはできない。
 */
export function scrollAxesOf(element: Measurable, style: Overflow): ScrollAxes {
  const x = scrolls(style.overflowX) && element.scrollWidth > element.clientWidth + TOLERANCE;
  const y = scrolls(style.overflowY) && element.scrollHeight > element.clientHeight + TOLERANCE;
  return `${x ? "x" : ""}${y ? "y" : ""}` as ScrollAxes;
}

const hints: Record<Exclude<ScrollAxes, "">, string> = { x: "横にスクロールできます", y: "縦にスクロールできます", xy: "縦横にスクロールできます" };

/**
 * 幅に収まらない表を入れる枠。横スクロールの枠はすべてこれを通す。
 *
 * - はみ出している間だけ Tab で止まり（tabIndex）、矢印キーでスクロールできる。読み上げには「◯◯。横にスクロールできます」と伝える。
 *   収まっている間は何も足さない（止まっても何も起きない Tab の停止位置と、意味の無い領域を増やさない）
 * - position: relative を持つ。中の sr-only（position: absolute）が枠の外の祖先を基準に置かれて、
 *   ページごと横にスクロールできてしまうのを防ぐ
 *
 * overflow そのものは className 側の CSS が決める（画面幅・印刷で切り替えるため）。
 */
export function ScrollRegion({ label, className, children }: { label: string; className: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [axes, setAxes] = useState<ScrollAxes>("");

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const measure = () => setAxes(scrollAxesOf(element, window.getComputedStyle(element)));
    // 枠の幅（画面幅・サイドバーの開閉）と中身の幅（列の表示設定・行の増減）のどちらが変わっても測り直す。
    // observe は始めた直後にも1回知らせてくるので、最初の計測もこれで済む。
    const resize = new ResizeObserver(measure);
    const observeAll = () => { resize.observe(element); for (const child of element.children) resize.observe(child); };
    observeAll();
    // 中身が入れ替わったら（読み込み中の表示 → 表）、新しい中身も見る。
    const mutation = new MutationObserver(observeAll);
    mutation.observe(element, { childList: true });
    return () => { resize.disconnect(); mutation.disconnect(); };
  }, []);

  const scrollable = axes !== "";
  return <div
    ref={ref}
    className={`scroll-region ${className}`}
    {...(scrollable ? { role: "region", "aria-label": `${label}。${hints[axes]}`, tabIndex: 0 } : {})}
  >{children}</div>;
}
