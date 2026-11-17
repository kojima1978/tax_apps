import type { Metadata } from "next";
import { AppBrand } from "@/components/portal-link";
import { PropertiesView } from "@/components/properties-view";

export const metadata: Metadata = { title: "不動産一覧" };

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
