import { CustomerSectionPage } from "@/components/customer-section-page";
import { customerSectionMetadata } from "@/lib/customer-page-metadata";

export const generateMetadata = customerSectionMetadata("position-list");

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <CustomerSectionPage params={params} section="position-list" />;
}
