// 一覧の画面に入るたびサーバから取り直す。
//
// 同じ明細書を数人で分担することがあり、案件は別の端末からも増える・消える。開いている間ずっと
// 追従はしない（入力中の画面を勝手に差し替えることになる）が、一覧を開いた時点では最新を出す。

import { useEffect, useState } from 'react';
import type { CaseStore } from './useCases';

/** 取り直しが済んだか。済むまでは空の一覧を見せない（「ありません」が一瞬出るため）。 */
export function useCaseListReload(store: CaseStore): boolean {
  const { reload } = store;
  const [loaded, setLoaded] = useState(store.cases.length > 0);

  useEffect(() => {
    void (async () => {
      await reload();
      setLoaded(true);
    })();
  }, [reload]);

  return loaded;
}
