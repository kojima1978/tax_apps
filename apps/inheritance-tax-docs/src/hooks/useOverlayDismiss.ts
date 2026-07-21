import { useRef } from 'react';

/**
 * モーダル背景クリックで閉じる挙動を安全に扱うフック。
 *
 * 単純な onClick={onClose} だと、入力欄でテキストをドラッグ選択して
 * マウスを背景まではみ出して離した場合に click の対象が背景要素になり、
 * 意図せずモーダルが閉じて選択が解除されてしまう。
 * これを防ぐため「マウスを押し始めた場所が背景そのものだったときだけ閉じる」
 * ようにする。
 */
export const useOverlayDismiss = (onClose: () => void) => {
  const pressedOnBackdrop = useRef(false);

  return {
    onMouseDown: (e: React.MouseEvent) => {
      // 背景要素そのものを押したか（中身の要素を押した場合は false）
      pressedOnBackdrop.current = e.target === e.currentTarget;
    },
    onClick: (e: React.MouseEvent) => {
      // 押し始めも離した場所も背景のときだけ閉じる
      if (pressedOnBackdrop.current && e.target === e.currentTarget) onClose();
    },
  };
};
