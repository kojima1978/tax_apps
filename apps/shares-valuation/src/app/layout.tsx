import type { Metadata } from "next";
import { M_PLUS_Rounded_1c, Kosugi_Maru } from "next/font/google";
import { Home } from "lucide-react";

import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";

const mPlusRounded1c = M_PLUS_Rounded_1c({
  weight: ["100", "300", "400", "500", "700", "800", "900"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-m-plus-rounded-1c",
});

const kosugiMaru = Kosugi_Maru({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-kosugi-maru",
});

export const metadata: Metadata = {
  title: "非上場株式評価シミュレーター",
  description: "取引相場のない株式の相続税評価額を試算します",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`antialiased bg-background text-foreground ${mPlusRounded1c.variable} ${kosugiMaru.variable}`}
      >
        <ToastProvider>
          <main className="min-h-screen p-4 sm:p-8">
            <div className="max-w-4xl mx-auto">
              <a href="/" title="ポータルに戻る" aria-label="ポータルに戻る" className="no-print inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-4">
                <Home className="w-4 h-4" aria-hidden="true" />
                <span>ポータル</span>
              </a>
              {children}
            </div>
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}
