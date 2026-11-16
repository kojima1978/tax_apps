// @vitest-environment jsdom
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePortfolio } from "@/components/use-portfolio";

const replace = vi.fn();
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push }) }));

const respond = (status: number, body: unknown = {}) => vi.stubGlobal("fetch", vi.fn(async () => ({ ok: status >= 200 && status < 300, status, json: async () => body })));

beforeEach(() => { replace.mockClear(); push.mockClear(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("usePortfolio（顧客の読み込み）", () => {
  // 以前は 404 を受けると何も言わずに顧客一覧へ移していた。開こうとした URL も消えていた。
  it("顧客が存在しないときは notFound を立て、一覧へは移さない", async () => {
    respond(404, { error: "顧客が見つかりません。" });
    const { result } = renderHook(() => usePortfolio(9999));
    await waitFor(() => expect(result.current.notFound).toBe(true));
    expect(result.current.portfolio).toBeNull();
    expect(result.current.error).toBe("");
    expect(replace).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("読み込めたら notFound は立てない", async () => {
    respond(200, { household: { id: 13 }, snapshots: [] });
    const { result } = renderHook(() => usePortfolio(13));
    await waitFor(() => expect(result.current.portfolio).not.toBeNull());
    expect(result.current.notFound).toBe(false);
  });

  it("サーバーの不調（500）は「見つかりません」ではなく、読み込みの失敗として出す", async () => {
    respond(500);
    const { result } = renderHook(() => usePortfolio(13));
    await waitFor(() => expect(result.current.error).toBe("データを読み込めませんでした。接続を確認してください。"));
    expect(result.current.notFound).toBe(false);
  });

  it("見つからなかった後に読み直して取れたら、notFound を下ろす", async () => {
    respond(404);
    const { result } = renderHook(() => usePortfolio(13));
    await waitFor(() => expect(result.current.notFound).toBe(true));
    respond(200, { household: { id: 13 }, snapshots: [] });
    await result.current.load();
    await waitFor(() => expect(result.current.notFound).toBe(false));
    expect(result.current.portfolio).not.toBeNull();
  });
});
