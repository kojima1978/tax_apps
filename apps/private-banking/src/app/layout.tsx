import type { Metadata, Viewport } from "next";
import { appTitleMetadata } from "@/lib/page-title";
import "./globals.css";

// タブ名は各ページの title ＋「｜個人資産・負債管理」（顧客の画面は顧客コード＋画面名、src/lib/page-title.ts）。
export const metadata: Metadata = {
  title: appTitleMetadata,
  description: "税理士がオーナー本人の個人資産・負債を時価で管理する貸借対照表アプリ",
};

// Android のキーボード表示中は見えている高さ（dvh）も縮め、モーダルのボタンをキーボードの上に残す。
// viewportFit は既定（auto）のまま。cover にすると横向きの iPhone でサイドバーがノッチの下に潜る。
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
