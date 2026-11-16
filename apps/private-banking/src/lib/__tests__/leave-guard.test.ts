import { describe, expect, it } from "vitest";
import { inAppRoute, leavesPage } from "@/lib/leave-guard";

const here = "http://localhost/private-banking/customers/13/profile?snapshot=5";

describe("leavesPage（保存していない入力が消える移動か）", () => {
  it("アプリの中の別の画面へのリンクは、離れる移動", () => {
    expect(leavesPage({ href: "/private-banking/customers/13/family?snapshot=5", currentHref: here })).toBe(true);
    expect(leavesPage({ href: "/private-banking", currentHref: here })).toBe(true);
  });

  it("ほかのアプリ・外部へのリンクも、離れる移動", () => {
    expect(leavesPage({ href: "/inheritance-tax-app/?source=pb&householdId=13", currentHref: here })).toBe(true);
    expect(leavesPage({ href: "https://example.com/", currentHref: here })).toBe(true);
  });

  it("同じページのクエリ・ハッシュだけが違うリンクは離れない（入力は残る）", () => {
    expect(leavesPage({ href: "/private-banking/customers/13/profile?snapshot=6", currentHref: here })).toBe(false);
    expect(leavesPage({ href: "#person-information-title", currentHref: here })).toBe(false);
  });

  it("別タブ・別ウィンドウで開く操作は止めない", () => {
    const href = "/private-banking/customers/13/family";
    expect(leavesPage({ href, currentHref: here, target: "_blank" })).toBe(false);
    expect(leavesPage({ href, currentHref: here, modified: true })).toBe(false);
    expect(leavesPage({ href, currentHref: here, button: 1 })).toBe(false);
    expect(leavesPage({ href, currentHref: here, target: "_self" })).toBe(true);
  });

  it("ダウンロードとメールのリンクは止めない", () => {
    expect(leavesPage({ href: "/private-banking/api/backup", currentHref: here, download: true })).toBe(false);
    expect(leavesPage({ href: "mailto:someone@example.com", currentHref: here })).toBe(false);
  });

  it("読めない URL は止めない（確認を出したまま進めなくなるのを避ける）", () => {
    expect(leavesPage({ href: "http://[", currentHref: here })).toBe(false);
    expect(leavesPage({ href: "/x", currentHref: "" })).toBe(false);
  });
});

describe("inAppRoute（移動先をルーターへ渡す形にする）", () => {
  it("アプリの中なら basePath を外したパスを返す（クエリとハッシュは残す）", () => {
    expect(inAppRoute("/private-banking/customers/13/family?snapshot=5#top", here)).toBe("/customers/13/family?snapshot=5#top");
    expect(inAppRoute("http://localhost/private-banking/settings", here)).toBe("/settings");
  });

  it("アプリの入口は / になる", () => {
    expect(inAppRoute("/private-banking", here)).toBe("/");
    expect(inAppRoute("/private-banking/", here)).toBe("/");
  });

  it("ほかのアプリ・別のオリジンは null（ページごと移る）", () => {
    expect(inAppRoute("/inheritance-tax-app/?source=pb", here)).toBeNull();
    expect(inAppRoute("/private-banking-old/x", here)).toBeNull();
    expect(inAppRoute("https://example.com/private-banking/x", here)).toBeNull();
  });
});
