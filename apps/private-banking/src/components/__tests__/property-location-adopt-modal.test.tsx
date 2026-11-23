// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PropertyLocationAdoptModal } from "@/components/property-location-adopt-modal";
import { parsePropertyLocation } from "@/lib/municipality";
import { type PropertyLocationCandidate, propertyLocationAdoptMessage } from "@/lib/properties";

// 町名・地番は架空のもの（市区町村名だけ表に合わせて実在の名前を使う）

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const candidate = (positionId: number, source: string, isCurrent = true): PropertyLocationCandidate => ({
  householdId: 3, snapshotId: 8, isCurrent, clientCode: "003", clientName: "テスト　一郎", fiscalYear: 2026,
  positionId, categoryLabel: "その他不動産", propertyTypeLabel: "土地", name: `土地${positionId}`,
  ...parsePropertyLocation(source),
});
const rows = [
  candidate(1, "東京都港区テスト一丁目123番4"),
  candidate(2, "北海道余市町大字テスト字サンプル45番地"),
  candidate(3, "東京都港区テスト1-2-3", false),
];

function setup(saveResponse: { ok: boolean; body: unknown } = { ok: true, body: { updated: [2], skipped: [] } }) {
  const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => init?.method === "POST"
    ? { ok: saveResponse.ok, json: async () => saveResponse.body }
    : { ok: true, json: async () => ({ rows }) });
  vi.stubGlobal("fetch", fetchMock);
  const onSaved = vi.fn();
  const onClose = vi.fn();
  render(<PropertyLocationAdoptModal onClose={onClose} onSaved={onSaved} />);
  return { fetchMock, onSaved, onClose };
}

describe("所在をまとめて分ける", () => {
  it("分けられた明細は最初から選び、分け切れない明細は保存の対象にせず明細へのリンクを出す", async () => {
    setup();
    await screen.findByText("原文から分けられた明細（2件）");
    const [ready, manual] = screen.getAllByRole("table");
    const readyRows = within(ready).getAllByRole("row").slice(1);
    expect(readyRows.map((row) => within(row).getAllByRole("cell").slice(4).map((cell) => cell.textContent))).toEqual([
      ["東京都港区13103", "テスト一丁目", "－", "123番4"],
      ["北海道余市郡余市町01408", "大字テスト", "サンプル", "45番"],
    ]);
    expect(within(ready).getAllByRole("checkbox").every((box) => (box as HTMLInputElement).checked)).toBe(true);
    expect(screen.getByText("人が確かめて入力する明細（1件）")).toBeTruthy();
    expect(within(manual).queryByRole("checkbox")).toBeNull();
    expect(within(manual).getByRole("link").getAttribute("href")).toBe("/customers/3/positions?snapshot=8&position=3");
    expect(screen.getByRole("button", { name: "選んだ2件を保存" })).toBeTruthy();
  });

  it("チェックを外した行は送らず、画面で見た原文と一緒に送る", async () => {
    const { fetchMock, onSaved } = setup();
    await screen.findByText("原文から分けられた明細（2件）");
    fireEvent.click(screen.getByRole("checkbox", { name: /土地1（/ }));
    fireEvent.click(screen.getByRole("button", { name: "選んだ1件を保存" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith({ updated: [2], skipped: [] }));
    const [, init] = fetchMock.mock.calls.find(([, options]) => options?.method === "POST")!;
    expect(JSON.parse(String(init!.body))).toEqual({ items: [{ positionId: 2, source: "北海道余市町大字テスト字サンプル45番地" }] });
  });

  it("すべて選ぶを外すと保存できず、保存の失敗はダイアログの中に出す", async () => {
    setup({ ok: false, body: { error: "保存する明細を選んでください。" } });
    await screen.findByText("原文から分けられた明細（2件）");
    const all = screen.getByRole("checkbox", { name: "分けられた明細をすべて選ぶ" });
    fireEvent.click(all);
    expect((screen.getByRole("button", { name: "選んだ0件を保存" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(all);
    fireEvent.click(screen.getByRole("button", { name: "選んだ2件を保存" }));
    expect((await screen.findByRole("alert")).textContent).toContain("保存する明細を選んでください。");
  });

  it("結果の知らせは保存しなかった理由を件数でまとめる", () => {
    expect(propertyLocationAdoptMessage({ updated: [1, 2], skipped: [] })).toEqual({ headline: "所在を2件分けて保存しました。", skipped: [] });
    expect(propertyLocationAdoptMessage({ updated: [1], skipped: [{ positionId: 2, reason: "理由A" }, { positionId: 3, reason: "理由A" }, { positionId: 4, reason: "理由B" }] })).toEqual({
      headline: "所在を1件分けて保存しました。3件は保存していません。", skipped: ["2件：理由A", "1件：理由B"],
    });
    expect(propertyLocationAdoptMessage({ updated: [], skipped: [{ positionId: 2, reason: "理由A" }] }).headline).toBe("所在を保存した明細はありません。1件は保存していません。");
  });
});
