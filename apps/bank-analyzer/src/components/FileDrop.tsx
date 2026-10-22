// ファイルの選択（ドラッグ＆ドロップかクリック）。JSON の復元・取込ウィザード・通帳有無の取込で使う

import { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';

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
        <span className="font-semibold">
          ファイルをここに<span className="whitespace-nowrap">ドラッグ＆ドロップ</span>
        </span>
        <span className="text-xs text-slate-500">またはクリックして選択</span>
        {hint && <span className="text-xs text-slate-500">{hint}</span>}
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
              <button
                type="button"
                className="ml-2 inline-flex min-h-11 min-w-11 items-center justify-center rounded text-slate-500 hover:bg-white hover:text-red-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
                aria-label={`${f.name}を選択から外す`}
                onClick={() => onChange(files.filter((_, j) => j !== i))}
              >
                <X size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
