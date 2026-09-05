// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClientList } from "@/components/client-list";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const clients = [
  { id: 1, name: "テスト顧客A", clientCode: "PB-001", nameKana: "", assignedStaff: "", latestFiscalYear: 2026 },
  { id: 2, name: "テスト顧客B", clientCode: "PB-002", nameKana: "", assignedStaff: "", latestFiscalYear: 2026 },
];
const portfolio = { household: clients[0], snapshots: [{ positions: [{ id: 1 }, { id: 2 }] }, { positions: [{ id: 3 }] }] };
const response = (data: unknown, ok = true) => ({ ok, json: async () => data });
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  push.mockReset();
  fetchMock = vi.fn().mockResolvedValueOnce(response(clients)).mockResolvedValueOnce(response(portfolio));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

async function openDelete() {
  render(<ClientList />);
  const trigger = await screen.findByRole("button", { name: "テスト顧客Aの操作" });
  fireEvent.click(trigger);
  fireEvent.click(screen.getByRole("menuitem", { name: "顧客を削除" }));
  return screen.findByRole("alertdialog");
}

describe("顧客一覧からの削除", () => {
  it("最新の件数と削除範囲を確認し、コード不一致とキャンセルでは削除しない", async () => {
    const dialog = await openDelete();
    expect(push).not.toHaveBeenCalled();
    expect(within(dialog).getByText("2年度")).toBeTruthy();
    expect(within(dialog).getByText("3件")).toBeTruthy();
    expect(within(dialog).getByText("この顧客のすべての年度・明細が削除されます")).toBeTruthy();
    const input = within(dialog).getByRole("textbox");
    expect(document.activeElement).toBe(within(dialog).getByRole("heading"));
    fireEvent.change(input, { target: { value: "PB-002" } });
    expect((within(dialog).getByRole("button", { name: "顧客を削除" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.submit(dialog.querySelector("form")!);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    fireEvent.click(within(dialog).getByRole("button", { name: "キャンセル" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "テスト顧客Aの操作" }));
    expect(screen.getByRole("link", { name: /テスト顧客A/ })).toBeTruthy();
  });

  it("成功した対象だけを除外し、検索条件を維持して検索欄へ戻る", async () => {
    fetchMock.mockResolvedValueOnce(response({ ok: true }));
    const dialog = await openDelete();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "テスト顧客" } });
    fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: "pb-001" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "顧客を削除" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(fetchMock.mock.calls[2][1]).toMatchObject({ method: "DELETE", body: JSON.stringify({ id: 1, confirmationClientCode: "pb-001" }) });
    expect(screen.queryByRole("link", { name: /テスト顧客A/ })).toBeNull();
    expect(screen.getByRole("link", { name: /テスト顧客B/ })).toBeTruthy();
    expect((screen.getByRole("combobox") as HTMLInputElement).value).toBe("テスト顧客");
    expect(document.activeElement).toBe(screen.getByRole("combobox"));
    expect(screen.getByRole("status").textContent).toContain("テスト顧客Aを削除しました");
  });

  it("削除失敗時は一覧と確認画面を残してエラーを表示する", async () => {
    fetchMock.mockResolvedValueOnce(response({ error: "削除に失敗しました" }, false));
    const dialog = await openDelete();
    fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: "PB-001" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "顧客を削除" }));
    expect(await within(dialog).findByRole("alert")).toBeTruthy();
    expect(screen.getByRole("link", { name: /テスト顧客A/ })).toBeTruthy();
    expect((within(dialog).getByRole("button", { name: "顧客を削除" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("確認情報を取得できないときは削除を開始しない", async () => {
    fetchMock.mockReset().mockResolvedValueOnce(response(clients)).mockRejectedValueOnce(new Error("接続できません"));
    render(<ClientList />);
    fireEvent.click(await screen.findByRole("button", { name: "テスト顧客Aの操作" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "顧客を削除" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("送信中の二重削除を防ぎ、最後の検索結果を削除しても条件を保持する", async () => {
    let finish!: (value: ReturnType<typeof response>) => void;
    fetchMock.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const dialog = await openDelete();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "PB-001" } });
    fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: "PB-001" } });
    fireEvent.submit(dialog.querySelector("form")!);
    fireEvent.submit(dialog.querySelector("form")!);
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.getByRole("alertdialog")).toBe(dialog);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect((within(dialog).getByRole("button", { name: "キャンセル" }) as HTMLButtonElement).disabled).toBe(true);
    finish(response({ ok: true }));
    await screen.findByText("該当する顧客がありません");
    expect((screen.getByRole("combobox") as HTMLInputElement).value).toBe("PB-001");
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "" } });
    expect(screen.getByRole("link", { name: /テスト顧客B/ })).toBeTruthy();
  });
});
