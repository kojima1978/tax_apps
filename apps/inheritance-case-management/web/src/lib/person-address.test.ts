import { describe, expect, it } from "vitest";
import {
  applyPostalCodeAddress,
  combinePersonAddress,
  migrateLegacyPersonAddress,
  normalizePersonAddressParts,
} from "@/lib/person-address";
import {
  getBasePersonPayload,
  withAddressFromPostalCode,
  withAddressManual,
  withPostalCodeLookupAddress,
  emptyBasePersonForm,
} from "@/app/[id]/case-person-utils";
import { getPersonMasterEditingFields, getPersonMasterPayload } from "@/lib/person-master-utils";

// 画面で1文字ずつ打つのを再現する（直接入力では onChange が1文字ごとに走る）
function typeInto(
  form: typeof emptyBasePersonForm,
  field: "addressFromPostalCode" | "addressManual",
  text: string,
) {
  const apply = field === "addressFromPostalCode" ? withAddressFromPostalCode : withAddressManual;
  let next = form;
  for (let i = 1; i <= text.length; i++) {
    next = apply(next, text.slice(0, i));
  }
  return next;
}

describe("入力中は値を加工しない", () => {
  it("住所へ1文字ずつ打っても住所補足へ流れ込まない", () => {
    const form = typeInto(emptyBasePersonForm, "addressFromPostalCode", "ABCDE");

    expect(form.addressFromPostalCode).toBe("ABCDE");
    expect(form.addressManual).toBe("");
    expect(form.address).toBe("ABCDE");
  });

  it("住所補足を空にしたら空のまま（結合済みの住所から戻らない）", () => {
    const typed = withAddressManual(withAddressFromPostalCode(emptyBasePersonForm, "徳島県徳島市"), "1-2-3");
    const cleared = withAddressManual(typed, "");

    expect(cleared.addressManual).toBe("");
    expect(cleared.address).toBe("徳島県徳島市");
  });

  it("住所補足の途中に打った空白が消えない", () => {
    const form = typeInto(emptyBasePersonForm, "addressManual", "Sunny Heights");

    expect(form.addressManual).toBe("Sunny Heights");
    expect(form.address).toBe("Sunny Heights");
  });

  it("日本語を複数回に分けて確定しても住所補足はそのまま", () => {
    let form = withAddressFromPostalCode(emptyBasePersonForm, "徳島県徳島市春日");
    form = withAddressFromPostalCode(form, "徳島県徳島市春日2丁目");
    form = withAddressManual(form, "3-33");
    form = withAddressManual(form, "3-33 サンハイツ");

    expect(form.addressFromPostalCode).toBe("徳島県徳島市春日2丁目");
    expect(form.addressManual).toBe("3-33 サンハイツ");
    expect(form.address).toBe("徳島県徳島市春日2丁目3-33 サンハイツ");
  });

  it("保存のときだけ前後の空白を落とす", () => {
    const form = withAddressManual(withAddressFromPostalCode(emptyBasePersonForm, "徳島県徳島市 "), " 1-2-3 ");

    expect(form.addressManual).toBe(" 1-2-3 ");
    expect(getBasePersonPayload({ ...form, name: "山田 太郎" })).toMatchObject({
      addressFromPostalCode: "徳島県徳島市",
      addressManual: "1-2-3",
      address: "徳島県徳島市1-2-3",
    });
  });
});

describe("郵便番号から住所を引いたとき", () => {
  it("住所補足の先頭に同じ住所が入っていれば外す", () => {
    const form = { ...emptyBasePersonForm, addressManual: "徳島県徳島市春日2丁目3-33" };
    const next = withPostalCodeLookupAddress(form, "徳島県徳島市春日");

    expect(next.addressFromPostalCode).toBe("徳島県徳島市春日");
    expect(next.addressManual).toBe("2丁目3-33");
    expect(next.address).toBe("徳島県徳島市春日2丁目3-33");
  });

  it("重なっていない住所補足はそのまま残す", () => {
    const form = { ...emptyBasePersonForm, addressManual: "3-33 サンハイツ" };
    const next = withPostalCodeLookupAddress(form, "徳島県徳島市春日2丁目");

    expect(next.addressManual).toBe("3-33 サンハイツ");
    expect(next.address).toBe("徳島県徳島市春日2丁目3-33 サンハイツ");
  });

  it("applyPostalCodeAddress は旧 address を住所補足へ混ぜない", () => {
    const parts = { address: "ABC", addressFromPostalCode: "ABC", addressManual: "" };

    expect(applyPostalCodeAddress(parts, "ABCDE")).toEqual({
      addressFromPostalCode: "ABCDE",
      addressManual: "",
      address: "ABCDE",
    });
  });
});

describe("旧データ（address だけ）の移行", () => {
  it("2欄が空なら住所補足へ寄せる", () => {
    expect(migrateLegacyPersonAddress({ address: "徳島県徳島市春日2丁目3-33" })).toEqual({
      addressFromPostalCode: "",
      addressManual: "徳島県徳島市春日2丁目3-33",
      address: "徳島県徳島市春日2丁目3-33",
    });
  });

  it("住所が先頭に重なっていればその先だけを住所補足にする", () => {
    expect(
      migrateLegacyPersonAddress({
        address: "徳島県徳島市春日 3-33",
        addressFromPostalCode: "徳島県徳島市春日",
      }),
    ).toEqual({
      addressFromPostalCode: "徳島県徳島市春日",
      addressManual: "3-33",
      address: "徳島県徳島市春日3-33",
    });
  });

  it("2欄が揃っている今のデータは変えない", () => {
    const parts = {
      address: "徳島県徳島市春日2丁目3-33",
      addressFromPostalCode: "徳島県徳島市春日2丁目",
      addressManual: "3-33",
    };

    expect(migrateLegacyPersonAddress(parts)).toEqual(parts);
  });

  it("住所補足を空にして保存した人を読み直しても住所補足は空のまま", () => {
    const saved = getBasePersonPayload({
      ...withAddressManual(withAddressFromPostalCode(emptyBasePersonForm, "徳島県徳島市春日"), ""),
      name: "山田 太郎",
    });

    expect(migrateLegacyPersonAddress(saved)).toEqual({
      addressFromPostalCode: "徳島県徳島市春日",
      addressManual: "",
      address: "徳島県徳島市春日",
    });
  });

  it("旧形式を開いて何も触らず保存し直しても住所が変わらない", () => {
    const legacy = { address: "徳島県徳島市春日2丁目3-33", addressFromPostalCode: "", addressManual: "" };
    const fields = getPersonMasterEditingFields({ ...legacy, name: "山田 太郎" });
    const payload = getPersonMasterPayload(fields);

    expect(payload.address).toBe(legacy.address);
    expect(payload.addressManual).toBe(legacy.address);
    expect(migrateLegacyPersonAddress(payload).address).toBe(legacy.address);
  });
});

describe("結合と保存用の正規化", () => {
  it("combinePersonAddress は入力中の値をそのまま繋ぐ", () => {
    expect(combinePersonAddress("徳島県徳島市 ", " 1-2")).toBe("徳島県徳島市  1-2");
    expect(combinePersonAddress(null, undefined)).toBe("");
  });

  it("normalizePersonAddressParts は旧 address を見ない", () => {
    expect(
      normalizePersonAddressParts({ address: "ABC", addressFromPostalCode: " ABCDE ", addressManual: "" }),
    ).toEqual({
      addressFromPostalCode: "ABCDE",
      addressManual: "",
      address: "ABCDE",
    });
  });
});
