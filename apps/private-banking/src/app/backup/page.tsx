import { BackupView } from "@/components/backup-view";
import { AppBrand } from "@/components/portal-link";

export default function BackupPage() {
  return <div className="client-home">
    <header className="client-home-header">
      <AppBrand />
    </header>
    <main className="client-home-main">
      <BackupView scope="global" />
    </main>
  </div>;
}
