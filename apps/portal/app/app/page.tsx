import Header from '@/components/Header';
import LauncherGrid from '@/components/LauncherGrid';
import { appLinks } from '@/data/links';

export default function Home() {
  const applications = appLinks;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      <Header />
      <main className="py-12">
        <LauncherGrid applications={applications} />
      </main>
    </div>
  );
}
