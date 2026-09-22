// 案件（会社ごとの保存）の一覧。様式の外側の画面なので no-print。

import { useEffect, useRef, useState } from 'react';
import { readFormDataFile } from '@/hooks/useFormData';
import type { CaseSummary } from './api';
import { caseDisplayName, formatSavedAt } from './caseLabels';
import type { CaseStore } from './useCases';

interface CaseDialogProps {
  store: CaseStore;
  /** 帳票に入力があるか。空のまま「現在の入力を案件にする」を押せないようにする。 */
  hasInput: boolean;
  onClose: () => void;
}

export function CaseDialog({ store, hasInput, onClose }: CaseDialogProps) {
  const [includeArchived, setIncludeArchived] = useState(false);
  const [busy, setBusy] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const { reload } = store;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // 開いた時点と「ゴミ箱も表示」の切替で取り直す（別のタブで増減していることがある）。
  useEffect(() => { void reload(includeArchived); }, [includeArchived, reload]);

  const act = async (action: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const data = await readFormDataFile(file);
      await act(() => store.createFromJson(data));
    } catch (cause) {
      alert(cause instanceof Error ? cause.message : String(cause));
    }
  };

  const rowActions = (item: CaseSummary) => (
    item.archivedAt !== null
      ? [
          { label: '復元', onClick: () => act(() => store.restore(item.id, includeArchived)) },
          {
            label: '完全に削除',
            danger: true,
            onClick: () => {
              const message = [
                `「${caseDisplayName(item)}」を完全に削除します。`,
                '',
                'この操作は取り消せません。よろしいですか？',
              ].join('\n');
              if (window.confirm(message)) void act(() => store.purge(item.id, includeArchived));
            },
          },
        ]
      : [
          {
            label: item.id === store.currentId ? '編集中' : '開く',
            disabled: item.id === store.currentId,
            onClick: () => act(() => store.openCase(item.id)),
          },
          { label: '複製', onClick: () => act(() => store.duplicate(item.id, includeArchived)) },
          {
            label: 'ゴミ箱へ',
            onClick: () => act(() => store.archive(item.id, includeArchived)),
          },
        ]
  );

  return (
    <div className="no-print app-modal-backdrop" onClick={onClose}>
      <div
        className="app-modal case-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="case-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="case-title" className="check-title">案件（会社ごとの保存）</h2>
        <p className="check-note">
          案件を選んでいる間、入力は数秒ごとにサーバへ保存され、毎日のバックアップに含まれます。
          選んでいない間は、この端末のブラウザにだけ残ります（他の端末からは見えず、バックアップにも入りません）。
        </p>

        {store.error !== null && <p className="case-error">{store.error}</p>}

        <div className="case-actions">
          <button
            type="button"
            className="app-tool-btn"
            disabled={busy || !hasInput || store.currentId !== null}
            title={
              store.currentId !== null
                ? '開いている案件へ自動保存されています'
                : '入力済みの内容をそのまま新しい案件にします'
            }
            onClick={() => void act(() => store.createFromCurrent())}
          >
            現在の入力を案件にする
          </button>
          <button
            type="button"
            className="app-tool-btn"
            disabled={busy}
            title="白紙の案件を作って切り替えます"
            onClick={() => void act(() => store.createEmpty())}
          >
            新しい案件を作る
          </button>
          <button
            type="button"
            className="app-tool-btn"
            disabled={busy}
            title="保存しておいたJSONを取り込んで新しい案件にします"
            onClick={() => importRef.current?.click()}
          >
            JSONから案件を作る
          </button>
          <label className="case-archived-toggle">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
            />
            ゴミ箱も表示
          </label>
        </div>

        {store.cases.length === 0 ? (
          <p className="case-empty">
            案件はまだありません。入力中の内容があれば「現在の入力を案件にする」で移せます。
          </p>
        ) : (
          <ul className="case-list">
            {store.cases.map((item) => (
              <li
                key={item.id}
                className={`case-row${item.id === store.currentId ? ' is-current' : ''}${item.archivedAt !== null ? ' is-archived' : ''}`}
              >
                <div className="case-row-main">
                  <span className="case-row-name">{caseDisplayName(item)}</span>
                  {item.taxPeriod !== '' && <span className="case-row-period">課税時期 {item.taxPeriod}</span>}
                  <span className="case-row-updated">
                    {item.archivedAt !== null ? 'ゴミ箱 ' : '更新 '}
                    {formatSavedAt(item.archivedAt ?? item.updatedAt)}
                  </span>
                </div>
                <div className="case-row-actions">
                  {rowActions(item).map((action) => (
                    <button
                      key={action.label}
                      type="button"
                      className={`app-tool-btn${'danger' in action && action.danger ? ' app-tool-btn-danger' : ''}`}
                      disabled={busy || ('disabled' in action && action.disabled === true)}
                      onClick={action.onClick}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}

        <input
          id="case-import-json"
          name="case.importJson"
          ref={importRef}
          type="file"
          accept=".json"
          onChange={(e) => void handleImport(e)}
          style={{ display: 'none' }}
        />

        <div className="prereq-actions">
          <button type="button" className="app-tool-btn" onClick={onClose}>閉じる</button>
        </div>
      </div>
    </div>
  );
}
