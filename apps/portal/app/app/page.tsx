import PageContainer from '@/components/PageContainer';
import AppGrid from '@/components/AppGrid';

export default function Home() {
  return (
    <>
      <header className="sticky top-0 z-30 w-full bg-gradient-to-r from-emerald-800 to-green-900 shadow-lg no-print">
        <PageContainer className="py-5">
          <a href="/" aria-label="ホームへ戻る">
            <h1 className="text-2xl font-bold text-white">
              業務支援ポータル
            </h1>
            <p className="text-sm text-emerald-300 mt-1">
              税理士業務支援ツール
            </p>
          </a>
        </PageContainer>
      </header>
      <main className="py-10">
        <PageContainer>
          <AppGrid />
        </PageContainer>
      </main>
    </>
  );
}
