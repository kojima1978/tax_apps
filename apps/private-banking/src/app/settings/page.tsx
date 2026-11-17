import { CurrencySettingsView } from "@/components/currency-settings-view";
import { AppBrand } from "@/components/portal-link";

export default function SettingsPage() {
  return <div className="client-home">
    <header className="client-home-header">
      <AppBrand />
    </header>
    <main className="client-home-main">
      <CurrencySettingsView />
    </main>
  </div>;
}
