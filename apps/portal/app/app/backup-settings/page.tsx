import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, DatabaseBackup } from 'lucide-react';
import PageContainer from '@/components/PageContainer';
import BackupSettingsPanel from '@/components/BackupSettingsPanel';

export const metadata: Metadata = {
  title: 'バックアップ設定 - 業務支援ポータル',
};

export default function BackupSettingsPage() {
  return (
    <>
      <header className="w-full border-b border-emerald-950/15 bg-emerald-950 shadow-sm">
        <PageContainer className="flex min-h-20 items-center gap-4 py-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-400 text-emerald-950">
            <DatabaseBackup className="size-6" aria-hidden="true" />
          </span>
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded text-sm text-emerald-200 transition-colors hover:text-white"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              ポータルに戻る
            </Link>
            <h1 className="mt-1 text-xl font-bold text-white sm:text-2xl">バックアップ設定</h1>
          </div>
        </PageContainer>
      </header>

      <main className="py-6 sm:py-8">
        <PageContainer>
          <BackupSettingsPanel />
        </PageContainer>
      </main>
    </>
  );
}
