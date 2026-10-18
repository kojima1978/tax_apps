import { ArrowLeft } from "lucide-react";
import Link from "next/link";

/**
 * 顧客一覧へ戻る口。顧客一覧から開く画面（担当者・データ品質・不動産一覧・
 * バックアップ・データ復元）が、見出しの上にこれを置く。
 *
 * 以前はヘッダの右端にアプリ名と並べて置いていたが、このアプリは顧客個別画面も
 * 「戻るは左上」なので、ロゴ周りの飾りに見えて戻る口として読まれなかった
 * （データ品質だけが左上に置いてあり、そこだけ迷わないという形になっていた）。
 * 文言も「一覧に戻る」ではどの一覧かを言っていないので、行き先を名前で出す。
 */
export function BackToClientList() {
  return <Link className="back-to-list" href="/"><ArrowLeft />顧客一覧に戻る</Link>;
}
