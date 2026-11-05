import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';

// 保存していない変更があるうちは、別の画面へ移る前に確かめる。
// アプリ内の移動は useBlocker（データルーター＝ main.tsx の createBrowserRouter が前提）、
// 再読み込み・タブを閉じる・ポータルへ戻るリンクは beforeunload が受け持つ。
// 同じ画面の中の URL の書き換え（社員一覧の絞り込みなど）は止めない
export function useLeaveGuard(dirty: boolean, message = '保存していない変更があります。このページを離れますか？') {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    if (window.confirm(message)) blocker.proceed();
    else blocker.reset();
  }, [blocker, message]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
}
