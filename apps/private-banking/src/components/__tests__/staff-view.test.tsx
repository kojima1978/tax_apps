// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StaffView } from "@/components/staff-view";
import type { Staff } from "@/lib/staff";

// 名前はすべて架空（リポジトリは公開）
const response = (data: unknown, ok = true) => ({ ok, json: async () => data });
const row = (name: string) => screen.getByRole("listitem", { name });
let rows: Staff[];
let sync: Record<string, unknown>;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  rows = [
    { id: 1, staffCode: "SD-1", department: "東京", name: "佐藤税理士", nameKana: "サトウ", isActive: true, staffDirectoryId: 1, clientCount: 2 },
    { id: 2, staffCode: "SD-2", department: "大阪", name: "高橋", nameKana: "タカハシ", isActive: false, staffDirectoryId: 2, clientCount: 0 },
    { id: 3, staffCode: "STF-0003", department: "", name: "古い担当", nameKana: "", isActive: false, staffDirectoryId: null, clientCount: 1 },
  ];
  sync = { ok: true, at: "2026-10-21T01:00:00.000Z", created: 0, updated: 0, unlinkedStaff: [] };
  fetchMock = vi.fn(async (url: string) => (url.endsWith("/staff-directory") ? response(sync) : response(rows)));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const open = async () => {
  render(<StaffView />);
  await screen.findByRole("listitem", { name: "佐藤税理士" });
};

describe("担当者の一覧（社員台帳の写し）", () => {
  it("書き換えの口を持たず、台帳へのリンクを出す", async () => {
    await open();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("button", { name: /追加|削除|退職にする/ })).toBeNull();
    expect(screen.getByRole("link", { name: /社員台帳を開く/ }).getAttribute("href")).toBe("/staff-directory/");
  });

  it("既定は在籍だけ。退職と未連携は状態で分けて出す", async () => {
    await open();
    expect(screen.queryByRole("listitem", { name: "高橋" })).toBeNull();
    fireEvent.change(screen.getByRole("combobox", { name: "在籍状態" }), { target: { value: "retired" } });
    expect(within(row("高橋")).getByText("退職")).toBeTruthy();
    expect(screen.queryByRole("listitem", { name: "古い担当" })).toBeNull();
    fireEvent.change(screen.getByRole("combobox", { name: "在籍状態" }), { target: { value: "unlinked" } });
    expect(within(row("古い担当")).getByText("未連携")).toBeTruthy();
    expect(within(row("古い担当")).getByText("担当 1件")).toBeTruthy();
  });

  it("未連携の担当者がいれば、顧客の担当者を選び直すよう知らせる", async () => {
    await open();
    expect(screen.getByRole("status").textContent).toContain("社員台帳に居ない担当者が1人います");
  });

  it("台帳から読み直せなかったときは理由を出す", async () => {
    sync = { ok: false, at: "2026-10-21T01:00:00.000Z", error: "社員台帳に接続できませんでした", created: 0, updated: 0, unlinkedStaff: [] };
    await open();
    expect((await screen.findByRole("alert")).textContent).toContain("社員台帳に接続できませんでした");
  });

  it("「今すぐ読み直す」は期限を待たずに写し直す", async () => {
    await open();
    fireEvent.click(screen.getByRole("button", { name: "今すぐ読み直す" }));
    await vi.waitFor(() => expect(fetchMock.mock.calls.some(([url, init]) => String(url).endsWith("/staff-directory") && init?.method === "POST")).toBe(true));
  });

  it("コード・カナ・部署で検索できる", async () => {
    await open();
    fireEvent.change(screen.getByRole("combobox", { name: "在籍状態" }), { target: { value: "all" } });
    fireEvent.change(screen.getByRole("searchbox", { name: "検索" }), { target: { value: "大阪 SD-2" } });
    expect(screen.queryByRole("listitem", { name: "佐藤税理士" })).toBeNull();
    expect(row("高橋")).toBeTruthy();
  });

  it("フリガナは誰か1人でも入っていれば列を出し、全員空なら列ごと出さない", async () => {
    await open();
    // 在籍の1人だけが見えている状態でも、判定は絞り込み前の全員で行う
    expect(row("佐藤税理士").querySelectorAll(".staff-row-fields > span")).toHaveLength(4);
    cleanup();
    rows = rows.map((r) => ({ ...r, nameKana: "" }));
    await open();
    const fields = row("佐藤税理士").querySelector(".staff-row-fields");
    expect(fields?.classList.contains("no-kana")).toBe(true);
    expect(fields?.querySelectorAll("span")).toHaveLength(3);
  });

  it("多いときはページで送り、絞り込みを変えたら1ページ目へ戻る", async () => {
    rows = Array.from({ length: 30 }, (_, i) => ({ id: i + 1, staffCode: `SD-${i + 1}`, department: i < 27 ? "東京" : "大阪", name: `担当${i + 1}`, nameKana: "", isActive: true, staffDirectoryId: i + 1, clientCount: 0 }));
    render(<StaffView />);
    await screen.findByRole("listitem", { name: "担当1" });
    const pager = screen.getByRole("navigation", { name: "担当者の一覧のページ切り替え" });
    expect(screen.getAllByRole("listitem")).toHaveLength(25);
    expect(pager.textContent).toContain("30件中 1〜25件目");
    fireEvent.click(within(pager).getByRole("button", { name: /次へ/ }));
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
    expect(pager.textContent).toContain("2 / 2ページ");
    fireEvent.change(screen.getByRole("searchbox", { name: "検索" }), { target: { value: "東京" } });
    expect(screen.getByRole("navigation", { name: "担当者の一覧のページ切り替え" }).textContent).toContain("27件中 1〜25件目");
    fireEvent.change(screen.getByRole("combobox", { name: "表示件数" }), { target: { value: "50" } });
    expect(screen.getAllByRole("listitem")).toHaveLength(27);
  });

  it("印刷するときはページ送りで隠れている人も全員出す", async () => {
    rows = Array.from({ length: 30 }, (_, i) => ({ id: i + 1, staffCode: `SD-${i + 1}`, department: "東京", name: `担当${i + 1}`, nameKana: "", isActive: true, staffDirectoryId: i + 1, clientCount: 0 }));
    render(<StaffView />);
    await screen.findByRole("listitem", { name: "担当1" });
    window.dispatchEvent(new Event("beforeprint"));
    expect(screen.getAllByRole("listitem")).toHaveLength(30);
    window.dispatchEvent(new Event("afterprint"));
    await vi.waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(25));
  });
});
