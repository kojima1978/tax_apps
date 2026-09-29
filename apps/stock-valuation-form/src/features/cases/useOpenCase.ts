// 一覧から案件を開く操作。会社一覧（年分が1つだけの会社）と年度一覧の両方から使う。
//
// 「開いている案件を選び直したときは読み直さない」は、どちらの入口でも同じでなければならない
// （片方だけ読み直すと、まだ書き戻せていない入力が古い内容で消える経路がそこにだけ残る）。

import { useCallback } from 'react';
import { useBusyAction } from './useBusyAction';
import type { CaseStore } from './useCases';

export function useOpenCase(store: CaseStore, onOpened: () => void) {
  const { busy, act } = useBusyAction();

  const open = useCallback((id: number) => {
    void (async () => {
      // 開いている案件を選び直したときはサーバから読み直さない
      // （この端末にまだ書き戻せていない入力を、古い内容で上書きしないため）。
      if (id === store.currentId) {
        onOpened();
        return;
      }
      if (await act(() => store.openCase(id)) !== null) onOpened();
    })();
  }, [act, onOpened, store]);

  return { busy, act, open };
}
