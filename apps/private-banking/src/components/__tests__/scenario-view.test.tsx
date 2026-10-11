// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ScenarioView } from "@/components/scenario-view";

const response = (data: unknown, ok = true) => ({ ok, json: async () => data });
const scenario = {
  id: 7, name: "不動産上昇", assetChangePercent: 20, liabilityChangePercent: 0,
  inheritanceTaxJpy: 10_000_000, successionCostsJpy: 0, note: "地価上昇を想定", updatedAt: "2026-10-11T00:00:00.000Z",
};
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue(response([]));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("シナリオ比較", () => {
  it("現在値と保存シナリオの予測純資産・現状差を表示する", async () => {
    fetchMock.mockResolvedValue(response([scenario]));
    render(<ScenarioView householdId={8} assets={100_000_000} liabilities={20_000_000} defaultTax={10_000_000} />);
    const table = await screen.findByRole("table");
    expect(within(table).getByText("不動産上昇")).toBeTruthy();
    expect(within(screen.getByLabelText("現状の基準値")).getByText("7,000万円")).toBeTruthy();
    const row = within(table).getByText("不動産上昇").closest("tr") as HTMLElement;
    expect(within(row).getByText("9,000万円")).toBeTruthy();
    expect(within(row).getByText("+2,000万円")).toBeTruthy();
    expect(within(row).getByText("地価上昇を想定")).toBeTruthy();
  });

  it("モーダル内へフォーカスを移し、Escapeで閉じて呼び出し元へ戻す", async () => {
    render(<ScenarioView householdId={8} assets={100_000_000} liabilities={0} defaultTax={0} />);
    await screen.findByText("保存済みシナリオはありません");
    const opener = screen.getByRole("button", { name: "シナリオを追加" });
    // fireEvent.click は実ブラウザのようにクリック対象へフォーカスを移さないため明示する。
    opener.focus();
    fireEvent.click(opener);
    const dialog = screen.getByRole("dialog", { name: "シナリオを追加" });
    await waitFor(() => expect(document.activeElement).toBe(within(dialog).getByRole("textbox", { name: "シナリオ名" })));
    fireEvent.keyDown(dialog.closest(".modal-layer")!, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(opener));
  });

  it("テンプレートの前提を入力済みで開く", async () => {
    render(<ScenarioView householdId={8} assets={100_000_000} liabilities={0} defaultTax={10_000_000} />);
    await screen.findByText("保存済みシナリオはありません");
    fireEvent.click(screen.getByRole("button", { name: /資産価値 -10%/ }));
    const dialog = screen.getByRole("dialog");
    expect((within(dialog).getByRole("textbox", { name: "シナリオ名" }) as HTMLInputElement).value).toBe("資産価値が10%下落");
    expect((within(dialog).getByRole("spinbutton", { name: "資産の変動率（%）" }) as HTMLInputElement).value).toBe("-10");
  });

  it("新規シナリオを保存して一覧を再読込する", async () => {
    fetchMock
      .mockResolvedValueOnce(response([]))
      .mockResolvedValueOnce(response({ ...scenario, id: 8 }, true))
      .mockResolvedValueOnce(response([{ ...scenario, id: 8 }]));
    render(<ScenarioView householdId={8} assets={100_000_000} liabilities={0} defaultTax={10_000_000} />);
    await screen.findByText("保存済みシナリオはありません");
    fireEvent.click(screen.getByRole("button", { name: "シナリオを追加" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByRole("textbox", { name: "シナリオ名" }), { target: { value: "不動産上昇" } });
    fireEvent.change(within(dialog).getByRole("spinbutton", { name: "資産の変動率（%）" }), { target: { value: "20" } });
    fireEvent.submit(dialog.querySelector("form")!);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({ householdId: 8, name: "不動産上昇", assetChangePercent: "20" });
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: "POST" });
    expect(within(await screen.findByRole("table")).getByText("不動産上昇")).toBeTruthy();
  });

  it("削除通信が失敗しても操作可能なままエラーを表示する", async () => {
    fetchMock.mockResolvedValueOnce(response([scenario])).mockRejectedValueOnce(new Error("接続できません"));
    vi.stubGlobal("confirm", vi.fn(() => true));
    render(<ScenarioView householdId={8} assets={100_000_000} liabilities={0} defaultTax={0} />);
    fireEvent.click(await screen.findByRole("button", { name: "不動産上昇を削除" }));
    expect((await screen.findByRole("alert")).textContent).toContain("接続できません");
    await waitFor(() => expect((screen.getByRole("button", { name: "不動産上昇を削除" }) as HTMLButtonElement).disabled).toBe(false));
  });
});
