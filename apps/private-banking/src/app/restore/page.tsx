import { RestoreView } from "@/components/backup-view";
import { AppBrand } from "@/components/portal-link";

export default function RestorePage() {
  return <div className="client-home">
    <header className="client-home-header">
      <AppBrand />
    </header>
    <main className="client-home-main">
      <RestoreView />
    </main>
  </div>;
}
