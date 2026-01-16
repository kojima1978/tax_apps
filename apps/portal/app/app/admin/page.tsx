import Header from '@/components/Header';
import AdminPanel from '@/components/AdminPanel';
import { prisma } from '@/lib/prisma';

export default async function AdminPage() {
  const applications = await prisma.application.findMany({
    orderBy: { createdAt: 'asc' },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      <Header />
      <main className="py-12">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">アプリケーション管理</h1>
            <p className="text-gray-600 mt-2">ポータルのアプリケーションを追加、編集、削除できます</p>
          </div>
          <AdminPanel applications={applications} />
        </div>
      </main>
    </div>
  );
}
