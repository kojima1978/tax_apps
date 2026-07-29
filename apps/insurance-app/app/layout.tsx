import type { Metadata } from 'next'
import './globals.css'

const appBasePath = process.env.NEXT_PUBLIC_STORAGE_MODE === 'json' ? '' : '/insurance'

export const metadata: Metadata = {
  title: 'insurance-app',
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
