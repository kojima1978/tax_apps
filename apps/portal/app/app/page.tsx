import Header from '@/components/Header';
import LauncherGrid from '@/components/LauncherGrid';
import { prisma } from '@/lib/prisma';

export default async function Home() {
  const applications = await prisma.application.findMany({
    orderBy: { createdAt: 'asc' },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      <Header />
      <main className="py-12">
        <LauncherGrid applications={applications} />
      </main>
    </div>
  );
}
