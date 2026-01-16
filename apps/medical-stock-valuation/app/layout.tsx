import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";

export const metadata: Metadata = {
  title: "出資持分の評価額試算ツール",
  description: "医療法人の出資持分の評価額の概算を知りたい方向けのツールです",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="font-sans leading-relaxed">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
