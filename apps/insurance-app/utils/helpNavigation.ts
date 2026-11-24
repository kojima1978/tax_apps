// 「使い方」画面と案件の画面を行き来するリンク先。
// 使い方は別のタブで開く（入力中の state を消さないため）が、そのタブで「戻る」を押したときに
// お客様一覧ではなく開いていた案件へ帰れるよう、?case= で案件の id を渡す。
// basePath(/insurance) は next/link が付けるのでここでは書かない。

/** サイドバー・一覧から開く「使い方」のリンク先 */
export function helpHrefForCase(caseId: string | null | undefined): string {
  return caseId ? `/help/?case=${encodeURIComponent(caseId)}` : '/help/';
}

/** 「使い方」画面の戻り先。?case= があればその案件の画面、無ければお客様一覧 */
export function backHrefFromHelp(caseId: string | null | undefined): string {
  return caseId ? `/?case=${encodeURIComponent(caseId)}` : '/';
}

/** 「使い方」画面の戻るリンクの文言 */
export function backLabelFromHelp(caseId: string | null | undefined): string {
  return caseId ? '元の画面へ戻る' : 'お客様一覧へ';
}
