import Link from 'next/link';
import { Settings } from 'lucide-react';
import PageContainer from './ui/PageContainer';
import { gradientBtn } from '@/lib/styles';

export default function Header() {
  return (
    <header className="w-full bg-white/80 backdrop-blur-sm border-b border-gray-200 shadow-sm no-print">
      <PageContainer className="py-6">
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="ホームへ戻る">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              ポータルランチャー
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              すべてのアプリケーションへのゲートウェイ
            </p>
          </Link>
          <nav aria-label="メインナビゲーション" className="flex items-center gap-4">
            <Link
              href="/admin"
              className={`flex items-center gap-2 px-4 py-2 ${gradientBtn} shadow-md hover:shadow-lg`}
              aria-label="管理画面を開く"
            >
              <Settings className="w-4 h-4" aria-hidden="true" />
              管理
            </Link>
          </nav>
        </div>
      </PageContainer>
    </header>
  );
}
