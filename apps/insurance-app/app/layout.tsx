import type { Metadata } from 'next'
import './globals.css'

const appBasePath = process.env.NEXT_PUBLIC_STORAGE_MODE === 'json' ? '' : '/insurance'

export const metadata: Metadata = {
  title: '保険証券分析・診断｜お客様一覧',
  description: 'お客様ごとの保険証券を分析・診断する業務支援アプリ',
  icons: { icon: `${appBasePath}/favicon.svg` },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>
        <div id="root">{children}</div>
      </body>
    </html>
  )
}
