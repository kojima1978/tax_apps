import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { AppBrand } from "@/components/portal-link";
import { StaffView } from "@/components/staff-view";

export default function StaffPage() {
  return <div className="client-home">
    <header className="client-home-header">
      <AppBrand />
      <Link className="back-to-list" href="/"><ChevronLeft />一覧に戻る</Link>
    </header>
    <main className="client-home-main">
      <StaffView />
    </main>
  </div>;
}
