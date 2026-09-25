import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { RestoreView } from "@/components/backup-view";
import { AppBrand } from "@/components/portal-link";

export default function RestorePage() {
  return <div className="client-home">
    <header className="client-home-header">
      <AppBrand />
      <Link className="back-to-list" href="/"><ChevronLeft />一覧に戻る</Link>
    </header>
    <main className="client-home-main">
      <RestoreView />
    </main>
  </div>;
}
