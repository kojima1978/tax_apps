// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DateInput } from "@/components/date-input";

afterEach(cleanup);

type Props = Parameters<typeof DateInput>[0];

function renderInput(props: Partial<Props> = {}) {
  const onChange = vi.fn<(value: string) => void>();
  render(<DateInput label="生年月日" name="birthDate" onChange={onChange} {...props} />);
  return { onChange };
}

/** 送信されるのは隠し欄の値。表示欄は西暦・和暦で入れ替わるので、値の確認はこちらで行う。 */
const submitted = () => (document.querySelector('input[name="birthDate"]') as HTMLInputElement).value;
const field = (name: string) => screen.getByLabelText(name) as HTMLInputElement;
const era = () => screen.getByLabelText("生年月日の元号") as HTMLSelectElement;
const change = (name: string, value: string) => fireEvent.change(screen.getByLabelText(name), { target: { value } });
const toggleTo = (mode: "和暦" | "西暦") => fireEvent.click(screen.getByRole("button", { name: `生年月日を${mode}で入力する` }));

/** 和暦モードで年月日を順に入れる（打ち込む順そのまま）。 */
const typeWareki = (eraYear: string, month: string, day: string) => {
  change("生年月日の年", eraYear);
  change("生年月日の月", month);
  change("生年月日の日", day);
};

describe("DateInput", () => {
  it("西暦モードでは日付欄の値をそのまま渡す", () => {
    const { onChange } = renderInput();
    change("生年月日", "1978-12-22");
    expect(onChange).toHaveBeenCalledWith("1978-12-22");
    expect(submitted()).toBe("1978-12-22");
  });

  it("西暦モードの入力可能な範囲はブラウザの検証に渡す", () => {
    renderInput({ min: "1900-01-01", max: "2026-12-31" });
    expect(field("生年月日")).toHaveProperty("min", "1900-01-01");
    expect(field("生年月日")).toHaveProperty("max", "2026-12-31");
  });

  it("和暦へ切り替えると、入っている値を元号・年・月・日へ分解する", () => {
    renderInput({ defaultValue: "1978-12-22" });
    toggleTo("和暦");
    expect(era().value).toBe("SHOWA");
    expect(field("生年月日の年").value).toBe("53");
    expect(field("生年月日の月").value).toBe("12");
    expect(field("生年月日の日").value).toBe("22");
  });

  it("和暦で入れた年月日を西暦へ変換して渡す", () => {
    const { onChange } = renderInput({ defaultMode: "WAREKI" });
    typeWareki("53", "12", "22");
    expect(onChange).toHaveBeenLastCalledWith("1978-12-22");
    expect(submitted()).toBe("1978-12-22");
  });

  it("年だけ・月まで入れた時点で値は空になるが、打ち込んだ数字は消えない", () => {
    // 外から値を戻してくる親（制御）でも消えないことまで見る。入力途中は値が空になるので、
    // 親から来た空文字を「外での変更」と取り違えると、月まで打った数字が巻き戻る。
    const Controlled = () => {
      const [value, setValue] = useState("");
      return <DateInput label="生年月日" name="birthDate" value={value} onChange={setValue} defaultMode="WAREKI" />;
    };
    render(<Controlled />);
    change("生年月日の年", "53");
    expect(submitted()).toBe("");
    change("生年月日の月", "12");
    expect(submitted()).toBe("");
    expect(field("生年月日の年").value).toBe("53");
    expect(field("生年月日の月").value).toBe("12");
    change("生年月日の日", "22");
    expect(submitted()).toBe("1978-12-22");
  });

  it("選んだ元号の期間外は値にせず、日欄に理由を載せる", () => {
    const { onChange } = renderInput({ defaultMode: "WAREKI" });
    typeWareki("64", "1", "8");
    expect(onChange).toHaveBeenLastCalledWith("");
    expect(submitted()).toBe("");
    expect(field("生年月日の日").validationMessage).toContain("昭和64年1月8日 は存在しません");
  });

  it("和暦モードの範囲外は日欄に境界の日付を添えて載せる", () => {
    renderInput({ defaultMode: "WAREKI", max: "1978-12-21" });
    typeWareki("53", "12", "22");
    expect(field("生年月日の日").validationMessage).toBe("1978年12月21日 以前で入力してください。");
    cleanup();
    renderInput({ defaultMode: "WAREKI", min: "1979-01-01" });
    typeWareki("53", "12", "22");
    expect(field("生年月日の日").validationMessage).toBe("1979年1月1日 以降で入力してください。");
  });

  it("年が未入力のまま組み立てられた範囲（`-01-01`）は範囲判定に使わない", () => {
    renderInput({ defaultMode: "WAREKI", max: "-01-01" });
    typeWareki("53", "12", "22");
    expect(submitted()).toBe("1978-12-22");
    expect(field("生年月日の日").validationMessage).toBe("");
  });

  it("年欄の上限は元号ごとに変える", () => {
    renderInput({ defaultMode: "WAREKI" });
    expect(field("生年月日の年")).toHaveProperty("max", "64");
    fireEvent.change(era(), { target: { value: "TAISHO" } });
    expect(field("生年月日の年")).toHaveProperty("max", "15");
    fireEvent.change(era(), { target: { value: "REIWA" } });
    expect(field("生年月日の年")).toHaveProperty("max", "99");
  });

  it("和暦を既定にした空の欄は昭和から始める", () => {
    renderInput({ defaultMode: "WAREKI" });
    expect(era().value).toBe("SHOWA");
    expect(screen.queryByLabelText("生年月日")).toBeNull();
    toggleTo("西暦");
    expect(field("生年月日")).toHaveProperty("type", "date");
  });
});
