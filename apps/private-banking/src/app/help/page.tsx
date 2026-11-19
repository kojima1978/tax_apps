import type { Metadata } from "next";
import { HelpView } from "@/components/help-view";
import { AppBrand } from "@/components/portal-link";

export const metadata: Metadata = { title: "使い方" };

export default function HelpPage() {
  return <div className="client-home">
    <header className="client-home-header">
      <AppBrand />
    </header>
    <main className="client-home-main">
      <HelpView />
    </main>
  </div>;
}
