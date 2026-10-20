import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "業務支援ポータル",
  description: "税理士業務支援アプリケーション",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#022c22",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className="min-h-screen bg-[#f4f7f5] antialiased"
      >
        {children}
      </body>
    </html>
  );
}
