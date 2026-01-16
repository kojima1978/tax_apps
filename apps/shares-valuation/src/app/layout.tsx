import type { Metadata } from "next";
import { M_PLUS_Rounded_1c, Kosugi_Maru } from "next/font/google";

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
            <div className="max-w-4xl mx-auto">{children}</div>
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}
