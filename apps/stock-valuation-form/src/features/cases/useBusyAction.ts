// 押している間ボタンを止めるだけの小道具。案件の作成・複製・削除はどれもサーバ往復があり、
// 二度押しで案件が2つ増えるのを防ぐ。

import { useCallback, useState } from 'react';

export function useBusyAction() {
  const [busy, setBusy] = useState(false);

  const act = useCallback(async <T,>(action: () => Promise<T>): Promise<T> => {
    setBusy(true);
    try {
      return await action();
    } finally {
      setBusy(false);
    }
  }, []);

  return { busy, act };
}
