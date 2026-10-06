// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClientList } from "@/components/client-list";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const clients = [
  { id: 1, name: "テスト顧客A", clientCode: "PB-001", nameKana: "", assignedStaff: "", relatedCompany: "", latestFiscalYear: 2026 },
  { id: 2, name: "テスト顧客B", clientCode: "PB-002", nameKana: "", assignedStaff: "", relatedCompany: "", latestFiscalYear: 2026 },
];
const portfolio = { household: clients[0], snapshots: [{ positions: [{ id: 1 }, { id: 2 }] }, { positions: [{ id: 3 }] }] };
const response = (data: unknown, ok = true) => ({ ok, json: async () => data });
/** 検索欄。表示件数の select も combobox になるので、名前で絞って取る。 */
const searchBox = () => screen.getByRole("combobox", { name: "顧客を検索" }) as HTMLInputElement;
const rowCount = () => document.querySelectorAll(".client-list-row").length;
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
    // 確認画面は fetch の後に出るので、DOM が見えた時点ではまだ見出しへフォーカスを移す useEffect が走っていない。
    // act() の外で起きた更新は findByRole が先に解決しうるため、フォーカスの確認は waitFor で待つ。
    await waitFor(() => expect(document.activeElement).toBe(within(dialog).getByRole("heading")));
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
    fireEvent.change(searchBox(), { target: { value: "テスト顧客" } });
    fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: "pb-001" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "顧客を削除" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(fetchMock.mock.calls[2][1]).toMatchObject({ method: "DELETE", body: JSON.stringify({ id: 1, confirmationClientCode: "pb-001" }) });
    expect(screen.queryByRole("link", { name: /テスト顧客A/ })).toBeNull();
    expect(screen.getByRole("link", { name: /テスト顧客B/ })).toBeTruthy();
    expect(searchBox().value).toBe("テスト顧客");
    expect(document.activeElement).toBe(searchBox());
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
    fireEvent.change(searchBox(), { target: { value: "PB-001" } });
    fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: "PB-001" } });
    fireEvent.submit(dialog.querySelector("form")!);
    fireEvent.submit(dialog.querySelector("form")!);
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.getByRole("alertdialog")).toBe(dialog);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect((within(dialog).getByRole("button", { name: "キャンセル" }) as HTMLButtonElement).disabled).toBe(true);
    finish(response({ ok: true }));
    await screen.findByText("該当する顧客がありません");
    expect(searchBox().value).toBe("PB-001");
    fireEvent.change(searchBox(), { target: { value: "" } });
    expect(screen.getByRole("link", { name: /テスト顧客B/ })).toBeTruthy();
  });
});

describe("顧客一覧の表示", () => {
  it("操作メニューから顧客の各画面を直接開ける", async () => {
    render(<ClientList />);
    fireEvent.click(await screen.findByRole("button", { name: "テスト顧客Aの操作" }));
    const menu = screen.getByRole("menu", { name: "テスト顧客Aの操作" });
    // 並びはサイドバー（dashboard.tsx の SECTIONS）と同じ順。
    expect(within(menu).getAllByRole("menuitem").map((item) => item.textContent)).toEqual(["本人情報", "貸借対照表", "資産・負債明細", "顧客を削除"]);
    expect(within(menu).getByRole("menuitem", { name: "本人情報" }).getAttribute("href")).toBe("/customers/1/profile");
    expect(document.activeElement).toBe(within(menu).getByRole("menuitem", { name: "本人情報" }));
  });

  it("関連法人を行に出し、その名称で検索できる", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([
      { ...clients[0], relatedCompany: "株式会社テスト商店" },
      clients[1],
    ])));
    render(<ClientList />);
    expect((await screen.findByText(/関連法人 株式会社テスト商店/)).className).toBe("client-list-meta");
    fireEvent.change(searchBox(), { target: { value: "テスト商店" } });
    expect(rowCount()).toBe(1);
    expect(screen.getByRole("link", { name: /テスト顧客A/ })).toBeTruthy();
  });

  it("件数を画面に出し、検索中は全件数も添える", async () => {
    render(<ClientList />);
    // 全件が同じ年度のときは年度が1回だけ付く（下の「年度」のテストを参照）。
    expect((await screen.findByText("全2件・すべて2026年度")).className).toBe("client-count");
    fireEvent.change(searchBox(), { target: { value: "PB-002" } });
    expect(screen.getByText("1件（全2件中）・すべて2026年度")).toBeTruthy();
  });

  it("担当者を1人も登録していなければ「担当者未設定」を出さない", async () => {
    render(<ClientList />);
    await screen.findByRole("link", { name: /テスト顧客A/ });
    expect(screen.queryByText("担当者未設定")).toBeNull();
  });

  it("誰か1人でも担当者が付いていれば、空いている行に「担当者未設定」を出す", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([{ ...clients[0], assignedStaff: "佐藤" }, clients[1]])));
    render(<ClientList />);
    expect((await screen.findByText("担当 佐藤")).className).toBe("client-list-meta");
    expect(screen.getAllByText("担当者未設定")).toHaveLength(1);
  });

  it("カナが空でも区切りだけが残らない", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([
      { ...clients[0], nameKana: "", relatedCompany: "株式会社テスト商店" },
    ])));
    render(<ClientList />);
    expect((await screen.findByText("関連法人 株式会社テスト商店")).className).toBe("client-list-meta");
  });

  it("全員が同じ年度なら行には出さず、件数の横へ1回だけ出す", async () => {
    render(<ClientList />);
    await screen.findByRole("link", { name: /テスト顧客A/ });
    expect(document.querySelectorAll(".client-list-year")).toHaveLength(0);
  });

  it("年度がばらついていれば行ごとに出し、件数には添えない", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([clients[0], { ...clients[1], latestFiscalYear: null }])));
    render(<ClientList />);
    expect((await screen.findByText("全2件")).className).toBe("client-count");
    expect(screen.getByText("2026年度")).toBeTruthy();
    expect(screen.getByText("年度なし")).toBeTruthy();
  });
});

describe("顧客一覧のページ切り替え", () => {
  const many = Array.from({ length: 30 }, (_, index) => ({
    id: index + 1, name: `顧客${index + 1}`, clientCode: `PB-${String(index + 1).padStart(3, "0")}`,
    nameKana: "", assignedStaff: "", relatedCompany: "", latestFiscalYear: 2026,
  }));

  beforeEach(() => { vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(many))); });

  it("既定は25件までにし、残りは次のページへ送る", async () => {
    render(<ClientList />);
    await waitFor(() => expect(rowCount()).toBe(25));
    expect(screen.getByText("30件中 1〜25件目")).toBeTruthy();
    expect(screen.getByText("1 / 2ページ")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "次へ" }));
    expect(rowCount()).toBe(5);
    expect(screen.getByText("30件中 26〜30件目")).toBeTruthy();
    expect(screen.getByRole("link", { name: /顧客30/ })).toBeTruthy();
  });

  it("表示件数を増やすと1ページに収まる", async () => {
    render(<ClientList />);
    await waitFor(() => expect(rowCount()).toBe(25));
    fireEvent.change(screen.getByRole("combobox", { name: "表示件数" }), { target: { value: "50" } });
    expect(rowCount()).toBe(30);
    expect(screen.getByText("1 / 1ページ")).toBeTruthy();
  });

  it("検索で絞り込むと1ページ目に戻す", async () => {
    render(<ClientList />);
    await waitFor(() => expect(rowCount()).toBe(25));
    fireEvent.click(screen.getByRole("button", { name: "次へ" }));
    expect(screen.getByText("2 / 2ページ")).toBeTruthy();
    fireEvent.change(searchBox(), { target: { value: "顧客1" } });
    expect(screen.getByText("1 / 1ページ")).toBeTruthy();
  });
});
