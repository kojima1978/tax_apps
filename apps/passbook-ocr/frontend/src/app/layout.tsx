import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Passbook OCR Pro v3.1",
  description: "Professional localhost passbook OCR system with PaddleOCR 3.3.x",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased bg-gray-50">
        {children}
      </body>
    </html>
  );
}
