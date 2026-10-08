// 取込ウィザード（Django: import-wizard）。1 ファイルを選ぶ → 2 口座を決める → 3 内容を直して取り込む
//
// Django 版との違い（直したもの）:
// - 手順を戻っても直した値・消した行が残る（Django 版は描き直して元に戻っていた）
// - 既存の口座は各ファイルの選択欄から選べる（Django 版のボタンは :hover の中にあって押せなかった）
// - 残高の誤差は直すたびに数え直す（「再計算」ボタンが要らない）
// - 重複は手順2で決めた口座で判定し直す（Django 版はファイルから読めた口座番号のままだった）
// - 重複の行も画面からは消さずに全部送り、除外するかはサーバが DB の最新の状態で決める
//   （Django 版は画面側で重複を落としていたので、直して重複でなくなった行まで捨てていた）
// - xlsx も選べる（サーバは読めるのに、Django 版の画面は .csv しか選ばせなかった）

import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Upload } from 'lucide-react';
import { FileDrop } from '../components/FileDrop';
import { Breadcrumb } from '../components/Layout';
import { useNotice } from '../components/Notice';
import { useApiData } from '../hooks/useApiData';
import { ApiError, api, errorMessage } from '../lib/api';
import { num } from '../lib/format';
import type { CaseDetail } from '../types';
import type { PreviewFile } from '../../server/lib/wizard';
import type { ImportErrorDict } from '../../server/lib/import/errors';
import { AccountForm, AccountTypeOptions } from './import/AccountForm';
import { PreviewTable } from './import/PreviewTable';
import { useWizardFiles, type DuplicateCheck } from './import/useWizardFiles';
import { checkRows, toCommitFile, toEditFiles } from './import/wizardRows';

const MAX_FILES = 10;
const ACCEPT = /\.(csv|xlsx)$/i;
const STEPS = ['ファイル選択', '口座の確認', '内容の確認'] as const;
type Step = 1 | 2 | 3;

function Stepper({ step }: { step: Step }) {
  return (
    <ol className="mb-4 flex flex-wrap gap-2 text-sm">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const state = n < step ? 'done' : n === step ? 'current' : 'todo';
        return (
          <li
            key={label}
            aria-current={state === 'current' ? 'step' : undefined}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 ${
              state === 'current' ? 'bg-blue-600 font-semibold text-white' : state === 'done' ? 'bg-blue-100 text-blue-900' : 'bg-slate-100 text-slate-500'
            }`}
          >
            {state === 'done' ? <Check size={14} /> : <span>{n}</span>}
            {label}
          </li>
        );
      })}
    </ol>
  );
}

// 読み取りエラーの詳細（どの行・どの列・どう直すか）
function ParseErrorBox({ message, details }: { message: string; details: ImportErrorDict | null }) {
  const facts = details
    ? [
        ['行', details.line_number],
        ['列', details.column_name],
        ['期待する値', details.expected_value],
        ['実際の値', details.actual_value],
        ['値の例', details.sample_values.length ? details.sample_values.join('、') : null],
        ['試した文字コード', details.tried_encodings.length ? details.tried_encodings.join('、') : null],
      ].filter(([, v]) => v !== null && v !== '')
    : [];
  return (
    <div role="alert" className="mt-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
      {details && <p className="mb-1 text-xs font-semibold">{details.type_label}</p>}
      <p className="font-semibold">{message}</p>
      {facts.length > 0 && (
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
          {facts.map(([k, v]) => (
            <div key={String(k)} className="contents">
              <dt className="text-red-700">{k}</dt>
              <dd>{String(v)}</dd>
            </div>
          ))}
        </dl>
      )}
      {details?.suggestion && <p className="mt-2">{details.suggestion}</p>}
    </div>
  );
}

const sameFiles = (a: File[], b: File[] | null) => b !== null && a.length === b.length && a.every((f, i) => f === b[i]);

export function ImportWizardPage() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const notice = useNotice();
  const { data, error: loadError } = useApiData(`case-${caseId}`, () => api.get<{ case: CaseDetail }>(`/cases/${caseId}`));
  const caseData = data?.case;

  const [step, setStep] = useState<Step>(1);
  const [picked, setPicked] = useState<File[]>([]);
  // いまの手順2・3の中身を作ったファイル。選び直していなければ読み直さない（直した値を残すため）
  const [parsedFrom, setParsedFrom] = useState<File[] | null>(null);
  const [parseError, setParseError] = useState<{ message: string; details: ImportErrorDict | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [showRequired, setShowRequired] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [allowNoBalance, setAllowNoBalance] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);
  const wizard = useWizardFiles();

  const checked = useMemo(() => new Map(wizard.files.map((f) => [f.key, checkRows(f.rows, f.hasBalance)])), [wizard.files]);
  const summary = useMemo(() => {
    const all = [...checked.values()].flat().filter((r) => !r.blank);
    const duplicates = all.filter((r) => r.dup).length;
    return {
      rows: all.length,
      duplicates,
      balanceErrors: all.filter((r) => r.isBalanceError).length,
      inputErrors: all.filter((r) => r.error).length,
      toImport: all.length - (skipDuplicates ? duplicates : 0),
    };
  }, [checked, skipDuplicates]);
  const noBalanceFiles = wizard.files.filter((f) => !f.hasBalance);
  const missingAccount = wizard.files.some((f) => f.account.accountNumber.trim() === '');

  const parse = async () => {
    setParseError(null);
    if (picked.length === 0) return setParseError({ message: 'ファイルを選択してください。', details: null });
    if (picked.length > MAX_FILES) return setParseError({ message: `一度に選べるのは${MAX_FILES}ファイルまでです。`, details: null });
    const wrong = picked.find((f) => !ACCEPT.test(f.name));
    if (wrong) return setParseError({ message: `「${wrong.name}」は CSV・Excel（.xlsx）ではありません。`, details: null });
    if (sameFiles(picked, parsedFrom)) return setStep(2);

    const form = new FormData();
    picked.forEach((f, i) => form.append(`file_${i}`, f));
    setBusy(true);
    try {
      const res = await api.post<{ files: PreviewFile[] }>(`/cases/${caseId}/import/parse`, form);
      wizard.setFiles(toEditFiles(res.files));
      setParsedFrom(picked);
      setShowRequired(false);
      setAllowNoBalance(false);
      setStep(2);
    } catch (e) {
      setParseError({ message: errorMessage(e), details: e instanceof ApiError ? (e.details as ImportErrorDict | null) : null });
    } finally {
      setBusy(false);
    }
  };

  // 重複は手順2で決めた口座で判定し直してから見せる（プレビューはファイルから読めた口座番号で
  // 判定しているので、口座を選んだファイルは「重複 0件」のままになる）。
  // 判定し直せなくても先へは進める（確定時にサーバがもう一度判定する）
  const toPreview = async () => {
    if (missingAccount) return setShowRequired(true);
    setBusy(true);
    try {
      const res = await api.post<{ files: DuplicateCheck[] }>(`/cases/${caseId}/import/check`, { files: wizard.files.map(toCommitFile) });
      wizard.applyDuplicateCheck(res.files);
    } catch {
      // 入力エラーの行があるときなど。手順3の表に理由が出る
    } finally {
      setBusy(false);
    }
    setStep(3);
  };

  const commitBlockers = [
    summary.inputErrors > 0 && `入力エラーの行が${summary.inputErrors}行あります。直すか削除してください。`,
    summary.rows === 0 && '取り込む行がありません。',
    noBalanceFiles.length > 0 && !allowNoBalance && '残高の列が無いファイルがあります。下の確認にチェックを入れてください。',
  ].filter((m): m is string => typeof m === 'string');

  const commit = async () => {
    if (commitBlockers.length) return;
    setBusy(true);
    setCommitError(null);
    try {
      const res = await api.post<{ message: string }>(`/cases/${caseId}/import/commit`, {
        files: wizard.files.map(toCommitFile),
        skipDuplicates,
      });
      notice.success(res.message);
      navigate(`/cases/${caseId}`);
    } catch (e) {
      setCommitError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Breadcrumb
        items={[{ label: '案件一覧', to: '/' }, { label: caseData?.name ?? '案件', to: `/cases/${caseId}` }, { label: '取込ウィザード' }]}
      />
      <h1 className="mb-3 text-xl font-bold">通帳データの取込</h1>
      <Stepper step={step} />
      {loadError && <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-800">{loadError}</p>}
      <AccountTypeOptions />

      {step === 1 && (
        <div className="card p-6">
          <h2 className="mb-3 font-semibold">取り込むファイルを選ぶ</h2>
          <FileDrop
            accept=".csv,.xlsx"
            multiple
            files={picked}
            onChange={(f) => {
              setPicked(f);
              setParseError(null);
            }}
            hint={`CSV・Excel（.xlsx）、${MAX_FILES}ファイル・各10MBまで`}
            invalid={parseError !== null}
          />
          {parsedFrom && !sameFiles(picked, parsedFrom) && (
            <p className="mt-3 text-sm text-amber-800">ファイルを選び直したので、口座と内容の修正は最初からやり直しになります。</p>
          )}
          {parseError && <ParseErrorBox {...parseError} />}
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => navigate(`/cases/${caseId}`)}>
              キャンセル
            </button>
            <button type="button" className="btn btn-primary" onClick={parse} disabled={busy}>
              {busy ? '読み込み中…' : '次へ'}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          {wizard.files.some((f) => f.isSplit) && (
            <p className="rounded bg-sky-50 px-3 py-2 text-sm text-sky-900">1つのファイルに複数の口座があったので、口座ごとに分けました。</p>
          )}
          {wizard.files.map((f, i) => (
            <section key={f.key} className="card p-4" aria-label={f.filename}>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <h3 className="font-semibold">{f.filename}</h3>
                <span className="text-sm text-slate-500">{num(f.rows.length)}行</span>
                {f.isSplit && <span className="rounded bg-sky-100 px-1.5 py-0.5 text-xs text-sky-900">分割</span>}
                {f.detected && <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-900">口座番号を自動検出</span>}
              </div>
              <AccountForm
                idPrefix={`acc-${i}`}
                account={f.account}
                existing={caseData?.accounts ?? []}
                onChange={(patch) => wizard.setAccount(f.key, patch)}
                showRequired={showRequired}
              />
            </section>
          ))}
          {showRequired && missingAccount && <p className="text-sm text-red-700">口座番号が空のファイルがあります。</p>}
          <div className="flex justify-between gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>
              <ArrowLeft size={16} />
              戻る
            </button>
            <button type="button" className="btn btn-primary" onClick={toPreview} disabled={busy}>
              {busy ? '確認中…' : '次へ'}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <dl className="card grid grid-cols-2 gap-3 p-4 text-center sm:grid-cols-5">
            {[
              ['ファイル', wizard.files.length, ''],
              ['総行数', summary.rows, ''],
              ['取り込む見込み', summary.toImport, 'text-blue-800'],
              ['重複', summary.duplicates, summary.duplicates ? 'text-slate-700' : ''],
              ['残高の誤差', summary.balanceErrors, summary.balanceErrors ? 'text-amber-800' : ''],
            ].map(([label, value, color]) => (
              <div key={label}>
                <dt className="text-xs text-slate-500">{label}</dt>
                <dd className={`text-2xl font-bold tabular-nums ${color}`}>{num(value as number)}</dd>
              </div>
            ))}
          </dl>

          {wizard.files.map((f) => (
            <PreviewTable key={f.key} file={f} rows={checked.get(f.key) ?? []} actions={wizard} />
          ))}

          <div className="card space-y-2 p-4">
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" checked={skipDuplicates} onChange={(e) => setSkipDuplicates(e.target.checked)} />
              <span>
                取込済みの取引と重複する行は取り込まない
                <span className="block text-xs text-slate-500">重複かどうかは、取り込む時点の案件の取引でもう一度判定します。</span>
              </span>
            </label>
            {noBalanceFiles.length > 0 && (
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-1" checked={allowNoBalance} onChange={(e) => setAllowNoBalance(e.target.checked)} />
                <span>
                  残高の列が無いファイル（{noBalanceFiles.map((f) => f.filename).join('、')}）をこのまま取り込む
                  <span className="block text-xs text-slate-500">残高の突き合わせができないため、金額の読み違いに気づけません。</span>
                </span>
              </label>
            )}
            {commitBlockers.map((m) => (
              <p key={m} className="text-sm text-amber-800">
                {m}
              </p>
            ))}
            {commitError && (
              <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-800">
                {commitError}
              </p>
            )}
          </div>

          <div className="flex justify-between gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setStep(2)}>
              <ArrowLeft size={16} />
              戻る
            </button>
            <button type="button" className="btn btn-success" onClick={commit} disabled={busy || commitBlockers.length > 0}>
              <Upload size={16} />
              {busy ? '取り込み中…' : `${num(summary.toImport)}件を取り込む`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
