// 1ヶ月分の月別株価を編集する画面。
//
// 「取り込む」と「訂正する」を1つにしてある。どちらも結局は
// 「115業種目 × 株価・2年平均をその月に確定させる」作業で、公表資料の表を貼るか
// 手で打つかの違いしかない。貼り付けは入力欄へ流し込むだけにして、
// 登録前に必ず同じ表・同じ差分表示を通るようにした。

import { useMemo, useState } from 'react';
import type { IndustryCategory, IndustryYear } from '@/data/industryDataset';
import { deleteMonthlyPrices, importMonthlyPrices } from './api';
import { CategoryFilterRow, useCategoryFilter } from './CategoryFilter';
import {
  deletionsOf,
  entriesFromRegistered,
  entryOf,
  extractEnteredPrices,
  type PriceEntries,
  type PriceEntry,
} from './directPriceEntry';
import { DIFF_STATUS_LABELS, LEVEL_LABELS } from './labels';
import {
  extractMonthlyPriceRows,
  previewMonthlyPrices,
  MONTHLY_PRICE_FIELDS,
  type MonthlyPriceDiff,
  type MonthlyPriceField,
  type RowIssue,
} from './parsePastedTable';
import { PasteTableEditor } from './PasteTableEditor';
import { usePastedTable } from './usePastedTable';

const PLACEHOLDER = `国税庁の「業種目別株価等」の表をコピーして貼り付けてください。
例（タブ区切り）:
1\t763\t579
2\t812\t604`;

/** 差分表示の状態ごとの見た目。据置は目立たせない。 */
const DIFF_BADGE_CLASS: Readonly<Record<MonthlyPriceDiff['status'], string>> = {
  new: 'admin-badge admin-badge-new',
  changed: 'admin-badge admin-badge-changed',
  same: 'admin-badge',
};

function issueText(issue: RowIssue): string {
  return `${issue.line > 0 ? `${issue.line}行目: ` : ''}${issue.reason}`;
}

/** 登録済みの値を「株価 / 2年平均」の1セルにまとめる。 */
function registeredText(category: IndustryCategory, target: { year: number; month: number }): string {
  const price = category.monthlyPrices.find(
    (candidate) => candidate.year === target.year && candidate.month === target.month,
  );
  if (!price) return '未登録';
  return `${price.price} / ${price.twoYearAveragePrice ?? '—'}`;
}

interface Props {
  year: IndustryYear;
  target: { year: number; month: number };
  onUpdated: () => Promise<void>;
}

export function MonthEditor({ year, target, onUpdated }: Props) {
  // 登録済みの値を初期値にして、そこから直したぶんだけが差分になるようにする。
  const [entries, setEntries] = useState<PriceEntries>(
    () => entriesFromRegistered(year.categories, target.year, target.month),
  );
  const [pasteOpen, setPasteOpen] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const filter = useCategoryFilter(year.categories);
  const paste = usePastedTable<MonthlyPriceField>(MONTHLY_PRICE_FIELDS);

  const pasted = useMemo(
    () => extractMonthlyPriceRows(paste.table, paste.assignment),
    [paste.table, paste.assignment],
  );

  const entered = useMemo(
    () => extractEnteredPrices(year.categories, entries),
    [year.categories, entries],
  );
  const preview = useMemo(
    () => previewMonthlyPrices(entered.rows, year, target.year, target.month),
    [entered.rows, year, target.year, target.month],
  );

  const diffByNumber = useMemo(
    () => new Map(preview.diffs.map((diff) => [diff.number, diff])),
    [preview.diffs],
  );
  const countOf = (status: MonthlyPriceDiff['status']) =>
    preview.diffs.filter((diff) => diff.status === status).length;

  // 登録済みの行を空欄にした＝削除。空欄のうち元から未登録のものは「未入力」で放っておく。
  const deletions = useMemo(
    () => deletionsOf(year.categories, entries, target.year, target.month),
    [year.categories, entries, target.year, target.month],
  );
  const deletionSet = useMemo(() => new Set(deletions), [deletions]);
  const blankCount = year.categories.filter(
    (category) => entryOf(entries, category.number).price.trim() === '',
  ).length - deletions.length;

  const registeredCount = year.categories.filter((category) => category.monthlyPrices.some(
    (price) => price.year === target.year && price.month === target.month,
  )).length;

  // 送るのは値が変わる行だけ。据置を混ぜても結果は同じだが、更新件数の表示が実態とずれる。
  const pending = preview.diffs.filter((diff) => diff.status !== 'same');
  const canSave = (pending.length > 0 || deletions.length > 0)
    && entered.errors.length === 0 && !saving;

  // 削除が混ざるときだけ内訳を出す。ふだんは今までどおり「登録 N 件」で読める。
  const saveCountText = deletions.length > 0
    ? `登録 ${pending.length} 件 / 削除 ${deletions.length} 件`
    : `${pending.length} 件`;

  const setEntry = (number: number, patch: Partial<PriceEntry>) =>
    setEntries((current) => ({
      ...current,
      [number]: { ...entryOf(current, number), ...patch },
    }));

  const resetEntries = () => {
    setEntries(entriesFromRegistered(year.categories, target.year, target.month));
    setMessage(null);
  };

  /** 貼り付けた表を入力欄へ流し込む。ここでは登録しない（必ず差分を見てから保存する）。 */
  const applyPaste = () => {
    const known = new Set(year.categories.map((category) => category.number));
    const applicable = pasted.rows.filter((row) => known.has(row.number));
    const unknown = pasted.rows.filter((row) => !known.has(row.number)).map((row) => row.number);

    setEntries((current) => {
      const next = { ...current };
      for (const row of applicable) {
        next[row.number] = {
          price: String(row.price),
          twoYearAveragePrice:
            row.twoYearAveragePrice === null ? '' : String(row.twoYearAveragePrice),
        };
      }
      return next;
    });

    const notes = [
      pasted.skipped.length > 0 ? `見出し等の読み飛ばし ${pasted.skipped.length} 行` : '',
      pasted.errors.length > 0 ? `読めない行 ${pasted.errors.length} 行` : '',
      unknown.length > 0 ? `${year.label}に無い業種目番号 ${unknown.length} 件` : '',
    ].filter(Boolean);

    setMessage({
      kind: applicable.length > 0 ? 'ok' : 'error',
      text: `${applicable.length} 件を入力欄へ入れました`
        + (notes.length > 0 ? `（${notes.join(' / ')}）` : ''),
    });
    if (applicable.length > 0) {
      paste.clear();
      setPasteOpen(false);
    }
  };

  const save = async () => {
    // 削除は取り消せないので、1件でも混ざっていれば必ず一度止める。
    if (deletions.length > 0) {
      const numbers = deletions.slice(0, 10).join(', ')
        + (deletions.length > 10 ? ` ほか${deletions.length - 10}件` : '');
      const confirmed = window.confirm(
        `${target.year}年${target.month}月分の株価を ${deletions.length} 件削除します。\n`
        + `業種目番号: ${numbers}\n\n`
        + (pending.length > 0 ? `同時に ${pending.length} 件を登録します。\n` : '')
        + 'よろしいですか？',
      );
      if (!confirmed) return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const notes: string[] = [];

      if (pending.length > 0) {
        const response = await importMonthlyPrices(year.gregorianYear, {
          year: target.year,
          month: target.month,
          rows: pending.map((diff) => ({
            number: diff.number,
            price: diff.after.price,
            twoYearAveragePrice: diff.after.twoYearAveragePrice,
          })),
        });
        notes.push(`新規 ${response.created} 件`, `更新 ${response.updated} 件`);
      }

      // 登録を先に済ませてから削除する。途中で失敗しても「消えただけ」にはならない。
      if (deletions.length > 0) {
        const response = await deleteMonthlyPrices(
          year.gregorianYear, target.year, target.month, deletions,
        );
        notes.push(`削除 ${response.deleted} 件`);
      }

      await onUpdated();
      setMessage({
        kind: 'ok',
        text: `${target.year}年${target.month}月分を保存しました（${notes.join(' / ')}）`,
      });
    } catch (caught) {
      setMessage({ kind: 'error', text: caught instanceof Error ? caught.message : String(caught) });
    } finally {
      setSaving(false);
    }
  };

  /** その月をまるごと消す。取り込む年分・月を間違えたときの戻し方。 */
  const deleteMonth = async () => {
    const confirmed = window.confirm(
      `${target.year}年${target.month}月分の株価 ${registeredCount} 件をすべて削除します。\n`
      + '業種目とB・C・D（配当・利益・純資産）は消えません。\n\n'
      + 'よろしいですか？',
    );
    if (!confirmed) return;

    setSaving(true);
    setMessage(null);

    try {
      const response = await deleteMonthlyPrices(year.gregorianYear, target.year, target.month);
      setEntries({});
      await onUpdated();
      setMessage({
        kind: 'ok',
        text: `${target.year}年${target.month}月分を削除しました（${response.deleted} 件）`,
      });
    } catch (caught) {
      setMessage({ kind: 'error', text: caught instanceof Error ? caught.message : String(caught) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="admin-row">
        <button type="button" className="app-tool-btn" onClick={() => setPasteOpen((open) => !open)}>
          {pasteOpen ? '貼り付けを閉じる' : '表を貼り付けて一括入力'}
        </button>
        <button type="button" className="app-tool-btn" onClick={resetEntries} disabled={saving}>
          登録済みの値に戻す
        </button>
        {registeredCount > 0 && (
          <button
            type="button"
            className="app-tool-btn admin-btn-danger"
            onClick={deleteMonth}
            disabled={saving}
          >
            この月を削除（{registeredCount} 件）
          </button>
        )}
        <span className="admin-note">
          直接入力できます。株価と2年平均の両方を空欄にすると、その行は削除になります。
        </span>
      </div>

      {pasteOpen && (
        <>
          <PasteTableEditor state={paste} fields={MONTHLY_PRICE_FIELDS} placeholder={PLACEHOLDER} />
          {pasted.errors.length > 0 && (
            <div className="admin-alert admin-alert-warn">
              <strong>読み取れない行があります（{pasted.errors.length}件）</strong>
              <ul>
                {pasted.errors.slice(0, 10).map((issue) => (
                  <li key={`${issue.line}-${issue.reason}`}>{issueText(issue)}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="admin-actions">
            <button type="button" className="app-tool-btn" onClick={paste.clear}>
              貼り付けをクリア
            </button>
            <button
              type="button"
              className="app-tool-btn admin-btn-primary"
              onClick={applyPaste}
              disabled={pasted.rows.length === 0}
            >
              入力欄へ流し込む（{pasted.rows.length} 行）
            </button>
          </div>
        </>
      )}

      <CategoryFilterRow
        keyword={filter.keyword}
        onChange={filter.setKeyword}
        shown={filter.filtered.length}
        total={year.categories.length}
      />

      <div className="admin-summary">
        <span className="admin-badge admin-badge-new">新規 {countOf('new')}</span>
        <span className="admin-badge admin-badge-changed">変更 {countOf('changed')}</span>
        <span className="admin-badge">据置 {countOf('same')}</span>
        {deletions.length > 0 && (
          <span className="admin-badge admin-badge-delete">削除 {deletions.length}</span>
        )}
        {blankCount > 0 && <span className="admin-note">未入力 {blankCount} 件</span>}
      </div>

      {entered.errors.length > 0 && (
        <div className="admin-alert admin-alert-error">
          <strong>入力を直してください（{entered.errors.length}件）</strong>
          <ul>
            {entered.errors.slice(0, 10).map((issue) => (
              <li key={issue.reason}>{issueText(issue)}</li>
            ))}
          </ul>
        </div>
      )}

      {message && (
        <div className={message.kind === 'ok' ? 'admin-alert admin-alert-ok' : 'admin-alert admin-alert-error'}>
          {message.text}
        </div>
      )}

      <div className="admin-scroll admin-scroll-tall">
        <table className="admin-table">
          <thead>
            <tr>
              <th>番号</th><th>階層</th><th>業種目</th>
              <th className="admin-num">株価</th>
              <th className="admin-num">2年平均</th>
              <th className="admin-num">登録済み</th>
              <th>状態</th>
            </tr>
          </thead>
          <tbody>
            {filter.filtered.map((category) => {
              const entry = entryOf(entries, category.number);
              const diff = diffByNumber.get(category.number);
              const deleting = deletionSet.has(category.number);
              const changed = diff !== undefined && diff.status !== 'same';
              const rowClass = deleting
                ? 'admin-row-deleting'
                : changed ? 'admin-row-editing' : undefined;

              return (
                <tr key={category.number} className={rowClass}>
                  <td>{category.number}</td>
                  <td>{LEVEL_LABELS[category.level]}</td>
                  <td>{category.name}</td>
                  <td className="admin-num">
                    <input
                      className="admin-input admin-input-narrow"
                      value={entry.price}
                      onChange={(event) => setEntry(category.number, { price: event.target.value })}
                      inputMode="numeric"
                      aria-label={`${category.number} ${category.name} の株価`}
                    />
                  </td>
                  <td className="admin-num">
                    <input
                      className="admin-input admin-input-narrow"
                      value={entry.twoYearAveragePrice}
                      onChange={(event) =>
                        setEntry(category.number, { twoYearAveragePrice: event.target.value })}
                      inputMode="numeric"
                      placeholder="未公表"
                      aria-label={`${category.number} ${category.name} の2年平均`}
                    />
                  </td>
                  <td className="admin-num admin-before">{registeredText(category, target)}</td>
                  <td>
                    {deleting && <span className="admin-badge admin-badge-delete">削除</span>}
                    {!deleting && diff && (
                      <span className={DIFF_BADGE_CLASS[diff.status]}>{DIFF_STATUS_LABELS[diff.status]}</span>
                    )}
                    {!deleting && !diff && <span className="admin-before">未入力</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="admin-actions">
        <button
          type="button"
          className="app-tool-btn admin-btn-primary"
          onClick={save}
          disabled={!canSave}
        >
          {saving ? '保存中…' : `${target.year}年${target.month}月分を保存する（${saveCountText}）`}
        </button>
      </div>
    </>
  );
}
