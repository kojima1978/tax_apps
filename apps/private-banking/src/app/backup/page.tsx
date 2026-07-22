import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { BackupView } from "@/components/backup-view";
import { PortalLink } from "@/components/portal-link";

export default function BackupPage() {
  return <div className="client-home">
    <header className="client-home-header">
      <div className="brand"><PortalLink /><span>Personal Asset Balance Sheet</span></div>
      <Link className="back-to-list" href="/"><ChevronLeft />一覧に戻る</Link>
    </header>
    <main className="client-home-main">
      <BackupView scope="global" />
    </main>
  </div>;
}
