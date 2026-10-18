import { AppBrand } from "@/components/portal-link";
import { StaffView } from "@/components/staff-view";

export default function StaffPage() {
  return <div className="client-home">
    <header className="client-home-header">
      <AppBrand />
    </header>
    <main className="client-home-main">
      <StaffView />
    </main>
  </div>;
}
