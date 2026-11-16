// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { type FormEvent } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PersonView } from "@/components/person-view";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const household = { id: 1, clientCode: "C001", name: "山田 太郎", nameKana: "ヤマダ タロウ", birthDate: "1950-04-01", staffId: null, assignedStaff: "", relatedCompany: "", currency: "JPY" };

beforeEach(() => {
  push.mockClear();
  window.localStorage.clear();
  // 担当者の一覧・担当の履歴はどちらも空で返す。
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => [] })));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function renderView(onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<boolean> = async (event) => { event.preventDefault(); return true; }) {
  const view = render(<>
    <a href="/private-banking/customers/1/family" onClick={(event) => event.preventDefault()}>親族</a>
    <PersonView household={household} referenceDate="2026-12-31" saving={false} saved={false} onSubmit={onSubmit} onRequestDelete={() => {}} />
  </>);
  return view;
}

const nameInput = () => screen.getByLabelText(/^氏名/) as HTMLInputElement;
const type = (value: string) => fireEvent.input(nameInput(), { target: { value } });
const unsaved = () => screen.queryByText("保存していない変更があります");
const leaveTitle = () => screen.queryByRole("alertdialog", { name: "保存していない変更があります" });
/** ブラウザを閉じる・再読み込みのとき、確認を求めるか。 */
const asksBeforeUnload = () => {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
};

describe("PersonView（保存していない変更）", () => {
  it("入力を変えると「保存していない変更があります」を出し、元に戻すと消す", async () => {
    renderView();
    expect(unsaved()).toBeNull();
    type("山田 次郎");
    await waitFor(() => expect(unsaved()).toBeTruthy());
    type("山田 太郎");
    await waitFor(() => expect(unsaved()).toBeNull());
  });

  it("変更が無ければ、リンクも再読み込みも止めない", () => {
    renderView();
    fireEvent.click(screen.getByRole("link", { name: "親族" }));
    expect(leaveTitle()).toBeNull();
    expect(asksBeforeUnload()).toBe(false);
  });

  // 以前は「保存する」を押さずにサイドバーで移ると、何も言わずに入力が消えていた。
  it("変更があるままリンクを押すと確かめ、「編集に戻る」なら入力は残る", () => {
    renderView();
    type("山田 次郎");
    fireEvent.click(screen.getByRole("link", { name: "親族" }));
    expect(leaveTitle()).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "編集に戻る" }));
    fireEvent.click(screen.getByRole("button", { name: "編集に戻る" }));
    expect(leaveTitle()).toBeNull();
    expect(nameInput().value).toBe("山田 次郎");
    expect(push).not.toHaveBeenCalled();
  });

  it("「変更を破棄して移動」で、押したリンクの先へ移る（basePath は外す）", () => {
    renderView();
    type("山田 次郎");
    fireEvent.click(screen.getByRole("link", { name: "親族" }));
    fireEvent.click(screen.getByRole("button", { name: "変更を破棄して移動" }));
    expect(push).toHaveBeenCalledWith("/customers/1/family");
    expect(leaveTitle()).toBeNull();
  });

  it("別タブで開く操作（Ctrl+クリック）は止めない", () => {
    renderView();
    type("山田 次郎");
    fireEvent.click(screen.getByRole("link", { name: "親族" }), { ctrlKey: true });
    expect(leaveTitle()).toBeNull();
  });

  it("変更がある間は、ブラウザを閉じる・再読み込みでも確かめる", () => {
    renderView();
    type("山田 次郎");
    expect(asksBeforeUnload()).toBe(true);
  });

  it("保存できたら、表示を消してリンクも止めない", async () => {
    const view = renderView();
    type("山田 次郎");
    await waitFor(() => expect(unsaved()).toBeTruthy());
    await act(async () => { fireEvent.submit(view.container.querySelector("form")!); });
    await waitFor(() => expect(unsaved()).toBeNull());
    fireEvent.click(screen.getByRole("link", { name: "親族" }));
    expect(leaveTitle()).toBeNull();
    expect(asksBeforeUnload()).toBe(false);
  });

  it("保存に失敗したら、保存していない変更のままにする", async () => {
    const view = renderView(async (event) => { event.preventDefault(); return false; });
    type("山田 次郎");
    await act(async () => { fireEvent.submit(view.container.querySelector("form")!); });
    await waitFor(() => expect(unsaved()).toBeTruthy());
    expect(asksBeforeUnload()).toBe(true);
  });
});
