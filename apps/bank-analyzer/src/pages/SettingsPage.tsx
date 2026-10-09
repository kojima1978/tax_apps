// 全体の設定（Django: settings_view・settings.html）。分析パラメータと、全案件共通の分類パターン。
//
// Django 版から直したもの:
// - 分析パラメータを保存すると、そのときの分類パターンまで一緒に書き戻していた（一度保存すると
//   コード側の既定パターンを直しても反映されなくなる）→ 保存はパラメータだけ
//   （server/services/settings.ts。画面もパラメータの欄しか送らない）
// - 入力に誤りがあると画面全体が作り直され、同時に直していた他の欄も元へ戻っていた
//   → 欄ごとのメッセージ（400 の errors）だけを出し、入力は残す
// - 「いつ効く設定なのか」が画面に無かった。閾値を変えても分類済みの取引が変わらない理由が
//   分からないため、どちらの種類かを節ごとに書く（多額取引・資金移動は表示のたびに判定、
//   贈与判定・ファジーは取込と自動分類のときに使う）
// - 既定値が画面のどこにも無く、触ったあとで元の値に戻せなかった → 欄ごとに既定値を出す

import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Coins, Gift, Save, Search, Settings as SettingsIcon, Tags } from 'lucide-react';
import { Breadcrumb } from '../components/Layout';
import { useNotice } from '../components/Notice';
import { useApiData } from '../hooks/useApiData';
import { ApiError, api, errorMessage } from '../lib/api';
import { num } from '../lib/format';
import { PatternManager, type PatternChange } from './analysis/PatternManager';
import { STANDARD_CATEGORIES } from '../../server/lib/categories';
import type { PatternItem } from './analysis/types';

type Settings = {
  largeAmountThreshold: number;
  transferDaysWindow: number;
  transferTolerance: number;
  transferDateMode: 'after_only' | 'both';
  giftThreshold: number;
  fuzzy: { enabled: boolean; threshold: number; useTokenSetRatio: boolean };
};
type Loaded = { settings: Settings; patterns: PatternItem[] };

// 欄の定義（範囲は server/services/settings.ts の RANGES と同じ。検証はサーバが行う）
const NUM_FIELDS = {
  largeAmountThreshold: { label: '多額取引の閾値（円）', help: 'この金額以上の取引を「多額取引」として検出します', min: 0, max: 1_000_000_000, def: 500_000 },
  transferDaysWindow: { label: '資金移動 検出期間（日）', help: 'この期間内にある出金と入金の組を資金移動として検出します', min: 0, max: 30, def: 3 },
  transferTolerance: { label: '資金移動 金額許容誤差（円）', help: '出金額と入金額の差がこの範囲内であれば資金移動と判定します', min: 0, max: undefined, def: 1000 },
  giftThreshold: { label: '贈与判定の閾値（円）', help: 'この金額以上の振込を「贈与・教育費」の候補として自動分類します', min: 0, max: 1_000_000_000, def: 1_000_000 },
  fuzzyThreshold: { label: 'ファジーマッチング 類似度閾値', help: '0〜100。高いほど厳密に一致する必要があります（推奨: 80〜95）', min: 0, max: 100, def: 90 },
} as const;
type NumField = keyof typeof NUM_FIELDS;

const MODES = [
  { value: 'after_only', label: '出金日以降の入金のみ（推奨）' },
  { value: 'both', label: '出金日の前後を検索' },
] as const;

type Form = Record<NumField, string> & { transferDateMode: string; fuzzyEnabled: boolean };

const toForm = (s: Settings): Form => ({
  largeAmountThreshold: String(s.largeAmountThreshold),
  transferDaysWindow: String(s.transferDaysWindow),
  transferTolerance: String(s.transferTolerance),
  giftThreshold: String(s.giftThreshold),
  fuzzyThreshold: String(s.fuzzy.threshold),
  transferDateMode: s.transferDateMode,
  fuzzyEnabled: s.fuzzy.enabled,
});

function NumberField({ name, value, error, onChange }: { name: NumField; value: string; error: string | undefined; onChange: (v: string) => void }) {
  const { label, help, min, max, def } = NUM_FIELDS[name];
  const id = `set-${name}`;
  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="number"
        className={`input ${error ? 'border-red-400' : ''}`}
        value={value}
        min={min}
        max={max}
        step={1}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-help`}
      />
      <p id={`${id}-help`} className="mt-1 text-xs text-slate-500">
        {help}（既定: {num(def)}）
      </p>
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

// 節の見出し。いつ効く設定なのかを添える
function Section({ icon: Icon, title, note, children }: { icon: typeof Coins; title: string; note: string; children: ReactNode }) {
  return (
    <section className="border-t border-slate-200 px-4 py-4 sm:px-6">
      <h3 className="flex flex-wrap items-center gap-x-2 text-sm font-semibold">
        <Icon size={16} className="text-slate-500" aria-hidden="true" />
        {title}
        <small className="font-normal text-slate-500">{note}</small>
      </h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function AnalysisParamsForm({ settings, onSaved }: { settings: Settings; onSaved: (s: Settings) => void }) {
  const notice = useNotice();
  const base = useMemo(() => toForm(settings), [settings]);
  const [form, setForm] = useState<Form>(base);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  // 保存が通ると新しい値が「開いたときの形」になる（入力欄もそこへ合わせる）
  const [lastBase, setLastBase] = useState(base);
  if (lastBase !== base) {
    setLastBase(base);
    setForm(base);
  }

  const dirty = JSON.stringify(form) !== JSON.stringify(base);
  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));
  const field = (name: NumField) => (
    <NumberField key={name} name={name} value={form[name]} error={errors[name]} onChange={(v) => set({ [name]: v } as Partial<Form>)} />
  );

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      // 値は打ったままの文字列で送る（画面で数値に直すと、空欄が 0 円として通ってしまう）
      const res = await api.put<{ settings: Settings; message: string }>('/settings/analysis', { ...form });
      setErrors({});
      notice.success(res.message);
      onSaved(res.settings);
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.errors);
      notice.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card" onSubmit={submit} noValidate>
      <h2 className="px-4 py-3 font-semibold sm:px-6">分析パラメータ</h2>
      <Section icon={Coins} title="多額取引・資金移動" note="保存するとすぐに効きます（分析画面を開くたびに判定し直します）">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(['largeAmountThreshold', 'transferDaysWindow', 'transferTolerance'] as const).map(field)}
          <div>
            <label className="label" htmlFor="set-transferDateMode">
              資金移動 日付マッチング
            </label>
            <select
              id="set-transferDateMode"
              className={`input ${errors.transferDateMode ? 'border-red-400' : ''}`}
              value={form.transferDateMode}
              onChange={(e) => set({ transferDateMode: e.target.value })}
              aria-describedby="set-transferDateMode-help"
            >
              {MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <p id="set-transferDateMode-help" className="mt-1 text-xs text-slate-500">
              「出金日以降」は出金日〜+N日の入金のみ、「前後」は±N日の入金を組にします
            </p>
            {errors.transferDateMode && (
              <p role="alert" className="mt-1 text-xs text-red-700">
                {errors.transferDateMode}
              </p>
            )}
          </div>
        </div>
      </Section>
      <Section icon={Gift} title="贈与判定" note="取込と自動分類のときに使います（すでに分類済みの取引は変わりません）">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{field('giftThreshold')}</div>
      </Section>
      <Section icon={Search} title="ファジーマッチング" note="取込と自動分類のときに使います（すでに分類済みの取引は変わりません）">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-0.5" checked={form.fuzzyEnabled} onChange={(e) => set({ fuzzyEnabled: e.target.checked })} />
            <span>
              ファジーマッチングを有効にする
              <span className="mt-1 block text-xs text-slate-500">摘要がキーワードと完全に一致しなくても、似ていれば分類の候補にします</span>
            </span>
          </label>
          {field('fuzzyThreshold')}
        </div>
      </Section>
      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 px-4 py-3 sm:px-6">
        {dirty && <span className="text-xs text-amber-700">保存していない変更があります</span>}
        <button type="submit" className="btn btn-primary" disabled={busy}>
          <Save size={16} />
          {busy ? '保存中…' : '分析パラメータを保存'}
        </button>
      </div>
    </form>
  );
}

export function SettingsPage() {
  const { data, error, loading, reload, setData } = useApiData('settings', () => api.get<Loaded>('/settings'));

  // 設定画面はグローバルのパターンだけを扱う（案件固有は分析画面の分類候補タブ）
  const savePatterns = async (changes: PatternChange[]) => {
    const res = await api.post<{ savedCount: number }>('/settings/patterns/bulk', { changes });
    return { savedCount: res.savedCount, totalCount: changes.length, errors: null };
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-6">
      <Breadcrumb items={[{ label: '案件一覧', to: '/' }, { label: '設定' }]} />
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <SettingsIcon size={20} className="text-slate-500" aria-hidden="true" />
          設定
        </h1>
        <p className="mt-1 text-sm text-slate-500">ここの設定は全案件に効きます。案件ごとのキーワードは分析画面の「分類候補」タブで足します。</p>
      </div>
      {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      {loading && !data && <p className="py-8 text-center text-slate-500">読み込み中…</p>}
      {data && (
        <>
          <AnalysisParamsForm settings={data.settings} onSaved={(settings) => setData({ ...data, settings })} />
          <div className="card">
            <h2 className="flex flex-wrap items-center gap-x-2 border-b border-slate-200 px-4 py-3 font-semibold sm:px-6">
              <Tags size={16} className="text-slate-500" aria-hidden="true" />
              自動分類パターン（全案件共通）
              <small className="font-normal text-slate-500">候補と自動分類はここのキーワードから作られます</small>
            </h2>
            <div className="p-4 sm:p-6">
              <PatternManager globalPatterns={data.patterns} categories={[...STANDARD_CATEGORIES]} save={savePatterns} onSaved={reload} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
