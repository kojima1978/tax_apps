import { beforeEach, describe, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({ findMany: vi.fn(), create: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { appCurrency: db } }));
import { GET, POST } from "@/app/api/currencies/route";
beforeEach(() => { vi.clearAllMocks(); });
const post = (code: string, name = "カナダドル") => POST(new Request("http://localhost/api/currencies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, name }) }));
describe("アプリ共通の通貨", () => {
  it("標準3通貨と追加通貨を返す", async () => {
    db.findMany.mockResolvedValue([{ code: "CAD", name: "カナダドル" }]);
    expect((await (await GET()).json()).map((row: { code: string }) => row.code)).toEqual(["JPY", "USD", "EUR", "CAD"]);
  });
  it("小文字コードを正規化して登録する", async () => {
    db.create.mockResolvedValue({ code: "CAD", name: "カナダドル" });
    expect((await post("cad")).status).toBe(201);
    expect(db.create).toHaveBeenCalledWith({ data: { code: "CAD", name: "カナダドル" } });
  });
  it.each(["XXX", "ZZZ", "ABCD"])("無効なコード%sを保存しない", async (code) => {
    expect((await post(code)).status).toBe(400);
    expect(db.create).not.toHaveBeenCalled();
  });
  it("標準通貨と重複しない", async () => {
    expect((await post("USD")).status).toBe(409);
    expect(db.create).not.toHaveBeenCalled();
  });
  it("登録済み通貨の重複を通知する", async () => {
    db.create.mockRejectedValue({ code: "P2002" });
    expect((await post("CAD")).status).toBe(409);
  });
});
