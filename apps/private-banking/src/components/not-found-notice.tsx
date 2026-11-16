import { ArrowLeft, SearchX } from "lucide-react";
import Link from "next/link";
import { PortalLink } from "@/components/portal-link";

/**
 * 「見つかりません」の画面。存在しない顧客（削除された・番号を打ち間違えた）の URL で出す。
 * アプリに無い URL（数字でない顧客 ID・無い科目のページ）は HTTP の 404 になり、
 * ゲートウェイが共通の「ページが見つかりません」へ差し替えるので、ここには来ない。
 *
 * 一覧へ自動では移さない。開こうとした URL がアドレス欄に残るので、打ち間違いなのか
 * 削除された顧客なのかを利用者が確かめられる。戻る口は「顧客一覧へ」1つ。
 */
export function NotFoundNotice({ title, description }: { title: string; description: string }) {
  return <main className="initial-loader not-found-notice">
    <PortalLink />
    <SearchX aria-hidden="true" />
    <h1>{title}</h1>
    <p>{description}</p>
    <Link className="button secondary" href="/"><ArrowLeft />顧客一覧へ</Link>
  </main>;
}
