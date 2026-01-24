import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "確定申告 必要書類案内システム",
  description: "確定申告に必要な書類を、お客様の申告内容に合わせてご案内します。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
