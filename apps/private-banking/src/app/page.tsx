import type { Metadata } from "next";
import { ClientList } from "@/components/client-list";
import { APP_TITLE } from "@/lib/page-title";

// layout と同じ階層なので title.template が効かない。アプリ名まで自分で付ける。
export const metadata: Metadata = { title: { absolute: `顧客一覧｜${APP_TITLE}` } };

export default function Home() {
  return <ClientList />;
}
