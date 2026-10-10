// 直接入力（Django: direct-input）。CSV を使わず、1つの口座の取引を手で打ち込む。
// 表は取込ウィザードの手順3と同じもの（PreviewTable）を使い、確定も同じ経路（/import/commit）を通す。
//
// Django 版との違い（直したもの）:
// - 口座番号を必須にする（Django 版は銀行名だけ必須で、口座番号が空だと「不明」の口座へ
//   まとめて入り、残高の突き合わせも資金移動の判定も別の口座と混ざった）
// - 金額は「1,000」のようなカンマ入りも読み、読めない値は行番号つきで止める
//   （Django 版は type=number の欄で、読めない値は黙って 0 円になった）
// - 日付だけの行は登録しない（Django 版は 0 円の取引として登録していた）。日付が空で
//   他が埋まっている行は止める（Django 版は黙って捨てていた）
// - 残高を入れれば、その場で計算上の残高と突き合わせる
// - 取込済みの取引との重複を確かめられる（Django 版の直接入力は重複を見ずに全部入れた）
// - 既存の口座を選んでも4項目は直せる（Django 版は読み取り専用になり、「新規入力」に
//   戻すと4項目とも消えた）

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Search, Upload } from 'lucide-react';
import { Breadcrumb } from '../components/Layout';
import { useNotice } from '../components/Notice';
import { useApiData } from '../hooks/useApiData';
import { api, errorMessage } from '../lib/api';
import { num } from '../lib/format';
import type { CaseDetail } from '../types';
import { AccountForm, AccountTypeOptions } from './import/AccountForm';
import { PreviewTable } from './import/PreviewTable';
import { useWizardFiles, type DuplicateCheck } from './import/useWizardFiles';
import { blankRow, checkRows, EMPTY_ACCOUNT, newKey, toCommitFile, type EditFile } from './import/wizardRows';

const INITIAL_ROWS = 5;
const ADD_ROWS = 5;

const emptySheet = (): EditFile => ({
  key: newKey(),
  filename: '入力する取引',
  isSplit: false,
  detected: false,
  hasBalance: true,
  account: { ...EMPTY_ACCOUNT },
  rows: Array.from({ length: INITIAL_ROWS }, () => blankRow()),
});

export function DirectInputPage() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const notice = useNotice();
  const { data, error: loadError } = useApiData(`case-${caseId}`, () => api.get<{ case: CaseDetail }>(`/cases/${caseId}`));
  const caseData = data?.case;

  const sheet = useWizardFiles();
  useEffect(() => sheet.setFiles([emptySheet()]), [sheet.setFiles]);
  const file = sheet.files[0];

  const [showRequired, setShowRequired] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [busy, setBusy] = useState<'check' | 'commit' | null>(null);
  const [checkedOnce, setCheckedOnce] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const rows = useMemo(() => (file ? checkRows(file.rows, true) : []), [file]);
  const filled = rows.filter((r) => !r.blank);
  const inputErrors = filled.filter((r) => r.error).length;
  const duplicates = filled.filter((r) => r.dup).length;
  const missingAccount = !file || file.account.accountNumber.trim() === '';
  const toImport = filled.length - (skipDuplicates ? duplicates : 0);

  // 打ちかけのまま閉じない
  useEffect(() => {
    if (filled.length === 0) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [filled.length]);

  const blockers = [
    showRequired && missingAccount && '口座番号を入力してください。',
    inputErrors > 0 && `入力エラーの行が${inputErrors}行あります。直すか削除してください。`,
  ].filter((m): m is string => typeof m === 'string');

  const ready = () => {
    setSubmitError(null);
    if (missingAccount) {
      setShowRequired(true);
      document.getElementById('direct-accountNumber')?.focus();
      return false;
    }
    if (filled.length === 0) {
      setSubmitError('登録するデータがありません。');
      return false;
    }
    return inputErrors === 0;
  };

  const checkDuplicates = async () => {
    if (!file || !ready()) return;
    setBusy('check');
    try {
      const res = await api.post<{ files: DuplicateCheck[] }>(`/cases/${caseId}/import/check`, { files: [toCommitFile(file)] });
      sheet.applyDuplicateCheck(res.files);
      setCheckedOnce(true);
    } catch (e) {
      setSubmitError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const commit = async () => {
    if (!file || !ready()) return;
    setBusy('commit');
    try {
      const res = await api.post<{ message: string }>(`/cases/${caseId}/import/commit`, { files: [toCommitFile(file)], skipDuplicates });
      sheet.setFiles([]);
      notice.success(res.message);
      navigate(`/cases/${caseId}`);
    } catch (e) {
      setSubmitError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Breadcrumb items={[{ label: '案件一覧', to: '/' }, { label: caseData?.name ?? '案件', to: `/cases/${caseId}` }, { label: '直接入力' }]} />
      <h1 className="mb-1 text-xl font-bold">取引データの直接入力</h1>
      <p className="mb-4 text-sm text-slate-600">CSV を使わず、1つの口座の取引を打ち込みます。摘要・金額・残高が空の行は登録しません。</p>
      {loadError && <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-800">{loadError}</p>}
      <AccountTypeOptions />

      {file && (
        <div className="space-y-4">
          <section className="card p-4" aria-label="口座">
            <h2 className="mb-3 font-semibold">口座</h2>
            <AccountForm
              idPrefix="direct"
              account={file.account}
              existing={caseData?.accounts ?? []}
              onChange={(patch) => sheet.setAccount(file.key, patch)}
              showRequired={showRequired}
            />
          </section>

          <PreviewTable file={file} rows={rows} actions={sheet} />

          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => sheet.appendRows(file.key, ADD_ROWS)}>
              <Plus size={14} />
              {ADD_ROWS}行足す
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={checkDuplicates} disabled={busy !== null}>
              <Search size={14} />
              {busy === 'check' ? '確認中…' : '取込済みの取引との重複を確かめる'}
            </button>
            {checkedOnce && <span className="self-center text-sm text-slate-600">重複 {num(duplicates)}行</span>}
          </div>

          <div className="card space-y-2 p-4">
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" checked={skipDuplicates} onChange={(e) => setSkipDuplicates(e.target.checked)} />
              <span>
                取込済みの取引と重複する行は登録しない
                <span className="block text-xs text-slate-500">重複かどうかは、登録する時点の案件の取引で判定します。</span>
              </span>
            </label>
            {blockers.map((m) => (
              <p key={m} className="text-sm text-amber-800">
                {m}
              </p>
            ))}
            {submitError && (
              <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-800">
                {submitError}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => navigate(`/cases/${caseId}`)}>
              キャンセル
            </button>
            <button type="button" className="btn btn-success" onClick={commit} disabled={busy !== null || inputErrors > 0 || filled.length === 0}>
              <Upload size={16} />
              {busy === 'commit' ? '登録中…' : filled.length === 0 ? '登録する' : `${num(toImport)}件を登録する`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
