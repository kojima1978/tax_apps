import { useEffect } from 'react';

interface Shortcut {
  keys: string[];
  label: string;
  note?: string;
}

// 様式（.gov-page）の外に出す画面専用の一覧。no-print なので印刷される内容は変わらない
const SHORTCUTS: Shortcut[] = [
  { keys: ['Ctrl', '←'], label: '前の様式へ移動', note: '入力欄にカーソルがあるときも効きます' },
  { keys: ['Ctrl', '→'], label: '次の様式へ移動', note: '第１表の１から第７表の３まで順送りします' },
  { keys: ['Ctrl', 'S'], label: '入力データを保存（JSON書き出し）' },
  { keys: ['Ctrl', 'P'], label: '現在の様式を印刷', note: '入力欄を印刷用の表示に整えてから印刷します' },
  { keys: ['Enter'], label: '次の入力欄へ移動', note: '自動計算欄は飛ばします' },
  { keys: ['?'], label: 'この一覧を開く／閉じる', note: '入力欄の外で押してください' },
  { keys: ['Esc'], label: '開いているダイアログを閉じる' },
];

/** キーボードショートカットの一覧（画面専用）。「?」キーとツールバーのボタンから開く */
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
