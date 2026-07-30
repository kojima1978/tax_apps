import { useState } from 'react';
import { ArrowUpDown, RotateCcw, Undo2, Save, Trash2, Check, X } from 'lucide-react';
import type { CategoryOrderPreset } from '@/types';

interface Props {
  /** 現在表示中のカテゴリ順（プリセット保存の対象） */
  currentOrder: string[];
  orderPresets: CategoryOrderPreset[];
  onApplyOrder: (order: string[]) => void;
  onSavePreset: (name: string, order: string[]) => void;
  onDeletePreset: (name: string) => void;
  onUndoOrder: () => void;
  canUndoOrder: boolean;
  onResetCategoryOrder: () => void;
  /** カテゴリ順を入れ替え済みか（標準に戻すボタンの出し分け） */
  isCustomCategoryOrder: boolean;
}

export function CategoryOrderBar({
  currentOrder,
  orderPresets,
  onApplyOrder,
  onSavePreset,
  onDeletePreset,
  onUndoOrder,
  canUndoOrder,
  onResetCategoryOrder,
  isCustomCategoryOrder,
}: Props) {
  const [selected, setSelected] = useState('');
  const [newName, setNewName] = useState<string | null>(null);
  // 削除は誤操作を防ぐため2回押し
  const [pendingDelete, setPendingDelete] = useState(false);

  const handleApply = (name: string) => {
    setSelected(name);
    setPendingDelete(false);
    const preset = orderPresets.find((p) => p.name === name);
    if (preset) onApplyOrder(preset.order);
  };

  const handleSave = () => {
    const name = newName?.trim();
    if (!name) return;
    onSavePreset(name, currentOrder);
    setSelected(name);
    setNewName(null);
  };

  const handleDelete = () => {
    if (!pendingDelete) {
      setPendingDelete(true);
      return;
    }
    onDeletePreset(selected);
    setSelected('');
    setPendingDelete(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm bg-white rounded-md border border-gray-200 px-4 py-2">
      <span className="flex items-center gap-1.5 text-gray-600">
        <ArrowUpDown size={14} className="text-gray-400" />
        カテゴリの順序
      </span>
      <span className="text-xs text-gray-500">
        見出しの ↑↓ / 「◯番目」で入れ替え（計算結果・Excel出力にも反映）
      </span>

      <div className="flex items-center gap-1.5 ml-auto">
        <button
          onClick={onUndoOrder}
          disabled={!canUndoOrder}
          className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-gray-300 text-gray-600 cursor-pointer transition-colors hover:border-green-400 hover:text-green-700 disabled:text-gray-300 disabled:border-gray-200 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:text-gray-300"
          title="直前の並べ替えを取り消す（行・カテゴリとも）"
        >
          <Undo2 size={12} /> 元に戻す
        </button>
        {isCustomCategoryOrder && (
          <button
            onClick={onResetCategoryOrder}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-gray-300 text-gray-600 hover:border-green-400 hover:text-green-700 cursor-pointer transition-colors"
            title="カテゴリの順序を資産区分順に戻す"
          >
            <RotateCcw size={12} /> 標準の順序に戻す
          </button>
        )}

        <span className="text-gray-300">|</span>

        {orderPresets.length > 0 && (
          <select
            value={selected}
            onChange={(e) => handleApply(e.target.value)}
            className="px-2 py-1 text-xs rounded border border-gray-300 bg-white text-gray-700 cursor-pointer"
            aria-label="カテゴリ順のプリセットを適用"
          >
            <option value="">プリセットを選択</option>
            {orderPresets.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        )}
        {selected && (
          <button
            onClick={handleDelete}
            onBlur={() => setPendingDelete(false)}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded border cursor-pointer transition-colors ${
              pendingDelete
                ? 'bg-red-600 border-red-600 text-white'
                : 'border-gray-300 text-gray-600 hover:border-red-400 hover:text-red-700'
            }`}
            title={`プリセット「${selected}」を削除`}
          >
            <Trash2 size={12} /> {pendingDelete ? 'もう一度で削除' : '削除'}
          </button>
        )}

        {newName === null ? (
          <button
            onClick={() => setNewName(selected)}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-gray-300 text-gray-600 hover:border-green-400 hover:text-green-700 cursor-pointer transition-colors"
            title="現在のカテゴリ順に名前を付けて保存"
          >
            <Save size={12} /> 順序を保存
          </button>
        ) : (
          <>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') setNewName(null);
              }}
              placeholder="プリセット名"
              autoFocus
              className="px-2 py-1 text-xs rounded border border-gray-300 w-32"
              aria-label="カテゴリ順プリセット名"
            />
            <button
              onClick={handleSave}
              disabled={!newName.trim()}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-green-600 text-white cursor-pointer transition-colors hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <Check size={12} /> 保存
            </button>
            <button
              onClick={() => setNewName(null)}
              className="p-1 rounded text-gray-500 hover:text-gray-700 cursor-pointer"
              aria-label="保存をキャンセル"
            >
              <X size={12} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
