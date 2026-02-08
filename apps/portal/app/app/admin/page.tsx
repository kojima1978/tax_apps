import { Metadata } from 'next';
import Header from '@/components/Header';
import AdminPanel from '@/components/AdminPanel';
import AdminAppSort from '@/components/AdminAppSort';
import PageContainer from '@/components/ui/PageContainer';
import { fetchAllApplications } from '@/lib/database';

export const metadata: Metadata = {
  title: '管理',
  description: 'ポータルのアプリケーションを管理',
};

export default async function AdminPage() {
  const applications = await fetchAllApplications();

  return (
    <>
      <Header />
      <main className="py-12">
        <PageContainer>
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900">アプリケーション管理</h2>
            <p className="text-gray-600 mt-2">ポータルのアプリケーションを追加、編集、削除できます</p>
          </div>
          <AdminPanel applications={applications} />

          <div className="mt-12">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">並び替え</h3>
            <p className="text-gray-600 mb-4">ドラッグ＆ドロップでホーム画面での表示順を変更できます</p>
            <AdminAppSort applications={applications} />
          </div>
        </PageContainer>
      </main>
    </>
  );
}
