// 取引1件の編集・追加と、パターン登録のダイアログ（Django: analysis.html の editModal /
// addTransactionModal / patternAddModal）。取引一覧のほか、未分類・質問候補のタブからも開く。
//
// Django 版との違い（直したもの）:
// - 編集の保存は、変えた欄だけを送る（全欄を送ると、開いている間に別の画面で変わった欄を巻き戻す）
// - 保存後の「何が変わったか」は、サーバーが返した保存後の値と開いたときの値から作る
//   （Django は送った値と比べていたので、サーバーが整えた値（空白の除去など）とずれることがあった）
// - 口座の欄（銀行名・支店名・種別・口座番号）は取引ではなく口座そのものを変える。同じ口座の
//   他の取引にも及ぶことを、変えたときに欄の下に出す（Django は黙って全件に及んでいた）
// - 失敗の理由はダイアログの中に出す（ダイアログは最前面なので、画面上部の通知は隠れて見えない）

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowRight, Globe, FolderOpen, Star, Tags } from 'lucide-react';
import { Dialog } from '../../components/Dialog';
import { useNotice } from '../../components/Notice';
import { api, errorMessage } from '../../lib/api';
import { num, warekiShort } from '../../lib/format';
import { keywordCandidates } from './keywords';
import type { TxRow } from './types';

const UNCATEGORIZED = '未分類';

type FormValues = {
  bankName: string;
  branchName: string;
  accountType: string;
  accountNumber: string;
  date: string;
  description: string;
  amountOut: string;
  amountIn: string;
  balance: string;
  category: string;
  memo: string;
};
type Field = keyof FormValues;

const LABELS: Record<Field, string> = {
  bankName: '銀行名',
  branchName: '支店名',
  accountType: '種別',
  accountNumber: '口座番号',
  date: '日付',
  description: '摘要',
  amountOut: '払戻金額（出金）',
  amountIn: 'お預り金額（入金）',
  balance: '残高',
  category: '分類',
  memo: 'メモ',
};
const ACCOUNT_FIELDS: Field[] = ['bankName', 'branchName', 'accountType', 'accountNumber'];
const AMOUNT_FIELDS: Field[] = ['amountOut', 'amountIn', 'balance'];

const amountText = (n: number | null | undefined) => (n === null || n === undefined ? '' : num(n));

function toForm(t: Partial<TxRow>): FormValues {
  return {
    bankName: t.bankName ?? '',
    branchName: t.branchName ?? '',
    accountType: t.accountType ?? '',
    accountNumber: t.accountNumber ?? '',
    date: t.date ?? '',
    description: t.description ?? '',
    amountOut: amountText(t.amountOut ?? 0),
    amountIn: amountText(t.amountIn ?? 0),
    balance: amountText(t.balance),
    category: t.category ?? UNCATEGORIZED,
    memo: t.memo ?? '',
  };
}

// 比べるときの形（金額は桁区切りを外す・前後の空白は無視）
const norm = (field: Field, v: string) => (AMOUNT_FIELDS.includes(field) ? v.replace(/[,，\s]/g, '') : v.trim());

function displayValue(field: Field, v: string): string {
  if (!v) return '（空）';
  if (field === 'date') return warekiShort(v);
  return v;
}

// ---------------------------------------------------------------------------
// 欄の並び（編集と追加で共通）
// ---------------------------------------------------------------------------

function TxFields({
  values,
  set,
  categories,
  accountNote,
  onPattern,
  descriptionRef,
}: {
  values: FormValues;
  set: (field: Field, v: string) => void;
  categories: string[];
  accountNote?: ReactNode;
  onPattern?: () => void;
  descriptionRef?: React.RefObject<HTMLInputElement | null>;
}) {
  const text = (field: Field, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className="label" htmlFor={`tx-${field}`}>
        {LABELS[field]}
      </label>
      <input id={`tx-${field}`} className="input" value={values[field]} onChange={(e) => set(field, e.target.value)} autoComplete="off" {...extra} />
    </div>
  );
  const amount = (field: Field) =>
    text(field, {
      inputMode: 'numeric',
      className: 'input text-right tabular-nums',
      // 打ち終えたら桁区切りを付ける（読めない値はそのまま残してサーバーに理由を言わせる）
      onBlur: (e) => {
        const raw = norm(field, e.target.value);
        if (/^-?\d+$/.test(raw)) set(field, num(Number(raw)));
      },
    });
  // 一覧に無い分類（古いデータなど）でも、今の値を選べるように足す
  const options = categories.includes(values.category) ? categories : [values.category, ...categories];

  return (
    <div className="space-y-3">
      <fieldset className="rounded-md border border-slate-200 p-3">
        <legend className="px-1 text-xs font-semibold text-slate-500">口座</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {text('bankName')}
          {text('branchName')}
          {text('accountType')}
          {text('accountNumber')}
        </div>
        {accountNote}
      </fieldset>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
        {text('date', { type: 'date' })}
        <div>
          <label className="label" htmlFor="tx-description">
            {LABELS.description}
          </label>
          <input
            ref={descriptionRef}
            id="tx-description"
            className="input"
            value={values.description}
            onChange={(e) => set('description', e.target.value)}
            autoComplete="off"
            data-autofocus
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {amount('amountOut')}
        {amount('amountIn')}
        {amount('balance')}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="tx-category">
            {LABELS.category}
          </label>
          <div className="flex gap-2">
            <select id="tx-category" className="input" value={values.category} onChange={(e) => set('category', e.target.value)}>
              {options.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {onPattern && (
              <button
                type="button"
                className="btn btn-secondary btn-sm shrink-0"
                onClick={onPattern}
                disabled={values.category === UNCATEGORIZED || !values.description.trim()}
                title={values.category === UNCATEGORIZED ? '先に分類を選択してください' : 'この摘要を分類のキーワードに登録'}
              >
                <Tags size={14} />
                パターン登録
              </button>
            )}
          </div>
        </div>
        {text('memo')}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 編集
// ---------------------------------------------------------------------------

type Change = { field: Field; before: string; after: string };

export function TxEditDialog({
  caseId,
  tx,
  categories,
  onClose,
  onSaved,
  onPattern,
}: {
  caseId: number;
  tx: TxRow | null;
  categories: string[];
  onClose: () => void;
  onSaved: (tx: TxRow) => void;
  onPattern: (description: string, category: string) => void;
}) {
  const [values, setValues] = useState<FormValues>(() => toForm(tx ?? {}));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [changes, setChanges] = useState<Change[] | null>(null);
  const [saved, setSaved] = useState<TxRow | null>(null);

  // 開くたびに、その取引の値で作り直す
  useEffect(() => {
    if (!tx) return;
    setValues(toForm(tx));
    setError(null);
    setChanges(null);
    setSaved(null);
  }, [tx]);

  if (!tx) return null;
  const original = toForm(tx);
  const dirty = (Object.keys(LABELS) as Field[]).filter((f) => norm(f, values[f]) !== norm(f, original[f]));
  const accountChanged = dirty.some((f) => ACCOUNT_FIELDS.includes(f));
  const set = (field: Field, v: string) => setValues((s) => ({ ...s, [field]: v }));

  const close = () => {
    if (saved) onSaved(saved);
    onClose();
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (dirty.length === 0) {
      onClose();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const body = Object.fromEntries(dirty.map((f) => [f, values[f]]));
      const res = await api.patch<{ transaction: Omit<TxRow, 'isTransfer'> }>(`/cases/${caseId}/transactions/${tx.id}`, body);
      const after = { ...tx, ...res.transaction };
      const afterForm = toForm(after);
      setSaved(after);
      setChanges(
        (Object.keys(LABELS) as Field[])
          .filter((f) => norm(f, afterForm[f]) !== norm(f, original[f]))
          .map((f) => ({ field: f, before: displayValue(f, original[f]), after: displayValue(f, afterForm[f]) })),
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (changes) {
    return (
      <Dialog
        open
        onClose={close}
        title="保存完了"
        footer={
          <button type="button" className="btn btn-primary" onClick={close} data-autofocus>
            確認して閉じる
          </button>
        }
      >
        {changes.length === 0 ? (
          <p className="text-sm">変更はありませんでした。</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {changes.map((c) => (
              <li key={c.field} className="flex flex-wrap items-center gap-2">
                <span className="w-32 shrink-0 font-medium text-slate-600">{LABELS[c.field]}</span>
                <span className="text-slate-500 line-through">{c.before}</span>
                <ArrowRight size={14} aria-hidden="true" />
                <strong>{c.after}</strong>
              </li>
            ))}
          </ul>
        )}
      </Dialog>
    );
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="取引の編集"
      size="lg"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>
            キャンセル
          </button>
          <button type="submit" form="txEditForm" className="btn btn-primary" disabled={busy}>
            {busy ? '保存中…' : '保存'}
          </button>
        </>
      }
    >
      <form id="txEditForm" onSubmit={submit} noValidate>
        <p className="mb-3 rounded bg-amber-50 px-3 py-2 text-xs text-amber-900">日付や金額を変更すると、残高の整合性が取れなくなる可能性があります。</p>
        <TxFields
          values={values}
          set={set}
          categories={categories}
          onPattern={() => onPattern(values.description, values.category)}
          accountNote={
            accountChanged && (
              <p className="mt-2 text-xs text-amber-800" role="note">
                口座の欄は口座そのものを変えます。同じ口座の他の取引にも反映されます。
              </p>
            )
          }
        />
        {error && (
          <p role="alert" className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        )}
      </form>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// 追加
// ---------------------------------------------------------------------------

// 続けて追加するときに空へ戻す欄（口座と日付は残す: 同じ通帳の続きを打つ前提）
const CLEARED_ON_CONTINUE: Partial<FormValues> = { description: '', memo: '', amountOut: '0', amountIn: '0', balance: '', category: UNCATEGORIZED };

export function TxAddDialog({
  caseId,
  base,
  categories,
  onClose,
  onAdded,
}: {
  caseId: number;
  // null で閉じている。「この下に追加」なら元の行（日付と口座を引き継ぐ）
  base: Partial<TxRow> | null;
  categories: string[];
  onClose: () => void;
  onAdded: () => void;
}) {
  const [values, setValues] = useState<FormValues>(() => toForm({}));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(0);
  const descriptionRef = useRef<HTMLInputElement>(null);
  const continueRef = useRef(false);

  useEffect(() => {
    if (!base) return;
    setValues(
      toForm({
        date: base.date,
        bankName: base.bankName,
        branchName: base.branchName,
        accountType: base.accountType,
        accountNumber: base.accountNumber,
      }),
    );
    setError(null);
    setAdded(0);
  }, [base]);

  if (!base) return null;
  const set = (field: Field, v: string) => setValues((s) => ({ ...s, [field]: v }));

  const close = () => {
    if (added > 0) onAdded();
    onClose();
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const keepOpen = continueRef.current;
    continueRef.current = false;
    if (!values.accountNumber.trim()) {
      setError('口座番号を入力してください');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.post(`/cases/${caseId}/transactions`, values);
      setAdded((n) => n + 1);
      if (keepOpen) {
        setValues((s) => ({ ...s, ...CLEARED_ON_CONTINUE }));
        descriptionRef.current?.focus();
      } else {
        onAdded();
        onClose();
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onClose={close}
      title="取引の追加"
      size="lg"
      footer={
        <>
          {added > 0 && (
            <span className="mr-auto self-center text-sm text-emerald-700" role="status">
              {added}件追加しました
            </span>
          )}
          <button type="button" className="btn btn-secondary" onClick={close} disabled={busy}>
            {added > 0 ? '閉じる' : 'キャンセル'}
          </button>
          <button type="submit" form="txAddForm" className="btn btn-secondary" disabled={busy} onClick={() => (continueRef.current = true)}>
            続けて追加
          </button>
          <button type="submit" form="txAddForm" className="btn btn-primary" disabled={busy}>
            {busy ? '追加中…' : '追加'}
          </button>
        </>
      }
    >
      <form id="txAddForm" onSubmit={submit} noValidate>
        <TxFields values={values} set={set} categories={categories} descriptionRef={descriptionRef} />
        {error && (
          <p role="alert" className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        )}
      </form>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// パターン登録（摘要のキーワード → 分類）
// ---------------------------------------------------------------------------

export type PatternTarget = { description: string; category: string };

export function PatternAddDialog({ caseId, target, onClose }: { caseId: number; target: PatternTarget | null; onClose: () => void }) {
  const notice = useNotice();
  const [keyword, setKeyword] = useState('');
  const [scope, setScope] = useState<'global' | 'case'>('global');
  const [existing, setExisting] = useState<{ globalKeywords: string[]; caseKeywords: string[] } | 'error' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const candidates = target ? keywordCandidates(target.description) : [];

  useEffect(() => {
    if (!target) return;
    setKeyword(keywordCandidates(target.description)[0] ?? target.description);
    setScope('global');
    setError(null);
    setExisting(null);
    let cancelled = false;
    api
      .get<{ globalKeywords: string[]; caseKeywords: string[] }>(`/cases/${caseId}/patterns/keywords?category=${encodeURIComponent(target.category)}`)
      .then((r) => !cancelled && setExisting(r))
      .catch(() => !cancelled && setExisting('error'));
    return () => {
      cancelled = true;
    };
  }, [caseId, target]);

  if (!target) return null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const kw = keyword.trim();
    if (!kw) {
      setError('キーワードを入力してください');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<{ message: string }>(`/cases/${caseId}/patterns/add`, { category: target.category, keyword: kw, scope });
      notice.success(res.message);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="分類パターンに追加"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>
            キャンセル
          </button>
          <button type="submit" form="patternAddForm" className="btn btn-primary" disabled={busy}>
            {busy ? '追加中…' : '追加'}
          </button>
        </>
      }
    >
      <form id="patternAddForm" onSubmit={submit} noValidate className="space-y-4 text-sm">
        <div>
          <span className="label">摘要</span>
          <p className="rounded bg-slate-50 px-3 py-2 break-all">{target.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-600">登録先の分類</span>
          <span className="rounded bg-blue-700 px-2 py-0.5 text-white">{target.category}</span>
        </div>
        <div>
          <span className="label">登録済みのキーワード</span>
          {existing === null ? (
            <p className="text-xs text-slate-500">読み込み中…</p>
          ) : existing === 'error' ? (
            <p className="text-xs text-red-700">取得に失敗しました</p>
          ) : existing.globalKeywords.length + existing.caseKeywords.length === 0 ? (
            <p className="text-xs text-slate-500">まだありません</p>
          ) : (
            <div className="space-y-1">
              {(
                [
                  ['グローバル', existing.globalKeywords, 'bg-slate-200 text-slate-800'],
                  ['案件固有', existing.caseKeywords, 'bg-amber-200 text-slate-900'],
                ] as const
              ).map(
                ([label, kws, tone]) =>
                  kws.length > 0 && (
                    <div key={label} className="flex flex-wrap items-center gap-1">
                      <small className="text-slate-500">{label}:</small>
                      {kws.map((k) => (
                        <span key={k} className={`rounded px-1.5 text-xs ${tone}`}>
                          {k}
                        </span>
                      ))}
                    </div>
                  ),
              )}
            </div>
          )}
        </div>
        <div>
          <label className="label" htmlFor="patternKeyword">
            キーワード
          </label>
          {candidates.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1" aria-label="キーワードの候補">
              {candidates.map((c, i) => (
                <button
                  key={c}
                  type="button"
                  className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${keyword === c ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-slate-300 hover:bg-slate-50'}`}
                  aria-pressed={keyword === c}
                  onClick={() => setKeyword(c)}
                >
                  {i === 0 && <Star size={12} aria-label="おすすめ" />}
                  {c}
                </button>
              ))}
            </div>
          )}
          <input id="patternKeyword" className="input" value={keyword} onChange={(e) => setKeyword(e.target.value)} autoComplete="off" data-autofocus />
          <p className="mt-1 text-xs text-slate-500">摘要にこの文字を含む取引が、次の自動分類から「{target.category}」になります。</p>
        </div>
        <fieldset>
          <legend className="label">適用範囲</legend>
          <div className="flex flex-wrap gap-4">
            {(
              [
                ['global', 'グローバル', '全案件で使用', Globe],
                ['case', 'この案件のみ', '案件固有', FolderOpen],
              ] as const
            ).map(([value, label, note, Icon]) => (
              <label key={value} className="flex items-start gap-2">
                <input type="radio" name="patternScope" value={value} checked={scope === value} onChange={() => setScope(value)} className="mt-1" />
                <span>
                  <span className="flex items-center gap-1">
                    <Icon size={14} aria-hidden="true" />
                    {label}
                  </span>
                  <small className="block text-slate-500">{note}</small>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        {error && (
          <p role="alert" className="rounded bg-red-50 px-3 py-2 text-red-800">
            {error}
          </p>
        )}
      </form>
    </Dialog>
  );
}
