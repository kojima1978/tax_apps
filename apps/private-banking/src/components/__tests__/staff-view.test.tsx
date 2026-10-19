// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StaffView } from "@/components/staff-view";
import type { Staff } from "@/lib/staff";

const response = (data: unknown, ok = true) => ({ ok, json: async () => data });
/** 行は担当者名の入力欄から辿る（同じ文言のボタンが行の数だけ並ぶため）。 */
const row = (name: string) => screen.getByRole("textbox", { name: `${name}の担当者名` }).closest(".staff-row") as HTMLElement;
let rows: Staff[];
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  rows = [
    { id: 1, staffCode: "T001", department: "東京", name: "佐藤税理士", nameKana: "サトウ", isActive: true, clientCount: 2 },
    { id: 2, staffCode: "T002", department: "大阪", name: "高橋", nameKana: "タカハシ", isActive: false, clientCount: 0 },
  ];
  // API と同じ規則で動く差し替え。削除を拒む条件はサーバー側にしか無いので、ここにも写す。
  fetchMock = vi.fn(async (_url: string, init?: { method?: string; body?: string }) => {
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(init.body) as Partial<Staff> & { id: number } : null;
    if (method === "GET" || !body) return response(rows);
    if (method === "POST") {
      const created: Staff = { staffCode: "T009", department: "", nameKana: "", isActive: true, clientCount: 0, name: "", ...body, id: 9 };
      rows = [...rows, created];
      return response(created);
    }
    if (method === "PATCH") {
      rows = rows.map((staff) => (staff.id === body.id ? { ...staff, ...body } : staff));
      return response(rows.find((staff) => staff.id === body.id));
    }
    const target = rows.find((staff) => staff.id === body.id);
    if (!target) return response({ error: "担当者が見つかりません。" }, false);
    if (target.clientCount > 0) return response({ error: `${target.name}は${target.clientCount}件の顧客の担当者です。退職にするか、その顧客の担当者を変えてから削除してください。` }, false);
    rows = rows.filter((staff) => staff.id !== body.id);
    return response({ ok: true });
  });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const open = async () => {
  render(<StaffView />);
  await screen.findByRole("textbox", { name: "佐藤税理士の担当者名" });
  fireEvent.change(screen.getByRole("combobox", { name: "在籍状態" }), { target: { value: "all" } });
};

describe("担当者の台帳", () => {
  it("担当件数と退職をそれぞれの行に出す", async () => {
    await open();
    expect(within(row("佐藤税理士")).getByText("担当 2件")).toBeTruthy();
    expect(within(row("高橋")).getByText("担当なし")).toBeTruthy();
    expect(within(row("高橋")).getByText("退職")).toBeTruthy();
  });

  it("担当している顧客がいる間は削除できず、理由を出す", async () => {
    await open();
    fireEvent.click(within(row("佐藤税理士")).getByRole("button", { name: "削除" }));
    fireEvent.click(within(row("佐藤税理士")).getByRole("button", { name: "削除する" }));
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "佐藤税理士は2件の顧客の担当者です。退職にするか、その顧客の担当者を変えてから削除してください。");
    expect(row("佐藤税理士")).toBeTruthy();
  });

  it("削除は確認を挟み、やめれば消さない", async () => {
    await open();
    fireEvent.click(within(row("高橋")).getByRole("button", { name: "削除" }));
    fireEvent.click(within(row("高橋")).getByRole("button", { name: "やめる" }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fireEvent.click(within(row("高橋")).getByRole("button", { name: "削除" }));
    fireEvent.click(within(row("高橋")).getByRole("button", { name: "削除する" }));
    await waitFor(() => expect(screen.queryByRole("textbox", { name: "高橋の担当者名" })).toBeNull());
  });

  it("退職にすると候補から外れることを知らせる", async () => {
    await open();
    fireEvent.click(within(row("佐藤税理士")).getByRole("button", { name: "退職にする" }));
    expect(await screen.findByRole("status")).toHaveProperty("textContent", "佐藤税理士を退職にしました。以降は候補に出ません。");
    expect(within(row("佐藤税理士")).getByText("退職")).toBeTruthy();
    expect(within(row("佐藤税理士")).getByRole("button", { name: "在籍に戻す" })).toBeTruthy();
  });

  it("名前を直すと保存できる", async () => {
    await open();
    expect(within(row("高橋")).queryByRole("button", { name: "保存" })).toBeNull();
    fireEvent.change(within(row("高橋")).getByRole("textbox", { name: "高橋の担当者名" }), { target: { value: "高橋 一郎" } });
    fireEvent.click(within(row("高橋")).getByRole("button", { name: "保存" }));
    await screen.findByRole("textbox", { name: "高橋 一郎の担当者名" });
    expect(JSON.parse(String(fetchMock.mock.calls.at(-2)?.[1].body))).toEqual({ id: 2, staffCode: "T002", department: "大阪", name: "高橋 一郎", nameKana: "タカハシ", isActive: false });
  });

  it("追加した担当者は一覧に並び、入力欄は次の1人のために空になる", async () => {
    await open();
    fireEvent.change(screen.getByRole("textbox", { name: /^担当者コード/ }), { target: { value: "T003" } });
    fireEvent.change(screen.getByRole("textbox", { name: /^担当者名/ }), { target: { value: "鈴木" } });
    fireEvent.change(screen.getByLabelText("カナ"), { target: { value: "スズキ" } });
    fireEvent.click(screen.getByRole("button", { name: "追加" }));
    await screen.findByRole("textbox", { name: "鈴木の担当者名" });
    // 続けて何人も登録する画面なので、登録した名前が残っていると二重登録のもとになる。
    expect(screen.getByRole("textbox", { name: /^担当者名/ })).toHaveProperty("value", "");
    expect(screen.getByLabelText("カナ")).toHaveProperty("value", "");
  });

  // モーダルだった頃は onClose(changed) で顧客一覧に読み直させていた。画面になった今は
  // 戻った時点で顧客一覧が作り直されるので、閉じる口そのものを持たない。
  it("閉じるボタンを持たない", async () => {
    await open();
    expect(screen.queryByRole("button", { name: "閉じる" })).toBeNull();
  });

  it("コード・カナ・部署で検索し、在籍状態で絞り込める", async () => {
    await open();
    fireEvent.change(screen.getByRole("searchbox", { name: "検索" }), { target: { value: "大阪 T002" } });
    expect(screen.queryByRole("textbox", { name: "佐藤税理士の担当者名" })).toBeNull();
    expect(row("高橋")).toBeTruthy();
    fireEvent.change(screen.getByRole("combobox", { name: "在籍状態" }), { target: { value: "active" } });
    expect(screen.getByText("条件に一致する担当者がいません。")).toBeTruthy();
  });
});
