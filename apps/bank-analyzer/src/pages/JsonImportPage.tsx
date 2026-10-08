// JSON バックアップから新しい案件として復元（Django: import-json）

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Breadcrumb } from '../components/Layout';
import { FileDrop } from '../components/FileDrop';
import { useNotice } from '../components/Notice';
import { api, errorMessage } from '../lib/api';

type Result = { caseId: number; name: string; count: number; message: string };

export function JsonImportPage() {
  const navigate = useNavigate();
  const notice = useNotice();
  const [files, setFiles] = useState<File[]>([]);
  const [restoreSettings, setRestoreSettings] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const file = files[0];
    if (!file) {
      setError('JSONファイルを選択してください。');
      return;
    }
    const form = new FormData();
    form.append('file', file);
    if (restoreSettings) form.append('restoreSettings', 'true');
    setBusy(true);
    setError(null);
    try {
      const result = await api.post<Result>('/backups/import', form);
      notice.success(result.message);
      navigate(`/cases/${result.caseId}`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <Breadcrumb items={[{ label: '案件一覧', to: '/' }, { label: 'JSONから復元' }]} />
      <div className="card p-6">
        <h1 className="mb-4 text-xl font-bold">JSONバックアップから復元</h1>
        <ul className="mb-4 list-disc space-y-1 rounded-md bg-sky-50 py-3 pr-3 pl-8 text-sm text-sky-900">
          <li>加工済みの取引データ（分類・付箋・メモ含む）を復元できます</li>
          <li>書き出した時点の状態を再現します</li>
          <li>新しい案件として作成されます（既存の案件は変わりません）</li>
        </ul>
        <FileDrop accept=".json,application/json" files={files} onChange={setFiles} hint="最大50MB" invalid={error !== null && !files.length} />
        <label className="mt-4 flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" checked={restoreSettings} onChange={(e) => setRestoreSettings(e.target.checked)} />
          <span>
            設定データも復元する
            <span className="block text-xs text-amber-700">現在の設定（閾値・分類キーワード）がファイルの内容で上書きされます。</span>
          </span>
        </label>
        {error && <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/')}>
            キャンセル
          </button>
          <button type="button" className="btn btn-primary" onClick={submit} disabled={busy}>
            {busy ? '復元中…' : '復元を実行'}
          </button>
        </div>
      </div>
    </div>
  );
}
