// 分類パターン（摘要のキーワード → 分類）の管理（Django: _tab_ai.html の patternManager）。
// 全案件共通（グローバル）と、この案件だけの2列。キーワードの追加・削除・列の間の移動を
// 画面の上で溜めておき、「保存」でまとめて送る。設定画面からも save を差し替えて使う。
//
// Django 版との違い（直したもの）:
// - 溜めている変更を「操作の記録」で持っていたため、移してから元の列へ戻すと、形は元のままなのに
//   移動2回が「変更2件」として残り、そのまま送られていた。保存のときに「開いたときの形」と
//   「今の形」を比べて、差だけを送る
// - 保存の結果に失敗が混じっていても「N件の変更を保存しました」と出ていた（保存できた件数が
//   0件のときは、溜めていた件数をそのまま「保存した」と出していた）。できなかった件数と理由を出す
// - 読み直し（分類を当てたあとなど）で保存していない変更を消さない。変更があるうちは今の形を保つ

import { useEffect, useMemo, useState, type DragEvent, type FormEvent } from 'react';
import { ArrowLeftRight, FolderOpen, Globe, Plus, Save, Undo2, X } from 'lucide-react';
import { useAction } from '../../hooks/useAction';
import { useNotice } from '../../components/Notice';
import { num } from '../../lib/format';
import type { PatternScope } from './TxDialogs';
import type { PatternItem } from './types';

export type PatternChange =
  | { action: 'add' | 'delete'; category: string; keyword: string; scope: PatternScope }
  | { action: 'move'; category: string; keyword: string; fromScope: PatternScope; toScope: PatternScope };
export type PatternSaveResult = { savedCount: number; totalCount: number; errors: string[] | null };

// 分類 → キーワードの並び（列ごと）
type Column = Map<string, string[]>;
type Columns = Partial<Record<PatternScope, Column>>;

const SCOPE_INFO: Record<PatternScope, { label: string; note: string; Icon: typeof Globe; chip: string }> = {
  global: { label: 'グローバル', note: '全案件で使う', Icon: Globe, chip: 'bg-slate-100 text-slate-800 border-slate-300' },
  case: { label: 'この案件のみ', note: '案件固有', Icon: FolderOpen, chip: 'bg-amber-50 text-slate-900 border-amber-300' },
};
const DRAG_TYPE = 'application/x-bank-analyzer-pattern';

const toColumn = (items: PatternItem[]): Column => new Map(items.map((p) => [p.category, [...p.keywords]]));
const has = (col: Column | undefined, category: string, keyword: string) => col?.get(category)?.includes(keyword) ?? false;

function withKeyword(col: Column, category: string, keyword: string, on: boolean): Column {
  const next = new Map(col);
  const kws = next.get(category) ?? [];
  if (on) next.set(category, kws.includes(keyword) ? kws : [...kws, keyword]);
  else next.set(category, kws.filter((k) => k !== keyword));
  return next;
}

// 開いたときの形と今の形の差。片方の列から消えて、もう片方に現れたものは「移動」
export function diffPatterns(base: Columns, now: Columns): PatternChange[] {
  const scopes = (Object.keys(base) as PatternScope[]).filter((s) => now[s]);
  const pairs = new Map<string, [string, string]>();
  for (const s of scopes) {
    for (const col of [base[s], now[s]]) {
      for (const [category, kws] of col ?? []) for (const k of kws) pairs.set(JSON.stringify([category, k]), [category, k]);
    }
  }
  const changes: PatternChange[] = [];
  for (const [category, keyword] of pairs.values()) {
    const removed = scopes.filter((s) => has(base[s], category, keyword) && !has(now[s], category, keyword));
    const added = scopes.filter((s) => !has(base[s], category, keyword) && has(now[s], category, keyword));
    const [from, to] = [removed[0], added[0]];
    if (removed.length === 1 && added.length === 1 && from && to) {
      changes.push({ action: 'move', category, keyword, fromScope: from, toScope: to });
      continue;
    }
    for (const scope of removed) changes.push({ action: 'delete', category, keyword, scope });
    for (const scope of added) changes.push({ action: 'add', category, keyword, scope });
  }
  return changes;
}

const changeText = (c: PatternChange) =>
  c.action === 'move'
    ? `「${c.keyword}」（${c.category}）を${SCOPE_INFO[c.fromScope].label}から${SCOPE_INFO[c.toScope].label}へ`
    : `「${c.keyword}」（${c.category}）を${SCOPE_INFO[c.scope].label}${c.action === 'add' ? 'に追加' : 'から削除'}`;

export function PatternManager({
  globalPatterns,
  casePatterns,
  categories,
  save,
  onSaved,
}: {
  globalPatterns: PatternItem[];
  // 無ければグローバルの列だけ（設定画面）
  casePatterns?: PatternItem[];
  categories: string[];
  save: (changes: PatternChange[]) => Promise<PatternSaveResult>;
  onSaved: () => void;
}) {
  const notice = useNotice();
  const { busy, run } = useAction();
  const base = useMemo<Columns>(
    () => ({ global: toColumn(globalPatterns), ...(casePatterns ? { case: toColumn(casePatterns) } : {}) }),
    [globalPatterns, casePatterns],
  );
  const [now, setNow] = useState<Columns>(base);
  const changes = useMemo(() => diffPatterns(base, now), [base, now]);
  const dirty = changes.length > 0;

  // 読み直しで開いたときの形が変わったら、前の形から何も変えていないときだけ今の形も合わせる
  const [lastBase, setLastBase] = useState(base);
  if (lastBase !== base) {
    setLastBase(base);
    if (now === lastBase || diffPatterns(lastBase, now).length === 0) setNow(base);
  }

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const scopes = Object.keys(base) as PatternScope[];
  const [addScope, setAddScope] = useState<PatternScope>(casePatterns ? 'case' : 'global');
  const [addCategory, setAddCategory] = useState('');
  const [addKeyword, setAddKeyword] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<PatternScope | null>(null);

  const edit = (scope: PatternScope, category: string, keyword: string, on: boolean) =>
    setNow((n) => ({ ...n, [scope]: withKeyword(n[scope] ?? new Map(), category, keyword, on) }));
  const move = (from: PatternScope, to: PatternScope, category: string, keyword: string) =>
    setNow((n) => ({
      ...n,
      [from]: withKeyword(n[from] ?? new Map(), category, keyword, false),
      [to]: withKeyword(n[to] ?? new Map(), category, keyword, true),
    }));

  const add = (e: FormEvent) => {
    e.preventDefault();
    const category = addCategory.trim();
    const keyword = addKeyword.trim();
    if (!category || !keyword) return setAddError('分類とキーワードを入力してください');
    if (has(now[addScope], category, keyword)) return setAddError(`「${keyword}」は既に「${category}」にあります`);
    setAddError(null);
    edit(addScope, category, keyword, true);
    setAddKeyword('');
  };

  const submit = async () => {
    const res = await run('patterns', () => save(changes));
    if (!res) return;
    if (res.errors || res.savedCount < res.totalCount) {
      notice.error(`${num(res.totalCount)}件のうち${num(res.totalCount - res.savedCount)}件を保存できませんでした${res.errors ? `: ${res.errors.join(' / ')}` : ''}`);
    } else {
      notice.success(`パターンの変更${num(res.savedCount)}件を保存しました`);
    }
    // 保存できたものは開いたときの形に入るので、読み直せば差は残らない（できなかったものは消える）
    setNow(base);
    onSaved();
  };

  const onDrop = (to: PatternScope) => (e: DragEvent) => {
    e.preventDefault();
    setDropTarget(null);
    try {
      const { from, category, keyword } = JSON.parse(e.dataTransfer.getData(DRAG_TYPE)) as { from: PatternScope; category: string; keyword: string };
      if (from !== to && scopes.includes(from)) move(from, to, category, keyword);
    } catch {
      // 別の場所から持ち込まれたものは無視
    }
  };

  const allCategories = useMemo(() => {
    const set = new Set(categories.filter((c) => c !== '未分類'));
    for (const s of scopes) for (const [c] of now[s] ?? []) set.add(c);
    return [...set];
  }, [categories, now, scopes]);

  return (
    <div className="space-y-3">
      <form className="flex flex-wrap items-end gap-2" onSubmit={add} noValidate>
        {scopes.length > 1 && (
          <div>
            <label className="label" htmlFor="pmScope">
              追加先
            </label>
            <select id="pmScope" className="input w-auto" value={addScope} onChange={(e) => setAddScope(e.target.value as PatternScope)}>
              {scopes.map((s) => (
                <option key={s} value={s}>
                  {SCOPE_INFO[s].label}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="label" htmlFor="pmCategory">
            分類（新しい分類も入力できます）
          </label>
          <input id="pmCategory" className="input w-48" list="pmCategoryList" value={addCategory} onChange={(e) => setAddCategory(e.target.value)} autoComplete="off" />
          <datalist id="pmCategoryList">
            {allCategories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="label" htmlFor="pmKeyword">
            キーワード
          </label>
          <input id="pmKeyword" className="input w-56" value={addKeyword} onChange={(e) => setAddKeyword(e.target.value)} autoComplete="off" />
        </div>
        <button type="submit" className="btn btn-secondary">
          <Plus size={14} />
          追加
        </button>
        {addError && (
          <p role="alert" className="w-full text-sm text-red-700">
            {addError}
          </p>
        )}
      </form>

      <div className={`grid gap-3 ${scopes.length > 1 ? 'md:grid-cols-2' : ''}`}>
        {scopes.map((scope) => {
          const { label, note, Icon, chip } = SCOPE_INFO[scope];
          const other = scopes.find((s) => s !== scope);
          const col = [...(now[scope] ?? [])].filter(([, kws]) => kws.length > 0);
          const total = col.reduce((n, [, kws]) => n + kws.length, 0);
          return (
            <section
              key={scope}
              aria-label={`${label}のパターン`}
              className={`rounded-md border p-3 ${dropTarget === scope ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}
              onDragOver={(e) => {
                if (!other || !e.dataTransfer.types.includes(DRAG_TYPE)) return;
                e.preventDefault();
                setDropTarget(scope);
              }}
              onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setDropTarget(null)}
              onDrop={onDrop(scope)}
            >
              <h4 className="mb-2 flex items-center gap-1 text-sm font-semibold">
                <Icon size={14} aria-hidden="true" />
                {label}
                <small className="font-normal text-slate-500">
                  {note}・{num(total)}語
                </small>
              </h4>
              {col.length === 0 ? (
                <p className="text-xs text-slate-500">キーワードはありません{other ? '（ここへドラッグして移せます）' : ''}</p>
              ) : (
                <div className="space-y-1">
                  {col.map(([category, kws]) => (
                    <details key={category} className="rounded border border-slate-100">
                      <summary className="cursor-pointer px-2 py-1 text-sm">
                        {category}
                        <span className="ml-1 text-xs text-slate-500">{num(kws.length)}</span>
                      </summary>
                      <ul className="flex flex-wrap gap-1 px-2 pb-2">
                        {kws.map((k) => (
                          <li
                            key={k}
                            draggable={other !== undefined}
                            onDragStart={(e) => {
                              e.dataTransfer.setData(DRAG_TYPE, JSON.stringify({ from: scope, category, keyword: k }));
                              e.dataTransfer.effectAllowed = 'move';
                            }}
                            className={`flex items-center gap-0.5 rounded border pl-1.5 text-xs ${chip} ${other ? 'cursor-grab' : ''}`}
                          >
                            {k}
                            {other && (
                              <button
                                type="button"
                                className="rounded p-0.5 text-slate-500 hover:bg-white hover:text-blue-700"
                                aria-label={`「${k}」を${SCOPE_INFO[other].label}へ移す`}
                                title={`${SCOPE_INFO[other].label}へ移す`}
                                onClick={() => move(scope, other, category, k)}
                              >
                                <ArrowLeftRight size={12} />
                              </button>
                            )}
                            <button
                              type="button"
                              className="rounded p-0.5 text-slate-500 hover:bg-white hover:text-red-700"
                              aria-label={`「${k}」を削除`}
                              title="削除"
                              onClick={() => edit(scope, category, k, false)}
                            >
                              <X size={12} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {dirty && (
        <div className="sticky bottom-2 z-10 rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-sm shadow" role="region" aria-label="保存していないパターンの変更">
          <div className="flex flex-wrap items-center gap-2">
            <strong>保存していない変更が{num(changes.length)}件あります</strong>
            <span className="flex-1" />
            <button type="button" className="btn btn-secondary btn-sm" disabled={busy !== null} onClick={() => setNow(base)}>
              <Undo2 size={14} />
              取り消す
            </button>
            <button type="button" className="btn btn-primary btn-sm" disabled={busy !== null} onClick={submit}>
              <Save size={14} />
              {busy ? '保存中…' : '保存'}
            </button>
          </div>
          <details className="mt-1">
            <summary className="cursor-pointer text-xs text-blue-800">内容を見る</summary>
            <ul className="mt-1 list-disc pl-5 text-xs">
              {changes.map((c) => (
                <li key={JSON.stringify(c)}>{changeText(c)}</li>
              ))}
            </ul>
          </details>
        </div>
      )}
    </div>
  );
}
