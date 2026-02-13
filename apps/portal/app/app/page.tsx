import AppCard from '@/components/AppCard';
import PageContainer from '@/components/PageContainer';
import { applications } from '@/lib/applications';

export default function Home() {
  return (
    <>
      <header className="w-full bg-white/80 backdrop-blur-sm border-b border-gray-200 shadow-sm no-print">
        <PageContainer className="py-6">
          <a href="/" aria-label="ホームへ戻る">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              ポータルランチャー
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              すべてのアプリケーションへのゲートウェイ
            </p>
          </a>
        </PageContainer>
      </header>
      <main className="py-12">
        <PageContainer>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {applications.map((app) => (
              <AppCard key={app.url} app={app} />
            ))}
          </div>
        </PageContainer>
      </main>
    </>
  );
}
