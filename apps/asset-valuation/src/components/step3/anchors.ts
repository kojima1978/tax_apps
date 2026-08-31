/**
 * 資産1件のDOMアンカー。
 * 同じ資産をPC版の表とモバイル版のカードの両方で描いているため、
 * IDを分けたうえで「今表示されている方」へスクロールする。
 */

/** PC版テーブルの行ID */
export function assetRowId(assetId: string): string {
  return `asset-row-${assetId}`;
}

/** モバイル版カードのID */
export function assetCardId(assetId: string): string {
  return `asset-card-${assetId}`;
}

/** 表示中の方の資産までスクロールする（エラー一覧からのジャンプ用） */
export function scrollToAsset(assetId: string) {
  const candidates = [assetRowId(assetId), assetCardId(assetId)]
    .map((id) => document.getElementById(id))
    .filter((el): el is HTMLElement => el !== null);
  // display:none 側は offsetParent を持たないので、見えている方だけを対象にする
  const target = candidates.find((el) => el.offsetParent !== null) ?? candidates[0];
  if (!target) return;
  const before = window.scrollY;
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  // スムーススクロールが効かない環境（自動テスト用ブラウザなど）では動かないままになるので、
  // 少し待って動いていなければ即時スクロールで確実に移動させる
  setTimeout(() => {
    if (window.scrollY === before) {
      target.scrollIntoView({ block: 'center' });
    }
  }, 300);
}
