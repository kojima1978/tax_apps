// 取込ウィザードの全ファイル・全行を1か所で持つ。手順を行き来しても消えない
// （Django 版は手順2・3へ戻るたびに描き直し、直した値と削除した行が元に戻っていた）

import { useCallback, useState } from 'react';
import type { DuplicateMark, DuplicateWarning } from '../../../server/lib/dedup';
import { newKey, type AccountFields, type EditFile, type EditRow } from './wizardRows';

export type DuplicateCheck = { marks: DuplicateMark[]; warning: DuplicateWarning | null };

type RowPatch = Partial<Pick<EditRow, 'date' | 'description' | 'amountOut' | 'amountIn' | 'balance'>>;

export function useWizardFiles() {
  const [files, setFiles] = useState<EditFile[]>([]);

  const updateFile = useCallback((fileKey: number, update: (f: EditFile) => EditFile) => {
    setFiles((list) => list.map((f) => (f.key === fileKey ? update(f) : f)));
  }, []);

  const setAccount = useCallback(
    (fileKey: number, patch: Partial<AccountFields>) => updateFile(fileKey, (f) => ({ ...f, account: { ...f.account, ...patch } })),
    [updateFile],
  );

  const updateRow = useCallback(
    (fileKey: number, rowKey: number, patch: RowPatch) =>
      updateFile(fileKey, (f) => ({
        ...f,
        rows: f.rows.map((r) => (r.key === rowKey ? { ...r, ...patch, dup: null } : r)),
      })),
    [updateFile],
  );

  const deleteRows = useCallback(
    (fileKey: number, rowKeys: ReadonlySet<number>) => updateFile(fileKey, (f) => ({ ...f, rows: f.rows.filter((r) => !rowKeys.has(r.key)) })),
    [updateFile],
  );

  // 下に1行足す。日付は上の行と同じにする（同じ日の取引を書き足すことが多い）
  const insertBelow = useCallback(
    (fileKey: number, rowKey: number) =>
      updateFile(fileKey, (f) => {
        const i = f.rows.findIndex((r) => r.key === rowKey);
        const row: EditRow = { key: newKey(), date: f.rows[i]?.date ?? '', description: '', amountOut: '', amountIn: '', balance: '', dup: null };
        return { ...f, rows: [...f.rows.slice(0, i + 1), row, ...f.rows.slice(i + 1)] };
      }),
    [updateFile],
  );

  const move = useCallback(
    (fileKey: number, rowKey: number, delta: -1 | 1) =>
      updateFile(fileKey, (f) => {
        const i = f.rows.findIndex((r) => r.key === rowKey);
        const j = i + delta;
        if (i < 0 || j < 0 || j >= f.rows.length) return f;
        const rows = [...f.rows];
        [rows[i], rows[j]] = [rows[j]!, rows[i]!];
        return { ...f, rows };
      }),
    [updateFile],
  );

  // POST /cases/:id/import/check の結果を当てる。送ったときと同じ並び（ファイル・行）で返ってくる
  const applyDuplicateCheck = useCallback((results: DuplicateCheck[]) => {
    setFiles((list) =>
      list.map((f, i) => {
        const result = results[i];
        if (!result || result.marks.length !== f.rows.length) return f;
        return {
          ...f,
          warning: result.warning?.message ?? null,
          rows: f.rows.map((r, j) => {
            const m = result.marks[j]!;
            return { ...r, dup: m.isDuplicate ? (m.dupConfidence ?? 'high') : null };
          }),
        };
      }),
    );
  }, []);

  return { files, setFiles, setAccount, updateRow, deleteRows, insertBelow, move, applyDuplicateCheck };
}

export type WizardFiles = ReturnType<typeof useWizardFiles>;
