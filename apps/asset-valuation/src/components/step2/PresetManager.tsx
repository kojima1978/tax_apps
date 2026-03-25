import { useState, useRef } from 'react';
import { Save, Trash2, Download, Upload } from 'lucide-react';
import type { MappingPreset, ColumnMapping, CategoryMapping } from '@/types';

interface Props {
  presets: MappingPreset[];
  onLoadPreset: (preset: MappingPreset) => void;
  onSavePreset: (name: string, columnMapping: ColumnMapping, categoryMapping: CategoryMapping) => void;
  onDeletePreset: (name: string) => void;
  onExportPresets: () => void;
  onImportPresets: (file: File) => Promise<void>;
  currentColumnMapping: ColumnMapping;
  currentCategoryMapping: CategoryMapping;
}

export function PresetManager({
  presets,
  onLoadPreset,
  onSavePreset,
  onDeletePreset,
  onExportPresets,
  onImportPresets,
  currentColumnMapping,
  currentCategoryMapping,
}: Props) {
  const [newPresetName, setNewPresetName] = useState('');
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    if (!newPresetName.trim()) return;
    onSavePreset(newPresetName.trim(), currentColumnMapping, currentCategoryMapping);
    setNewPresetName('');
  };

  const handleDelete = (name: string) => {
    if (pendingDelete === name) {
      onDeletePreset(name);
      setPendingDelete(null);
    } else {
      setPendingDelete(name);
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
      <h3 className="text-sm font-bold text-gray-700">マッピングプリセット</h3>

      {/* プリセット一覧 */}
      {presets.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <div
              key={preset.name}
              onClick={() => onLoadPreset(preset)}
              className="flex items-center gap-1 bg-white rounded-md border px-2 py-1 cursor-pointer hover:bg-green-50 hover:border-green-300 transition-colors"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onLoadPreset(preset)}
            >
              <span className="text-sm text-green-700">
                {preset.name}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(preset.name); }}
                onBlur={() => setPendingDelete(null)}
                className={`cursor-pointer transition-colors ${
                  pendingDelete === preset.name
                    ? 'text-red-600 hover:text-red-700'
                    : 'text-gray-400 hover:text-red-500'
                }`}
                title={pendingDelete === preset.name ? 'もう一度クリックで削除' : '削除'}
                aria-label={`プリセット「${preset.name}」を削除`}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 保存 */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newPresetName}
          onChange={(e) => setNewPresetName(e.target.value)}
          placeholder="プリセット名"
          className="flex-1 px-2 py-1 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-green-500"
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          aria-label="新規プリセット名"
        />
        <button
          onClick={handleSave}
          disabled={!newPresetName.trim()}
          className="flex items-center gap-1 px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed cursor-pointer transition-colors"
        >
          <Save size={14} /> 保存
        </button>
      </div>

      {/* JSON入出力 */}
      <div className="flex gap-2">
        <button
          onClick={onExportPresets}
          disabled={presets.length === 0}
          className="flex items-center gap-1 px-3 py-1 text-sm border rounded-md hover:bg-gray-100 disabled:opacity-50 cursor-pointer transition-colors"
        >
          <Download size={14} /> JSONエクスポート
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1 px-3 py-1 text-sm border rounded-md hover:bg-gray-100 cursor-pointer transition-colors"
        >
          <Upload size={14} /> JSONインポート
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) {
              await onImportPresets(file);
              e.target.value = '';
            }
          }}
        />
      </div>
    </div>
  );
}
