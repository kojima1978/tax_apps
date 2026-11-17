// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CurrencySettingsView } from "@/components/currency-settings-view";

const response = (data: unknown, ok = true) => ({ ok, json: async () => data });
let currencies: Array<{ code: string; name: string }>;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  currencies = [{ code: "JPY", name: "日本円" }, { code: "USD", name: "米ドル" }, { code: "EUR", name: "ユーロ" }, { code: "CAD", name: "カナダドル" }];
  fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
    if (init?.method === "POST") {
      const body = JSON.parse(String(init.body)) as { code: string; name: string };
      if (body.code.toUpperCase() === "CAD") return response({ error: "この通貨は登録済みです。" }, false);
      const created = { code: body.code.toUpperCase(), name: body.name };
      currencies = [...currencies, created];
      return response(created);
    }
    return response(currencies);
  });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const tableRows = () => within(screen.getByRole("table")).getAllByRole("row").slice(1).map((tr) => within(tr).getAllByRole("cell").map((td) => td.textContent));

const add = (code: string, name: string) => {
  fireEvent.change(screen.getByRole("textbox", { name: "通貨コード" }), { target: { value: code } });
  fireEvent.change(screen.getByRole("textbox", { name: "通貨名" }), { target: { value: name } });
  fireEvent.click(screen.getByRole("button", { name: "通貨を追加" }));
};

describe("共通設定（通貨）", () => {
  it("画面名は h1 1つ、通貨は表で標準と追加を分けて出す", async () => {
    render(<CurrencySettingsView />);
    await screen.findByRole("table");
    expect(screen.getAllByRole("heading", { level: 1 }).map((h) => h.textContent)).toEqual(["共通設定"]);
    expect(tableRows()).toEqual([["JPY", "日本円", "標準"], ["USD", "米ドル", "標準"], ["EUR", "ユーロ", "標準"], ["CAD", "カナダドル", "追加"]]);
  });

  it("追加すると表を読み直して知らせる", async () => {
    render(<CurrencySettingsView />);
    await screen.findByRole("table");
    add("chf", "スイスフラン");
    expect((await screen.findByRole("status")).textContent).toContain("CHF（スイスフラン）を追加しました");
    expect(tableRows().at(-1)).toEqual(["CHF", "スイスフラン", "追加"]);
    expect((screen.getByRole("textbox", { name: "通貨コード" }) as HTMLInputElement).value).toBe("");
  });

  it("登録できなかった理由をそのまま出し、入力は残す", async () => {
    render(<CurrencySettingsView />);
    await screen.findByRole("table");
    add("CAD", "カナダドル");
    expect((await screen.findByRole("alert")).textContent).toContain("この通貨は登録済みです。");
    expect((screen.getByRole("textbox", { name: "通貨コード" }) as HTMLInputElement).value).toBe("CAD");
  });
});
