import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ポータルランチャー",
  description: "税理士業務支援アプリケーション - すべてのアプリへのゲートウェイ",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#10b981",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} antialiased min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50`}
      >
        {children}
      </body>
    </html>
  );
}
