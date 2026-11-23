import { useEffect, useRef, type RefObject } from 'react';

// ページの内容が切り替わった後に、その一覧の先頭へ戻す。
// 初回表示ではスクロール位置を変えず、ブラウザの戻る操作や表示件数の変更にも対応する。
export function useScrollToListStart(page: number, perPage: number | undefined, target: RefObject<HTMLElement | null>) {
  const previous = useRef({ page, perPage });

  useEffect(() => {
    const changed = previous.current.page !== page || previous.current.perPage !== perPage;
    previous.current = { page, perPage };
    if (!changed || !target.current) return;
    target.current.focus({ preventScroll: true });
    target.current.scrollIntoView({ block: 'start', behavior: 'auto' });
  }, [page, perPage, target]);
}
