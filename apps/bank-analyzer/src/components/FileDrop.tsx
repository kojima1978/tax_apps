// ファイルの選択（ドラッグ＆ドロップかクリック）。JSON の復元・取込ウィザード・通帳有無の取込で使う

import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';

type Props = {
  accept: string;
  multiple?: boolean;
  files: File[];
  onChange: (files: File[]) => void;
  hint?: string;
  invalid?: boolean;
};

export function FileDrop({ accept, multiple, files, onChange, hint, invalid }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const pick = (list: FileList | null) => {
    if (!list?.length) return;
    onChange(multiple ? [...files, ...Array.from(list)] : [list[0]!]);
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          pick(e.dataTransfer.files);
        }}
        className={`flex w-full flex-col items-center gap-1 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors ${
          over ? 'border-blue-500 bg-blue-50' : invalid ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-slate-50 hover:border-blue-400'
        }`}
      >
        <Upload size={32} className="text-slate-400" />
        <span className="font-semibold">ファイルをここにドラッグ＆ドロップ</span>
        <span className="text-xs text-slate-500">またはクリックして選択{hint ? ` ※${hint}` : ''}</span>
      </button>
      <input
        ref={input}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          pick(e.target.files);
          e.target.value = '';
        }}
      />
      {files.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center justify-between rounded bg-blue-50 px-2 py-1 text-blue-900">
              <span className="truncate">{f.name}</span>
              <button type="button" className="ml-2 text-xs text-slate-500 hover:text-red-600" onClick={() => onChange(files.filter((_, j) => j !== i))}>
                外す
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
