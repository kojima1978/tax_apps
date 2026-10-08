// 書き出しのボタン。押したら取りに行き、書き出せなければ理由を通知に出す（lib/api.ts の download）

import { useState, type ReactNode } from 'react';
import { download, errorMessage } from '../lib/api';
import { useNotice } from './Notice';

type Props = { path: string; params?: URLSearchParams; className?: string; children: ReactNode; title?: string };

export function DownloadButton({ path, params, className = 'btn btn-secondary btn-sm', children, title }: Props) {
  const notice = useNotice();
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      await download(path, params);
    } catch (e) {
      notice.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <button type="button" className={className} onClick={run} disabled={busy} title={title} aria-busy={busy}>
      {children}
    </button>
  );
}
