// 結果・エラーの表示。
//
// 115行の表を編集していると、表の外に出た通知には気付けない（保存結果は表の上、
// 保存ボタンは表の下、という位置関係だった）。出たときに自分から見える位置まで動く。

import { useEffect, useRef, type ReactNode } from 'react';

export type AlertKind = 'ok' | 'error' | 'warn';

const ALERT_CLASS: Readonly<Record<AlertKind, string>> = {
  ok: 'admin-alert admin-alert-ok',
  error: 'admin-alert admin-alert-error',
  warn: 'admin-alert admin-alert-warn',
};

interface Props {
  kind: AlertKind;
  /**
   * 中身が入れ替わったことを示す値。同じ場所に別のメッセージが出たときも動かすために使う。
   * 省略すると最初に出たときだけ動く（内容が変わらない注意書き向け）。
   */
  scrollKey?: string;
  children: ReactNode;
}

export function AdminAlert({ kind, scrollKey, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // jsdom には scrollIntoView が無い。表示だけの都合なので、無ければ何もしない。
    ref.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }, [scrollKey]);

  return <div ref={ref} className={ALERT_CLASS[kind]}>{children}</div>;
}
