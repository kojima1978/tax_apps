// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PropertyPlanReport } from "@/components/property-plan-report";
import { PRINT_SECTION_META } from "@/components/print-front-matter";
import type { Position, Snapshot } from "@/lib/portfolio-view";
afterEach(cleanup);
const land = (id: number, fields: Partial<Position> = {}) => ({ id, side: "ASSET", name: `物件${id}`, category: "HOME_REAL_ESTATE", valueJpy: 123000, institution: "東京都", landArea: 180.5, ownershipNumerator: 1, ownershipDenominator: 1, assetDetails: null, ...fields } as Position);
const snapshot = (positions: Position[]) => ({ id: 8, fiscalYear: 2024, asOfDate: "2024-12-31", positions } as Snapshot);
describe("不動産の保有・処分方針一覧", () => {
  it("選択年度の不動産のみを未定も含めて表示し、方針を編集できる", () => {
    const onEdit = vi.fn();
    const sell = land(2, { assetDetails: { propertyType: "BUILDING", propertyPlan: "SELL", propertyPlanTiming: "相続後", propertyPlanNote: "境界確認\n売却条件を家族と相談" } });
    const { container } = render(<PropertyPlanReport snapshot={snapshot([land(1), sell, land(3, { category: "DEPOSIT" })])} onEdit={onEdit} />);
    expect(container.querySelectorAll("tbody tr")).toHaveLength(2);
    expect(screen.queryByText("物件3")).toBeNull();
    expect(container.querySelectorAll("tbody tr:first-child .property-plan-readonly-mark")[0].textContent).toBe("●");
    expect(screen.queryByText("相続後")).toBeNull();
    expect(container.textContent).not.toContain("境界確認");
    expect([...container.querySelectorAll("thead th")].map((cell) => cell.textContent)).toEqual(["今後の方針", "No.", "土地・建物", "名称", "所在地", "面積（㎡）", "持分", "評価額（円）", "未定", "保有・承継", "売却予定", "処分予定", "要検討"]);
    expect(container.querySelector("tbody tr")?.children[5].textContent).toBe("2");
    expect(container.querySelector("tbody tr")?.children[9].textContent).toBe("180.5");
    expect(container.textContent).toContain("2024");
    expect(container.querySelector("tfoot")?.textContent).toContain("246,000");
    fireEvent.click(screen.getByRole("button", { name: "物件2の方針を編集" }));
    expect(onEdit).toHaveBeenCalledWith(sell);
  });
  it("五択から一つを選び、保存中は操作を止め、保存後の値を表示する", async () => {
    let resolve!: (ok: boolean) => void;
    const save = vi.fn(() => new Promise<boolean>((done) => { resolve = done; }));
    const position = land(1);
    const { rerender } = render(<PropertyPlanReport snapshot={snapshot([position])} onChangePlan={save} />);
    expect(screen.getAllByRole("radio")).toHaveLength(5);
    fireEvent.click(screen.getByRole("radio", { name: "物件1（No.1）：保有・承継" }));
    expect(save).toHaveBeenCalledWith(position, "KEEP");
    expect(screen.getAllByRole("radio").every((input) => (input as HTMLInputElement).disabled)).toBe(true);
    rerender(<PropertyPlanReport snapshot={snapshot([land(1, { assetDetails: { propertyPlan: "KEEP" } })])} onChangePlan={save} />);
    resolve(true);
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("保存しました"));
    expect((screen.getByRole("radio", { name: "物件1（No.1）：保有・承継" }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole("radio", { name: "物件1（No.1）：未定" }) as HTMLInputElement).checked).toBe(false);
  });
  it("保存失敗時は以前の選択を保持する", async () => {
    render(<PropertyPlanReport snapshot={snapshot([land(1)])} onChangePlan={async () => false} />);
    fireEvent.click(screen.getByRole("radio", { name: "物件1（No.1）：売却予定" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("保存できませんでした"));
    expect((screen.getByRole("radio", { name: "物件1（No.1）：未定" }) as HTMLInputElement).checked).toBe(true);
  });
  it("空の年度を案内し、印刷対象に専用帳票を登録する", () => {
    render(<PropertyPlanReport snapshot={snapshot([])} />);
    expect(screen.getByText("この年度には不動産が登録されていません。")).toBeTruthy();
    expect(PRINT_SECTION_META.find(({ key }) => key === "property-plan")?.title).toBe("不動産の保有・処分方針一覧");
  });
});
