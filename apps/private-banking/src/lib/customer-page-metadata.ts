import type { Metadata } from "next";
import { customerPageTitle } from "@/lib/page-title";
import type { Section } from "@/lib/portfolio-view";
import { prisma } from "@/lib/prisma";

/**
 * `/customers/[id]/<section>` の各ページの generateMetadata。タブ名に顧客コードを入れるため、
 * サーバーで顧客コードだけを読む（画面本体はクライアントで読むが、そこからでは最初の描画と
 * ブラウザの履歴に載る名前が「アプリ名だけ」になる）。
 */
export function customerSectionMetadata(section: Section) {
  return async ({ params }: { params: Promise<{ id: string; category?: string }> }): Promise<Metadata> => {
    const { id, category } = await params;
    const householdId = Number(id);
    let clientCode: string | null = null;
    if (Number.isInteger(householdId) && householdId > 0) {
      // タブ名のためだけに画面を落とさない。読めなければ画面名だけにする（画面側が DB の不通を知らせる）。
      clientCode = await prisma.household.findUnique({ where: { id: householdId }, select: { clientCode: true } })
        .then((household) => household?.clientCode ?? null)
        .catch(() => null);
    }
    return { title: customerPageTitle(clientCode, section, category) };
  };
}
