// 原本は tax_apps/shared/staff-directory/。各アプリの src/shared/staff-directory/ は写しなので、
// 直すときは原本を直して `bash shared/sync.sh` で配ること（写しを直すと CI の照合で落ちる）。
//
// 台帳や DB は別のタブで開いて直す作り（入力中の画面を置いていかないため）。戻ってきたときに
// 引き直さないと、選択肢に出すにはリロードするしかなく、入力していた内容が消える。

/** 別のタブ・ウィンドウからこの画面へ戻ってきたら呼ぶ。返り値で解除する */
export function onTabReturn(callback: () => void): () => void {
  const handler = () => {
    if (document.visibilityState === 'visible') callback();
  };
  window.addEventListener('focus', handler);
  return () => window.removeEventListener('focus', handler);
}

/**
 * 引き直しを1本ずつに絞る（focus は確認ダイアログや印刷を閉じたときにも来るので、重なって走らせない）。
 * 実行中にもう一度呼ばれたら、走っている分の結果を待つだけにする。
 */
export function singleFlight(task: () => Promise<void>): () => Promise<void> {
  let running: Promise<void> | null = null;
  return () => {
    running ??= task().finally(() => {
      running = null;
    });
    return running;
  };
}
