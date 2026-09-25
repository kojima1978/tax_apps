import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { AppBrand } from "@/components/portal-link";
import { PropertiesView } from "@/components/properties-view";

export default function PropertiesPage() {
  return <div className="client-home">
    <header className="client-home-header">
      <AppBrand />
      <Link className="back-to-list" href="/"><ChevronLeft />一覧に戻る</Link>
    </header>
    <main className="client-home-main">
      <PropertiesView />
    </main>
  </div>;
}
