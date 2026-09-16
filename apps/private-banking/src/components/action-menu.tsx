"use client";

import { LoaderCircle, MoreHorizontal, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { type KeyboardEvent, type ReactNode, useEffect, useRef, useState } from "react";

/** メニューの1項目。画面移動は `href`、その場の操作は `onSelect` で指定する。 */
export type ActionMenuItem = { key: string; label: string; icon: LucideIcon; danger?: boolean } & (
  | { href: string; onSelect?: never }
  | { onSelect: () => void; href?: never }
);

/**
 * 「⋯」などのボタンから開く操作メニュー。開いたら先頭の項目へフォーカスし、
 * Escape・外側のクリックで閉じる。上下矢印で項目間を移動できる。
 */
export function ActionMenu({ id, label, items, busy = false, loading = false, trigger, triggerClassName = "icon-button", className = "" }: {
  id: string;
  label: string;
  items: ActionMenuItem[];
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
  const menuItems = () => [...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];

  useEffect(() => {
    if (!open) return;
    menuItems()[0]?.focus();
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
      {items.map(({ key, label: itemLabel, icon: Icon, danger, href, onSelect }) => href
        ? <Link key={key} role="menuitem" className={danger ? "danger" : undefined} href={href} onClick={() => setOpen(false)}><Icon />{itemLabel}</Link>
        : <button key={key} type="button" role="menuitem" className={danger ? "danger" : undefined} onClick={() => { close(); onSelect?.(); }}><Icon />{itemLabel}</button>)}
    </div> : null}
  </div>;
}
