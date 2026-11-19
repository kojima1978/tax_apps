import { useEffect } from 'react';
import { SHORTCUTS } from '@/data/shortcuts';

/** キーボードショートカットの一覧（画面専用・no-print）。中身は data/shortcuts.ts。「?」キーとツールバーのボタンから開く */
export function ShortcutHelp({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="no-print app-modal-backdrop" onClick={onClose}>
      <div
        className="app-modal shortcut-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcut-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="shortcut-title" className="check-title">キーボードショートカット</h2>
        <p className="check-note">
          日本語入力の変換中は効きません。Mac では Ctrl の代わりに ⌘ でも同じです。
        </p>
        <dl className="shortcut-list">
          {SHORTCUTS.map((s) => (
            <div key={s.label} className="shortcut-row">
              <dt className="shortcut-keys">
                {s.keys.map((k, i) => (
                  <span key={k}>
                    {i > 0 && <span className="shortcut-plus" aria-hidden="true">＋</span>}
                    <kbd>{k}</kbd>
                  </span>
                ))}
              </dt>
              <dd className="shortcut-desc">
                <span className="shortcut-label">{s.label}</span>
                {s.note && <span className="shortcut-note">{s.note}</span>}
              </dd>
            </div>
          ))}
        </dl>
        <div className="prereq-actions">
          <button type="button" className="app-tool-btn" onClick={onClose}>閉じる</button>
        </div>
      </div>
    </div>
  );
}
