import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "個人資産・負債管理",
  description: "税理士がオーナー本人の個人資産・負債を時価で管理する貸借対照表アプリ",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
