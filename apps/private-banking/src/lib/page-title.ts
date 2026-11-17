import { DETAIL_PAGES } from "@/lib/position-detail-pages";
import { sectionLabels, type Section } from "@/lib/portfolio-view";

/** アプリの名前。どの画面のタブ名も「画面名｜アプリ名」にする（layout.tsx の title.template）。 */
export const APP_TITLE = "個人資産・負債管理";
export const appTitleMetadata = { template: `%s｜${APP_TITLE}`, default: APP_TITLE };

/**
 * 顧客の画面のタブ名（アプリ名の手前まで）。顧客名は出さず、顧客コード＋画面名にする ──
 * 画面共有やブラウザの履歴・ブックマークに顧客名が残らないように。
 * 科目別の詳細（`/positions/<科目>`）は、開いている科目も添えてタブを見分けられるようにする。
 */
export function customerPageTitle(clientCode: string | null | undefined, section: Section, detailKey?: string) {
  const detail = section === "positions" && detailKey ? DETAIL_PAGES.find((page) => page.key === detailKey)?.label : undefined;
  const screen = detail ? `${sectionLabels[section]}（${detail}）` : sectionLabels[section];
  return [clientCode?.trim(), screen].filter(Boolean).join(" ");
}
