// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FamilyEditorModal } from "@/components/family-editor-modal";
import { type FamilyMember, type FamilyMemberDraft } from "@/lib/family";

afterEach(cleanup);

const member = (overrides: Partial<FamilyMember>): FamilyMember => ({
  id: 1, name: "", nameKana: "", relationship: "CHILD", acquisitionReason: "INHERITANCE",
  civilShareNumerator: null, civilShareDenominator: null, taxShareNumerator: null, taxShareDenominator: null,
  specialTaxAddition: false, disabilityCategory: "NONE", birthDate: null, note: "", sortOrder: 0,
  ...overrides,
});

const spouseAndChild = [
  member({ id: 1, name: "花子", relationship: "SPOUSE", civilShareNumerator: 1, civilShareDenominator: 2, taxShareNumerator: 1, taxShareDenominator: 2 }),
  member({ id: 2, name: "太郎", relationship: "CHILD", sortOrder: 1, civilShareNumerator: 1, civilShareDenominator: 2, taxShareNumerator: 1, taxShareDenominator: 2 }),
];

function renderModal(members: FamilyMember[] = spouseAndChild) {
  const onSave = vi.fn<(drafts: FamilyMemberDraft[]) => Promise<void>>(async () => {});
  const onClose = vi.fn();
  render(<FamilyEditorModal members={members} referenceDate="2026-12-31" saving={false} onSave={onSave} onClose={onClose} />);
  return { onSave, onClose };
}

/** 入力欄はラベルで探す。必須の欄はラベルの後ろに「必須」が付くので前方一致にする。 */
const field = (name: string) => screen.getByLabelText(new RegExp(`^${name}(必須)?$`)) as HTMLInputElement | HTMLSelectElement;
const click = (name: string) => fireEvent.click(screen.getAllByRole("button", { name })[0]);

describe("FamilyEditorModal", () => {
  it("家族を追加すると、追加した人の氏名欄にフォーカスが移る", async () => {
    renderModal();
    click("家族を追加");
    await waitFor(() => expect(document.activeElement).toBe(field("3人目の氏名")));
  });

  it("続柄を選び直すと、2割加算がその続柄の原則に合わせて切り替わる", () => {
    renderModal();
    fireEvent.change(field("2人目の続柄"), { target: { value: "GRANDCHILD" } });
    expect(field("2人目の2割加算").value).toBe("true");
    fireEvent.change(field("2人目の続柄"), { target: { value: "PARENT" } });
    expect(field("2人目の2割加算").value).toBe("false");
  });

  it("削除した人は、通知の「元に戻す」で同じ位置へ戻る", async () => {
    renderModal();
    click("1人目を削除");
    expect(screen.getByText("「花子」を削除しました")).toBeTruthy();
    expect((field("1人目の氏名") as HTMLInputElement).value).toBe("太郎");
    click("元に戻す");
    expect((field("1人目の氏名") as HTMLInputElement).value).toBe("花子");
    await waitFor(() => expect(document.activeElement).toBe(field("1人目の氏名")));
  });

  it("変更があるときは、閉じる前に破棄してよいか確認する", () => {
    const { onClose } = renderModal();
    click("キャンセル");
    expect(onClose).toHaveBeenCalledTimes(1);
    onClose.mockClear();

    fireEvent.change(field("1人目の氏名"), { target: { value: "花子（変更）" } });
    fireEvent.keyDown(field("1人目の氏名"), { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText("変更を保存せずに閉じますか？")).toBeTruthy();
    click("変更を破棄して閉じる");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("自動計算で入力済みの値が書き換わるときは、件数を示して確認してから計算する", () => {
    renderModal();
    fireEvent.change(field("2人目の民法上の法定相続分"), { target: { value: "1/3" } });
    click("法定相続分を自動計算");
    expect(screen.getByRole("alert").textContent).toContain("1件");
    expect((field("2人目の民法上の法定相続分") as HTMLInputElement).value).toBe("1/3");
    click("上書きする");
    expect((field("2人目の民法上の法定相続分") as HTMLInputElement).value).toBe("1/2");
  });

  it("「1/2」の入力を分子・分母に分け、税法上は「民法上と同じ」なら民法上の値で保存する", async () => {
    const { onSave, onClose } = renderModal();
    fireEvent.change(field("1人目の民法上の法定相続分"), { target: { value: "２／３" } });
    fireEvent.click(screen.getAllByLabelText("民法上と同じ")[1]);
    fireEvent.change(field("2人目の税法上の法定相続分"), { target: { value: "1/4" } });
    await act(async () => { click("保存する"); });

    const drafts = onSave.mock.calls[0][0];
    expect(drafts.map(({ id, civilShareNumerator, civilShareDenominator, taxShareNumerator, taxShareDenominator, sortOrder }) =>
      ({ id, civil: `${civilShareNumerator}/${civilShareDenominator}`, tax: `${taxShareNumerator}/${taxShareDenominator}`, sortOrder }))).toEqual([
      { id: 1, civil: "2/3", tax: "2/3", sortOrder: 0 },
      { id: 2, civil: "1/2", tax: "1/4", sortOrder: 1 },
    ]);
    expect(onClose).toHaveBeenCalled();
  });

  it("読めない法定相続分があれば保存せず、何人目の欄かを示す", async () => {
    const { onSave } = renderModal();
    fireEvent.change(field("2人目の民法上の法定相続分"), { target: { value: "0.5" } });
    await act(async () => { fireEvent.submit(field("2人目の氏名").closest("form")!); });
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText(/2人目（太郎）の民法上の法定相続分/)).toBeTruthy();
  });
});
