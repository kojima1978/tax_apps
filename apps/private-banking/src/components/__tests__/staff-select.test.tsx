// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StaffSelect } from "@/components/staff-select";

const staff = [
  { id: 1, staffCode: "T001", department: "東京", name: "佐藤", nameKana: "サトウ", isActive: true, staffDirectoryId: 1, clientCount: 2 },
  { id: 2, staffCode: "T002", department: "大阪", name: "高橋", nameKana: "タカハシ", isActive: false, staffDirectoryId: 2, clientCount: 1 },
  { id: 3, staffCode: "T003", department: "大阪", name: "佐藤", nameKana: "サトウ", isActive: true, staffDirectoryId: 3, clientCount: 0 },
  { id: 4, staffCode: "STF-0004", department: "", name: "未連携の人", nameKana: "", isActive: true, staffDirectoryId: null, clientCount: 1 },
];
const response = (data: unknown, ok = true) => ({ ok, json: async () => data });
const input = () => screen.getByRole("combobox", { name: "担当者" });
const savedValue = () => (document.querySelector('input[name="staffId"]') as HTMLInputElement).value;
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => { fetchMock = vi.fn().mockResolvedValue(response(staff)); vi.stubGlobal("fetch", fetchMock); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("担当者の検索式選択", () => {
  it("選択済み退職者を保持し、未設定の顧客には退職者を出さない", async () => {
    const view = render(<StaffSelect defaultValue={2} defaultLabel="高橋" />);
    await waitFor(() => expect(input()).toHaveProperty("value", "高橋（T002・大阪）（退職）"));
    expect(savedValue()).toBe("2");
    view.unmount();
    render(<StaffSelect defaultValue={null} />);
    fireEvent.focus(input());
    await screen.findByRole("option", { name: /T001/ });
    expect(screen.queryByRole("option", { name: /高橋/ })).toBeNull();
  });

  it("同姓同名をコード・部署・カナで絞り込んで選択する", async () => {
    render(<StaffSelect defaultValue={null} />);
    fireEvent.focus(input());
    await screen.findByRole("option", { name: /T003/ });
    fireEvent.change(input(), { target: { value: "さとう 大阪" } });
    expect(screen.queryByRole("option", { name: /T001/ })).toBeNull();
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(savedValue()).toBe("3");
    expect(input()).toHaveProperty("value", "佐藤（T003・大阪）");
  });

  it("候補取得前と検索取消時にも保存する担当者IDを維持する", async () => {
    render(<StaffSelect defaultValue={1} defaultLabel="佐藤" />);
    expect(savedValue()).toBe("1");
    await waitFor(() => expect(input()).toHaveProperty("value", "佐藤（T001・東京）"));
    fireEvent.focus(input());
    fireEvent.change(input(), { target: { value: "見つからない" } });
    fireEvent.keyDown(input(), { key: "Escape" });
    expect(savedValue()).toBe("1");
    expect(input()).toHaveProperty("value", "佐藤（T001・東京）");
  });

  it("台帳に居ない担当者は候補に出さず、新しく足す口も持たない", async () => {
    render(<StaffSelect defaultValue={null} />);
    fireEvent.focus(input());
    await screen.findByRole("option", { name: /T001/ });
    expect(screen.queryByRole("option", { name: /未連携の人/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "新しい担当者" })).toBeNull();
  });
});
