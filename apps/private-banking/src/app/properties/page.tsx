import { AppBrand } from "@/components/portal-link";
import { PropertiesView } from "@/components/properties-view";

export default function PropertiesPage() {
  return <div className="client-home">
    <header className="client-home-header">
      <AppBrand />
    </header>
    <main className="client-home-main">
      <PropertiesView />
    </main>
  </div>;
}
