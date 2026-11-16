/**
 * 保存していない入力がある画面で、リンクを押したときに「この画面を離れる移動か」を決める。
 *
 * ブラウザを閉じる・再読み込みは beforeunload が受けるが、アプリの中の移動（サイドバー・一覧に戻る）は
 * ページを読み直さないので beforeunload が来ない。そこでリンクのクリックを見て確認を挟む。
 * 止めてよいクリックだけを選ぶ規則をここに置く（別タブで開く・ダウンロードは入力を消さないので止めない）。
 */

/** next.config.ts の basePath。ルーターへ渡すパスからはこれを外す。 */
export const APP_BASE_PATH = "/private-banking";

export type LinkClick = {
  /** 押したリンクの href（相対でもよい） */
  href: string;
  /** いま開いているページの URL */
  currentHref: string;
  /** リンクの target 属性 */
  target?: string;
  /** download 属性が付いているか */
  download?: boolean;
  /** 押したボタン（0 が主ボタン） */
  button?: number;
  /** Ctrl・Shift・Alt・Meta のどれかを押しながらか（別タブ・別ウィンドウで開く操作） */
  modified?: boolean;
};

const parse = (href: string, base?: string) => {
  try { return new URL(href, base); } catch { return null; }
};

/** このクリックで、いまの画面（の入力）が失われるか。 */
export function leavesPage({ href, currentHref, target = "", download = false, button = 0, modified = false }: LinkClick): boolean {
  if (button !== 0 || modified || download) return false;
  if (target !== "" && target !== "_self") return false;
  const from = parse(currentHref);
  const to = from ? parse(href, from.href) : null;
  if (!from || !to) return false;
  // mailto: や tel: はページを離れない。
  if (to.protocol !== "http:" && to.protocol !== "https:") return false;
  // 同じページの中（クエリやハッシュだけが違う）なら画面は作り直されず、入力は残る。
  return to.origin !== from.origin || to.pathname !== from.pathname;
}

/**
 * 移動先がこのアプリの中なら、ルーターに渡すパス（basePath を外したもの）。
 * ほかのアプリ・外部なら null（ページごと移る）。
 */
export function inAppRoute(href: string, currentHref: string, basePath = APP_BASE_PATH): string | null {
  const from = parse(currentHref);
  const to = from ? parse(href, from.href) : null;
  if (!from || !to || to.origin !== from.origin) return null;
  if (to.pathname !== basePath && !to.pathname.startsWith(`${basePath}/`)) return null;
  return `${to.pathname.slice(basePath.length) || "/"}${to.search}${to.hash}`;
}
