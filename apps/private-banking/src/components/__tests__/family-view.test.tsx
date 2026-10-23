// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FamilyView } from "@/components/family-view";
import type { FamilyMember } from "@/lib/family";

afterEach(cleanup);
const members = [{ id: 1, name: "テスト家族", nameKana: "", relationship: "CHILD", acquisitionReason: "INHERITANCE", civilShareNumerator: 1, civilShareDenominator: 1, taxShareNumerator: 1, taxShareDenominator: 1, specialTaxAddition: false, disabilityCategory: "NONE", birthDate: null, note: "", sortOrder: 0 }] as FamilyMember[];

describe("親族関係の一覧と入力", () => {
  it("一覧の横スクロール領域をキーボードで選択できる", () => {
    render(<FamilyView members={members} referenceDate="2026-01-01" saving={false} onSave={vi.fn()} />);
    const region = screen.getByRole("region", { name: /家族一覧（幅が足りない場合は横スクロール/ });
    expect(region.tabIndex).toBe(0);
    expect(region.querySelector("table")).not.toBeNull();
    expect(screen.queryByText(/名を登録済み/)).toBeNull();
  });

  it("家族未登録時の案内は維持する", () => {
    render(<FamilyView members={[]} referenceDate="2026-01-01" saving={false} onSave={vi.fn()} />);
    expect(screen.getByText("家族情報はまだ登録されていません")).toBeTruthy();
  });

  it("編集画面で基本・相続・加算控除のまとまりを維持する", () => {
    render(<FamilyView members={members} referenceDate="2026-01-01" saving={false} onSave={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "家族情報を編集" }));
    expect(screen.getByRole("group", { name: "基本" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "相続" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "税額の加算・控除" })).toBeTruthy();
    expect(screen.getByLabelText(/^1人目の氏名/).getAttribute("value")).toBe("テスト家族");
  });
});
