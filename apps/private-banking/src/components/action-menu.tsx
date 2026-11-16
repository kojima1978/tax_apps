"use client";

import { LoaderCircle, MoreHorizontal, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { type KeyboardEvent, type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";

/** メニューの1項目。画面移動は `href`、その場の操作は `onSelect` で指定する。`className` は画面幅による出し分けなどに使う。 */
export type ActionMenuItem = { key: string; label: string; icon: LucideIcon; danger?: boolean; className?: string } & (
  | { href: string; onSelect?: never }
  | { onSelect: () => void; href?: never }
);

const MENU_GAP = 4;
const MENU_MARGIN = 8;

type MenuPlacement = { top: number | null; bottom: number | null; right: number; maxHeight: number };

/**
 * メニューを出す位置（画面の左上を原点にした position: fixed の値）。
 * ボタンの下に全部入ればそこへ、入らなければ上下の広い方へ出す。それでも入らない分は maxHeight で縦スクロールさせる。
 * 右端はボタンの右端にそろえ、狭い画面で左へはみ出すときだけ内側へ寄せる。
 */
export function menuPlacement(trigger: { top: number; bottom: number; right: number }, menu: { width: number; height: number }, viewport: { width: number; height: number }): MenuPlacement {
  const below = viewport.height - trigger.bottom - MENU_GAP - MENU_MARGIN;
  const above = trigger.top - MENU_GAP - MENU_MARGIN;
  const right = Math.max(MENU_MARGIN, Math.min(viewport.width - trigger.right, viewport.width - menu.width - MENU_MARGIN));
  return menu.height <= below || below >= above
    ? { top: trigger.bottom + MENU_GAP, bottom: null, right, maxHeight: Math.max(below, 0) }
    : { top: null, bottom: viewport.height - trigger.top + MENU_GAP, right, maxHeight: Math.max(above, 0) };
}

const px = (value: number | null) => value === null ? "auto" : `${value}px`;

/**
 * 「⋯」などのボタンから開く操作メニュー。開いたら先頭の項目へフォーカスし、
 * Escape・外側のクリックで閉じる。上下矢印で項目間を移動できる。
 *
 * メニューは画面に対して置く（position: fixed）。ボタンの下へ absolute で出していた頃は、
 * 横スクロールの枠の中の表（年度一覧）で枠に切り取られて2項目めが見えず、
 * 一覧の最後の行では画面の下へはみ出していた。画面がスクロールされたら、ボタンから離れてしまうので閉じる。
 */
export function ActionMenu({ id, label, items, heading, busy = false, loading = false, trigger, triggerClassName = "icon-button", className = "" }: {
  id: string;
  label: string;
  items: ActionMenuItem[];
  /** 項目の上に出す補足（選べない表示だけの行）。読み上げは呼び出し側で別途用意する。 */
  heading?: ReactNode;
  busy?: boolean;
  loading?: boolean;
  /** 省略時は「⋯」アイコンだけのボタンにする。 */
  trigger?: ReactNode;
  triggerClassName?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  // 画面幅で隠している項目はフォーカスできないので、矢印キーの移動先から外す。
  const menuItems = () => [...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])].filter((element) => getComputedStyle(element).display !== "none");

  useLayoutEffect(() => {
    const menu = menuRef.current;
    const trigger = triggerRef.current;
    if (!open || !menu || !trigger) return;
    const place = () => {
      // 前回の maxHeight が残っていると、本来の高さを測れない。
      menu.style.maxHeight = "none";
      const { top, bottom, right, maxHeight } = menuPlacement(trigger.getBoundingClientRect(), { width: menu.offsetWidth, height: menu.offsetHeight }, { width: window.innerWidth, height: window.innerHeight });
      Object.assign(menu.style, { top: px(top), bottom: px(bottom), right: px(right), maxHeight: px(maxHeight) });
    };
    place();
    const closeOnScroll = (event: Event) => { if (!menu.contains(event.target as Node)) setOpen(false); };
    window.addEventListener("resize", place);
    window.addEventListener("scroll", closeOnScroll, true);
    return () => { window.removeEventListener("resize", place); window.removeEventListener("scroll", closeOnScroll, true); };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    menuItems()[0]?.focus({ preventScroll: true });
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function moveFocus(event: KeyboardEvent<HTMLDivElement>) {
    const elements = menuItems();
    const index = elements.indexOf(document.activeElement as HTMLElement);
    const next = event.key === "ArrowDown" ? index + 1 : event.key === "ArrowUp" ? index - 1 : event.key === "Home" ? 0 : event.key === "End" ? elements.length - 1 : null;
    if (next === null || elements.length === 0) return;
    event.preventDefault();
    elements[(next + elements.length) % elements.length].focus();
  }

  return <div ref={rootRef} className={`action-menu ${className}`} onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
  }} onKeyDown={(event) => {
    if (event.key === "Escape" && open) { event.preventDefault(); close(); }
  }}>
    <button ref={triggerRef} type="button" className={`${triggerClassName} action-menu-trigger`} aria-label={trigger ? undefined : label} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined} aria-busy={loading} aria-disabled={busy} onClick={() => { if (!busy) setOpen(!open); }} onKeyDown={(event) => {
      if (!busy && (event.key === "ArrowDown" || event.key === "ArrowUp")) { event.preventDefault(); setOpen(true); }
    }}>{loading ? <LoaderCircle className="spin" /> : trigger ?? <MoreHorizontal />}</button>
    {open ? <div ref={menuRef} className="action-menu-list" role="menu" id={id} aria-label={label} onKeyDown={moveFocus}>
      {heading ? <div className="action-menu-heading" aria-hidden="true">{heading}</div> : null}
      {items.map(({ key, label: itemLabel, icon: Icon, danger, className: itemClassName, href, onSelect }) => {
        const itemClass = [danger ? "danger" : "", itemClassName ?? ""].filter(Boolean).join(" ") || undefined;
        return href
          ? <Link key={key} role="menuitem" className={itemClass} href={href} onClick={() => setOpen(false)}><Icon />{itemLabel}</Link>
          : <button key={key} type="button" role="menuitem" className={itemClass} onClick={() => { close(); onSelect?.(); }}><Icon />{itemLabel}</button>;
      })}
    </div> : null}
  </div>;
}
