import type { Metadata } from "next";
import { Noto_Sans_JP, Roboto_Mono } from "next/font/google";
import "./globals.css";

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-noto-sans-jp",
});

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-roboto-mono",
});

export const metadata: Metadata = {
  title: "退職金 税額計算シミュレーター",
  description: "退職金の所得税・復興特別所得税・住民税を計算するシミュレーターです。",
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
