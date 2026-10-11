import PageContainer from '@/components/PageContainer';
import AppGrid from '@/components/AppGrid';
import { LayoutGrid } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <>
      <header className="sticky top-0 z-30 w-full border-b border-emerald-950/15 bg-emerald-950/95 shadow-sm backdrop-blur no-print">
        <PageContainer className="flex h-16 items-center justify-between">
          <Link href="/" aria-label="業務支援ポータルのホームへ" className="group inline-flex items-center gap-3 rounded-lg">
            <span className="flex size-9 items-center justify-center rounded-lg bg-emerald-400 text-emerald-950 shadow-sm transition-colors duration-200 group-hover:bg-emerald-300">
              <LayoutGrid className="size-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-base font-bold leading-tight tracking-wide text-white sm:text-lg">
                業務支援ポータル
              </span>
              <span className="mt-0.5 hidden text-xs text-emerald-200/80 sm:block">
                税理士業務支援ツール
              </span>
            </span>
          </Link>
          <p className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-emerald-100">
            16 apps
          </p>
        </PageContainer>
      </header>
      <main className="pb-14 pt-8 sm:pt-10">
        <PageContainer>
          <AppGrid />
        </PageContainer>
      </main>
    </>
  );
}
