import { notFound } from "next/navigation";
import { CustomerSectionPage } from "@/components/customer-section-page";
import { DETAIL_PAGES } from "@/lib/position-detail-pages";

export default async function Page({ params }: { params: Promise<{ id: string; category: string }> }) {
  const { category } = await params;
  if (!DETAIL_PAGES.some((page) => page.key === category)) notFound();
  return <CustomerSectionPage params={params} section="positions" />;
}
