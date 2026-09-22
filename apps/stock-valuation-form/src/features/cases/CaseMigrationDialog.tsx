// 端末にだけ残っている入力を案件へ移す誘導。起動時に一度だけ出る。様式の外なので no-print。

import { useEffect, useState } from 'react';
import type { CaseStore } from './useCases';

interface CaseMigrationDialogProps {
  store: CaseStore;
}

export function CaseMigrationDialog({ store }: CaseMigrationDialogProps) {
  const [busy, setBusy] = useState(false);
  const { declineMigration } = store;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') declineMigration(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [declineMigration]);

  const accept = async () => {
    setBusy(true);
    try {
      await store.acceptMigration();
    } finally {
      setBusy(false);
    }
  };

  // 背景クリックでは閉じない。訊くのは一度きりなので、どちらかを選んでもらう
  return (
    <div className="no-print app-modal-backdrop">
      <div
        className="app-modal case-migration-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="case-migration-title"
      >
        <h2 id="case-migration-title" className="check-title">この端末にだけ残っている入力があります</h2>
        <p className="check-note">
          入力中の内容は、いまこの端末のブラウザにだけあります。他の端末からは見えず、毎日のバックアップにも入りません。
          案件として保存すると、会社ごとに切り替えられるようになり、バックアップにも含まれます。
        </p>
        <p className="check-note">
          どちらを選んでも、いまの入力が消えることはありません。
          この確認は次からは出ませんが、あとからでも画面右上の「案件」からいつでも保存できます。
        </p>

        {store.error !== null && <p className="case-error">{store.error}</p>}

        <div className="prereq-actions case-migration-actions">
          <button
            type="button"
            className="app-tool-btn"
            disabled={busy}
            onClick={declineMigration}
          >
            この端末のままにする
          </button>
          <button
            type="button"
            className="app-tool-btn app-tool-btn-primary"
            disabled={busy}
            onClick={() => void accept()}
          >
            {busy ? '保存中…' : '案件として保存する'}
          </button>
        </div>
      </div>
    </div>
  );
}
