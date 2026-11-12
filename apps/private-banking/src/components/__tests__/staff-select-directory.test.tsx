// @vitest-environment jsdom
// 社員台帳に届くときの担当者欄（自分・最近選んだ人・退職予定の印・写しが古いときの注意）。
// 操作者の読み込みはモジュールに1つなので、台帳に届かない場合（staff-select.test.tsx）とはファイルを分ける。
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { StaffSelect } from "@/components/staff-select";

// 名前はすべて架空。id は PB の写しの ID、staffDirectoryId が台帳ID（わざとずらしてある）
const staff = [
  { id: 11, staffCode: "SD-1", department: "東京", name: "架空 一郎", nameKana: "カクウ イチロウ", isActive: true, staffDirectoryId: 1, clientCount: 0 },
  { id: 12, staffCode: "SD-2", department: "大阪", name: "架空 二郎", nameKana: "カクウ ジロウ", isActive: true, staffDirectoryId: 2, clientCount: 0 },
  { id: 13, staffCode: "SD-3", department: "大阪", name: "架空 三郎", nameKana: "カクウ サブロウ", isActive: true, staffDirectoryId: 3, clientCount: 0 },
];
const directory = [
  { id: 1, fullName: "架空 一郎", nameKana: "カクウ イチロウ", companyName: "架空税理士法人", departmentName: "東京", retiredOn: null },
  { id: 2, fullName: "架空 二郎", nameKana: "カクウ ジロウ", companyName: "架空税理士法人", departmentName: "大阪", retiredOn: "2099-12-31" },
  { id: 3, fullName: "架空 三郎", nameKana: "カクウ サブロウ", companyName: "架空税理士法人", departmentName: "大阪", retiredOn: null },
];
const linkHealth = { checks: [{ app: "private-banking", kind: "sync", state: "failed", since: "2026-11-12T10:43:31.898Z", reason: "接続できませんでした" }] };
const response = (data: unknown) => ({ ok: true, json: async () => data });
const input = () => screen.getByRole("combobox", { name: "担当者" });
const savedValue = () => (document.querySelector('input[name="staffId"]') as HTMLInputElement).value;

beforeAll(() => {
  window.localStorage.setItem("tax-apps:operator-id", "1");
  window.localStorage.setItem("tax-apps:assignee-recent", JSON.stringify([3]));
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    if (url.startsWith("/staff-directory/api/staff")) return response(directory);
    if (url.startsWith("/staff-directory/api/link-health")) return response(linkHealth);
    return response(staff);
  }));
});
afterEach(() => cleanup());

describe("担当者欄（台帳に届くとき）", () => {
  it("先頭に自分と最近選んだ人を出し、台帳ID から写しの行へ引き当てる", async () => {
    render(<StaffSelect defaultValue={null} />);
    fireEvent.focus(input());
    const me = await screen.findByRole("group", { name: "自分（操作者）" });
    expect(within(me).getByRole("option").textContent).toContain("架空 一郎");
    const recent = screen.getByRole("group", { name: "最近選んだ人" });
    fireEvent.click(within(recent).getByRole("option"));
    // 保存するのは写しの ID（台帳ID の 3 ではない）
    expect(savedValue()).toBe("13");
  });

  it("選んだ人を最近選んだ人へ台帳ID で控える（全アプリ共通）", async () => {
    render(<StaffSelect defaultValue={null} />);
    fireEvent.focus(input());
    const osaka = await screen.findByRole("group", { name: "大阪" });
    fireEvent.click(within(osaka).getByRole("option", { name: /架空 二郎/ }));
    expect(savedValue()).toBe("12");
    expect(JSON.parse(window.localStorage.getItem("tax-apps:assignee-recent") ?? "[]")).toEqual([2, 3]);
  });

  it("退職予定の人には台帳の退職日で印を付ける", async () => {
    render(<StaffSelect defaultValue={null} />);
    fireEvent.focus(input());
    const osaka = await screen.findByRole("group", { name: "大阪" });
    expect(within(osaka).getByRole("option", { name: /架空 二郎/ }).textContent).toContain("12/31 退職予定");
    expect(within(osaka).getByRole("option", { name: /架空 三郎/ }).textContent).not.toContain("退職");
  });

  it("写しの連携が失敗しているときは欄の下に注意を出す", async () => {
    render(<StaffSelect defaultValue={null} />);
    expect((await screen.findByRole("status")).textContent).toContain("社員台帳からの写しが11/12 19:43から更新できていません（接続できませんでした）");
  });
});
