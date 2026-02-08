import Header from '@/components/Header';
import LauncherGrid from '@/components/LauncherGrid';
import { fetchAllApplications } from '@/lib/database';

export default async function Home() {
  const applications = await fetchAllApplications();

  return (
    <>
      <Header />
      <main className="py-12">
        <LauncherGrid applications={applications} />
      </main>
    </>
  );
}
