import type { Metadata } from "next";
import "./globals.css";
import { ClientLayout } from "@/components/ClientLayout";

export const metadata: Metadata = {
  title: "相続税申告案件管理システム",
  description: "相続税申告案件を管理するシステム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        suppressHydrationWarning
        className="antialiased"
      >
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
