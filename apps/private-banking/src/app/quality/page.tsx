import type { Metadata } from "next";
import { DataQualityView } from "@/components/data-quality-view";

export const metadata: Metadata = { title: "データ品質チェック" };

export default function QualityPage() {
  return <DataQualityView />;
}
