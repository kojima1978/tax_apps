// 押したら API を叩くボタンの共通部分。実行中は busy、失敗は通知に出す。
// 成功したら結果を返し、失敗したら undefined（呼び出し側は結果の有無で続きを決める）

import { useCallback, useState } from 'react';
import { useNotice } from '../components/Notice';
import { errorMessage } from '../lib/api';

export function useAction() {
  const notice = useNotice();
  const [busy, setBusy] = useState<string | null>(null);
  const run = useCallback(
    async <T,>(name: string, fn: () => Promise<T>): Promise<T | undefined> => {
      setBusy(name);
      try {
        return await fn();
      } catch (e) {
        notice.error(errorMessage(e));
        return undefined;
      } finally {
        setBusy(null);
      }
    },
    [notice],
  );
  return { busy, run };
}
