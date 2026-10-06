// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StaffSelect } from "@/components/staff-select";

const staff = [
  { id: 1, name: "佐藤税理士", nameKana: "サトウ", isActive: true, clientCount: 2 },
  { id: 2, name: "高橋", nameKana: "タカハシ", isActive: false, clientCount: 1 },
];
const response = (data: unknown, ok = true) => ({ ok, json: async () => data });
const select = () => screen.getByRole("combobox", { name: "担当者" }) as HTMLSelectElement;
const optionTexts = () => [...select().options].map((option) => option.textContent);
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue(response(staff));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("担当者の選択欄", () => {
  it("退職した担当者は候補に出さないが、いま選ばれている1人は残す", async () => {
    render(<StaffSelect defaultValue={2} defaultLabel="高橋" />);
    await waitFor(() => expect(optionTexts()).toEqual(["未設定", "佐藤税理士", "高橋（退職）"]));
    expect(select().value).toBe("2");
  });

  it("未設定の顧客では退職した担当者を選べない", async () => {
    render(<StaffSelect defaultValue={null} />);
    await waitFor(() => expect(optionTexts()).toEqual(["未設定", "佐藤税理士"]));
    expect(select().value).toBe("");
  });

  it("候補の取得が終わる前でも、いまの担当者を選んだままにする", () => {
    // 読み込み中に保存されても担当者が消えないよう、取得前から選択肢を1つ持たせる。
    render(<StaffSelect defaultValue={2} defaultLabel="高橋" />);
    expect(optionTexts()).toEqual(["未設定", "高橋"]);
    expect(select().value).toBe("2");
  });

  it("その場で登録した担当者をそのまま選ぶ", async () => {
    render(<StaffSelect defaultValue={null} />);
    await waitFor(() => expect(optionTexts()).toHaveLength(2));
    fetchMock.mockResolvedValueOnce(response({ id: 9, name: "鈴木", nameKana: "", isActive: true, clientCount: 0 }, true));
    fireEvent.click(screen.getByRole("button", { name: "新しい担当者" }));
    fireEvent.change(screen.getByRole("textbox", { name: "新しい担当者の名前" }), { target: { value: " 鈴木 " } });
    fireEvent.click(screen.getByRole("button", { name: "登録" }));
    await waitFor(() => expect(select().value).toBe("9"));
    expect(optionTexts()).toEqual(["未設定", "佐藤税理士", "鈴木"]);
    // 前後の空白は落として送る（台帳の一意制約をすり抜ける揺れを作らない）。
    expect(JSON.parse(String(fetchMock.mock.calls.at(-1)?.[1].body))).toEqual({ name: "鈴木" });
  });

  it("同じ名前は登録できないことをその場に出す", async () => {
    render(<StaffSelect defaultValue={null} />);
    await waitFor(() => expect(optionTexts()).toHaveLength(2));
    fetchMock.mockResolvedValueOnce(response({ error: "同じ名前の担当者がすでに登録されています。" }, false));
    fireEvent.click(screen.getByRole("button", { name: "新しい担当者" }));
    fireEvent.change(screen.getByRole("textbox", { name: "新しい担当者の名前" }), { target: { value: "佐藤税理士" } });
    fireEvent.click(screen.getByRole("button", { name: "登録" }));
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "同じ名前の担当者がすでに登録されています。");
    expect(select().value).toBe("");
  });
});
