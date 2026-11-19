// キーボードショートカットの一覧。画面の一覧（ShortcutHelp）と使い方の画面（features/help）が
// 同じものを読む ── キーを足したら両方に載る。

export interface Shortcut {
  keys: string[];
  label: string;
  note?: string;
}

export const SHORTCUTS: Shortcut[] = [
  { keys: ['Ctrl', '←'], label: '前の様式へ移動', note: '入力欄にカーソルがあるときも効きます' },
  { keys: ['Ctrl', '→'], label: '次の様式へ移動', note: '第１表の１から第７表の３まで順送りします' },
  { keys: ['Ctrl', 'S'], label: '入力データを保存（JSON書き出し）' },
  { keys: ['Ctrl', 'P'], label: '現在の様式を印刷', note: '入力欄を印刷用の表示に整えてから印刷します' },
  { keys: ['Enter'], label: '次の入力欄へ移動', note: '自動計算欄は飛ばします' },
  { keys: ['?'], label: 'この一覧を開く／閉じる', note: '入力欄の外で押してください' },
  { keys: ['Esc'], label: '開いているダイアログを閉じる' },
];
