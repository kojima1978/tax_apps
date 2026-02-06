import Header from '@/components/Header';
import LauncherGrid from '@/components/LauncherGrid';
import { prisma } from '@/lib/prisma';

export default async function Home() {
  const applications = await prisma.application.findMany({
    orderBy: { createdAt: 'asc' },
  });

  return (
    <>
      <Header />
      <main className="py-12">
        <LauncherGrid applications={applications} />
      </main>
    </>
  );
}
