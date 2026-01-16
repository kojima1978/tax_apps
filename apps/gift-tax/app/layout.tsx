import type { Metadata } from "next";
import { Noto_Sans_JP, Roboto_Mono } from "next/font/google";
import "./globals.css";

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-sans-jp",
});

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-roboto-mono",
});

export const metadata: Metadata = {
  title: "贈与税 比較Webアプリ",
  description: "贈与税の税額をシミュレーションし、一括贈与と分割贈与を比較します。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${notoSansJP.variable} ${robotoMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
