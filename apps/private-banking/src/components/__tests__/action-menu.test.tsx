// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Pencil, Trash2 } from "lucide-react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ActionMenu, menuPlacement } from "@/components/action-menu";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const viewport = { width: 1280, height: 720 };
const menu = { width: 184, height: 102 };

describe("menuPlacement（操作メニューを出す位置）", () => {
  it("下に入るときは、ボタンのすぐ下・右端をそろえて出す", () => {
    expect(menuPlacement({ top: 300, bottom: 344, right: 1229 }, menu, viewport)).toEqual({ top: 348, bottom: null, right: 51, maxHeight: 364 });
  });

  // 一覧の最後の行。以前は下へ出して画面の外へはみ出していた。
  it("下に入らず上の方が広いときは、ボタンの上へ出す", () => {
    expect(menuPlacement({ top: 660, bottom: 690, right: 1183 }, menu, viewport)).toEqual({ top: null, bottom: 64, right: 97, maxHeight: 648 });
  });

  it("上下どちらにも入らないときは広い方へ出し、入る高さまでに抑える（中は縦スクロール）", () => {
    const tall = { width: 184, height: 400 };
    expect(menuPlacement({ top: 100, bottom: 144, right: 600 }, tall, { width: 800, height: 400 })).toEqual({ top: 148, bottom: null, right: 200, maxHeight: 244 });
    expect(menuPlacement({ top: 260, bottom: 304, right: 600 }, tall, { width: 800, height: 400 })).toEqual({ top: null, bottom: 144, right: 200, maxHeight: 248 });
  });

  it("狭い画面でボタンが左寄りにあるときは、左へはみ出さない位置まで内側へ寄せる", () => {
    expect(menuPlacement({ top: 100, bottom: 144, right: 120 }, { width: 220, height: 102 }, { width: 320, height: 640 }).right).toBe(92);
  });

  it("ボタンが画面の右端より外にあっても、画面の内側に出す", () => {
    expect(menuPlacement({ top: 100, bottom: 144, right: 400 }, menu, { width: 375, height: 812 }).right).toBe(8);
  });
});

describe("ActionMenu", () => {
  const items = [
    { key: "edit", label: "この年度を修正", icon: Pencil, onSelect: vi.fn() },
    { key: "delete", label: "年度データを削除", icon: Trash2, danger: true, onSelect: vi.fn() },
  ];
  const open = () => {
    render(<ActionMenu id="menu" label="令和8年度の操作" items={items} />);
    fireEvent.click(screen.getByRole("button", { name: "令和8年度の操作" }));
    return screen.getByRole("menu", { name: "令和8年度の操作" });
  };

  it("開くとボタンの位置から置き場所を決め、先頭の項目へフォーカスする", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ top: 300, bottom: 344, left: 1185, right: 1229, width: 44, height: 44, x: 1185, y: 300, toJSON: () => ({}) });
    const list = open();
    // jsdom の画面は 1024x768、メニューの大きさは 0。
    expect(list.style.top).toBe("348px");
    expect(list.style.bottom).toBe("auto");
    expect(list.style.right).toBe(`${window.innerWidth - 1229 < 8 ? 8 : window.innerWidth - 1229}px`);
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "この年度を修正" }));
  });

  // 画面に対して置いているので、スクロールされるとボタンから離れてしまう。
  it("画面や表の枠がスクロールされたら閉じる。メニューの中のスクロールでは閉じない", () => {
    const list = open();
    fireEvent.scroll(list);
    expect(screen.queryByRole("menu")).not.toBeNull();
    fireEvent.scroll(document.body);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("Escape で閉じて、ボタンへフォーカスを戻す", () => {
    const list = open();
    fireEvent.keyDown(list, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "令和8年度の操作" }));
  });
});
