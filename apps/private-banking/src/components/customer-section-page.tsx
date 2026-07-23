import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Dashboard } from "@/components/dashboard";
import type { Section } from "@/lib/portfolio-view";

/** `/customers/[id]/<section>` の各ページから使う共通の入口。 */
export async function CustomerSectionPage({ params, section }: { params: Promise<{ id: string }>; section: Section }) {
  const { id } = await params;
  const householdId = Number(id);
  if (!Number.isInteger(householdId) || householdId <= 0) notFound();

  // Dashboard は表示中の年度を URL のクエリから読むため、Suspense 境界が要る。
  return <Suspense><Dashboard householdId={householdId} section={section} /></Suspense>;
}
