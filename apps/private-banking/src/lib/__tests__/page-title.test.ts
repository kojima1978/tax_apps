import { describe, expect, it } from "vitest";
import { DETAIL_PAGES } from "../position-detail-pages";
import { APP_TITLE, appTitleMetadata, customerPageTitle } from "../page-title";

describe("customerPageTitle", () => {
  it("顧客コード＋画面名にし、顧客名は入れない", () => {
    expect(customerPageTitle("0012", "balance")).toBe("0012 貸借対照表");
    expect(customerPageTitle("0012", "position-list")).toBe("0012 資産・負債一覧");
  });

  it("顧客コードが無い・空白だけ・読めないときは画面名だけ", () => {
    expect(customerPageTitle(null, "tax")).toBe("相続税の概算");
    expect(customerPageTitle("  ", "tax")).toBe("相続税の概算");
    expect(customerPageTitle(undefined, "history")).toBe("年度比較");
  });

  it("科目別の詳細は開いている科目を添え、知らない科目は添えない", () => {
    const [first] = DETAIL_PAGES;
    expect(customerPageTitle("0012", "positions", first.key)).toBe(`0012 資産・負債詳細（${first.label}）`);
    expect(customerPageTitle("0012", "positions", "no-such-page")).toBe("0012 資産・負債詳細");
    expect(customerPageTitle("0012", "positions")).toBe("0012 資産・負債詳細");
  });

  it("アプリ名はテンプレートで後ろに付く", () => {
    expect(appTitleMetadata.template.replace("%s", "0012 貸借対照表")).toBe(`0012 貸借対照表｜${APP_TITLE}`);
    expect(appTitleMetadata.default).toBe(APP_TITLE);
  });
});
