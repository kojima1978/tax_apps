import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "贈与税申告 必要書類案内システム",
  description: "贈与税申告に必要な書類をご案内します",
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
