import { useRef, useState, type ChangeEvent } from 'react';
import { api } from '../api';
import { exportFileName } from '../exportFileName';
import { ErrorBanner, Modal, btn } from './ui';
import type { DirectorySummary, RestoreResult } from '../types';

// 台帳まるごとの JSON 控え（書き出し・復元）。住所・生年月日も入る

async function downloadBackup(subject: string): Promise<void> {
  const data = await api.exportBackup();
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = exportFileName(subject, 'json');
  link.click();
  // click() の直後に破棄するとダウンロードが始まる前に URL が消えることがある
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const SUMMARY_ROWS: { key: keyof DirectorySummary; label: string }[] = [
  { key: 'companies', label: '会社' },
  { key: 'departments', label: '部署' },
  { key: 'staff', label: '社員' },
  { key: 'activeStaff', label: '　うち在籍' },
  { key: 'withPersonal', label: '住所・生年月日あり' },
  { key: 'externalLinks', label: '他アプリとの対応' },
];

function formatExportedAt(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '不明' : d.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
}

// pickId: 選ぶたびに Modal を作り直す（showModal は Modal の mount 時にしか呼ばれない）
type Pending = { pickId: number; fileName: string; backup: unknown; preview: RestoreResult | null; error: string | null };

export default function BackupMenu() {
  const fileRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pickCount = useRef(0);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  // null = 復元の確認を開いていない
  const [pending, setPending] = useState<Pending | null>(null);
  const [restoring, setRestoring] = useState(false);

  async function exportNow() {
    setExporting(true);
    setExportError(null);
    try {
      await downloadBackup('バックアップ');
    } catch (err) {
      setExportError((err as Error).message);
    } finally {
      setExporting(false);
    }
  }

  // ファイルを選んだら、まずサーバで最後まで流して巻き戻し（preview）、件数を見せてから確定させる
  async function pick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // 同じファイルを選び直しても change が来るように
    if (!file) return;
    const pickId = ++pickCount.current;
    let backup: unknown;
    try {
      backup = JSON.parse(await file.text());
    } catch {
      setPending({ pickId, fileName: file.name, backup: null, preview: null, error: 'JSON として読めません' });
      return;
    }
    setPending({ pickId, fileName: file.name, backup, preview: null, error: null });
    // 確かめている間に閉じた／選び直した場合は、遅れて届いた結果を捨てる
    const settle = (patch: Partial<Pending>) => setPending((p) => (p?.pickId === pickId ? { ...p, ...patch } : p));
    try {
      settle({ preview: await api.previewRestore(backup) });
    } catch (err) {
      settle({ error: (err as Error).message });
    }
  }

  // 復元の直前に今の中身を書き出しておく（取り違えたファイルで上書きしても戻せるように）。
  // 書き出せなければ復元もしない
  async function restore() {
    if (!pending?.preview) return;
    setRestoring(true);
    try {
      await downloadBackup('復元前の控え');
      await api.restore(pending.backup);
      // 一覧・絞り込みの選択肢がすべて変わるので、画面ごと読み直す
      window.location.reload();
    } catch (err) {
      setPending((p) => (p ? { ...p, error: (err as Error).message } : p));
      setRestoring(false);
    }
  }

  return (
    <div className="ml-auto flex items-center gap-2">
      {exportError && <span className="text-sm text-red-600">{exportError}</span>}
      <button type="button" className={btn.secondary} onClick={exportNow} disabled={exporting}>
        JSONで書き出し
      </button>
      <button type="button" className={btn.secondary} onClick={() => fileRef.current?.click()}>
        JSONから復元
      </button>
      <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={pick} />

      {pending && (
        <Modal key={pending.pickId} title="JSONから復元" dialogRef={dialogRef} onClose={() => setPending(null)}>
          <p className="break-all text-sm text-slate-600">{pending.fileName}</p>
          {pending.preview ? (
            <>
              <p className="text-sm text-slate-600">書き出した日時: {formatExportedAt(pending.preview.exportedAt)}</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-1 text-left font-medium" />
                    <th className="py-1 text-right font-medium">今の台帳</th>
                    <th className="py-1 text-right font-medium">復元後</th>
                  </tr>
                </thead>
                <tbody>
                  {SUMMARY_ROWS.map((r) => {
                    const before = pending.preview!.current[r.key];
                    const after = pending.preview!.restored[r.key];
                    return (
                      <tr key={r.key} className="border-b border-slate-100">
                        <td className="py-1 text-slate-700">{r.label}</td>
                        <td className="py-1 text-right tabular-nums">{before}</td>
                        <td className={`py-1 text-right tabular-nums ${before === after ? '' : 'font-bold text-amber-700'}`}>
                          {after}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                今の台帳の中身はすべてこのファイルの内容に置き換わります（台帳IDはファイルのまま）。
                復元の直前に、今の中身を「復元前の控え」として書き出します。
              </p>
            </>
          ) : (
            !pending.error && <p className="text-sm text-slate-500">ファイルを確かめています…</p>
          )}
          <ErrorBanner message={pending.error} />
          <div className="flex justify-end gap-2">
            {/* close() の close イベントが届かない環境がある（アプリ内ブラウザで実測）。
                それに頼ると pending が残り、次にファイルを選んでもダイアログが開かない */}
            <button type="button" className={btn.secondary} onClick={() => setPending(null)} disabled={restoring}>
              やめる
            </button>
            <button type="button" className={btn.primary} onClick={restore} disabled={!pending.preview || restoring}>
              {restoring ? '復元しています…' : '復元する'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
