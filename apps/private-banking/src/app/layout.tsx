import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PB Portfolio | ファミリーB/S管理",
  description: "税理士のための個人・ファミリーバランスシート管理",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
