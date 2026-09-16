import { Landmark } from "lucide-react";

/**
 * ブランドマークを兼ねた、業務支援ポータル（ゲートウェイのルート）へ戻るリンク。
 * next/link だと basePath が付いてアプリ内の顧客一覧に戻ってしまうため、意図的に素の <a> を使う。
 */
export function PortalLink() {
  // eslint-disable-next-line @next/next/no-html-link-for-pages
  return <a className="brand-mark portal-link" href="/" title="業務支援ポータルに戻る" aria-label="業務支援ポータルに戻る"><Landmark /></a>;
}

/** アプリ名。画面上の表記はブラウザのタブ名（layout の title）と揃える。印刷の表紙は英字のまま別に持つ。 */
export const APP_NAME = "個人資産・負債管理";

/** サイドバー・一覧ページ上部のブランド表示。 */
export function AppBrand() {
  return <div className="brand"><PortalLink /><span>{APP_NAME}</span></div>;
}
