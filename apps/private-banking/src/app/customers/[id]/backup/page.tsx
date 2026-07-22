import { CustomerSectionPage } from "@/components/customer-section-page";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <CustomerSectionPage params={params} section="backup" />;
}
