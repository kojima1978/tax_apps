import Link from 'next/link';
import { Settings } from 'lucide-react';

export default function Header() {
  return (
    <header className="w-full bg-white/80 backdrop-blur-sm border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between">
          <Link href="/">
            <div className="cursor-pointer">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                ポータルランチャー
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                すべてのアプリケーションへのゲートウェイ
              </p>
            </div>
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/admin"
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-md hover:shadow-lg"
            >
              <Settings className="w-4 h-4" />
              管理
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
