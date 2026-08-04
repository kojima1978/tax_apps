import { useMemo, useState } from 'react';
import type { IndustryYear } from '@/data/industryDataset';
import { createIndustryYear } from './api';
import { PasteTableEditor } from './PasteTableEditor';
import { CATEGORY_FIELDS, extractCategoryRows, type CategoryField } from './parsePastedTable';
import { usePastedTable } from './usePastedTable';

const PLACEHOLDER = `国税庁の「類似業種比準価額計算上の業種目及び業種目別株価等」の表を貼り付けてください。
例（タブ区切り・見出し行を含めてよい）:
番号\t大分類\t中分類\t小分類\tB\tC\tD\t前年平均
1\t鉱業，採石業，砂利採取業\t\t\t5.2\t34\t312\t451`;

// 元号は西暦への換算表（server 側の gregorianYearOf）と対応させる。
const ERAS = ['令和', '平成'] as const;

const LEVEL_LABELS = { LARGE: '大分類', MIDDLE: '中分類', SMALL: '小分類' } as const;

interface Props {
  years: readonly IndustryYear[];
  onCreated: () => Promise<void>;
}

/**
 * 年分の新規追加。業種目マスタとB・C・D・前年平均株価をまとめて登録する。
 * 月別株価は件数が多く公表も月ごとなので、ここでは扱わず月次取込に任せる。
 */
export function NewYearPanel({ years, onCreated }: Props) {
  const [era, setEra] = useState<string>(ERAS[0]);
  const [eraYear, setEraYear] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const paste = usePastedTable<CategoryField>(CATEGORY_FIELDS);

  const extracted = useMemo(
    () => extractCategoryRows(paste.table, paste.assignment),
    [paste.table, paste.assignment],
  );

  const eraYearNumber = /^\d+$/.test(eraYear.trim()) ? Number(eraYear.trim()) : null;
  const duplicated = eraYearNumber !== null
    && years.some((year) => year.era === era && year.eraYear === eraYearNumber);

  const levelCounts = useMemo(() => {
    const counts = { LARGE: 0, MIDDLE: 0, SMALL: 0 };
    for (const row of extracted.rows) counts[row.level] += 1;
    return counts;
  }, [extracted.rows]);

  const canSubmit = eraYearNumber !== null
    && eraYearNumber >= 1
    && !duplicated
    && extracted.rows.length > 0
    && extracted.errors.length === 0
    && !submitting;

  const handleSubmit = async () => {
    if (eraYearNumber === null) return;
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const response = await createIndustryYear({
        era,
        eraYear: eraYearNumber,
        // line は貼り付け時のエラー表示用なので、送信時は落とす。
        categories: extracted.rows.map((row) => ({
          number: row.number,
          largeName: row.largeName,
          middleName: row.middleName,
          smallName: row.smallName,
          name: row.name,
          level: row.level,
          description: row.description,
          dividend: row.dividend,
          profit: row.profit,
          netAsset: row.netAsset,
          previousYearAveragePrice: row.previousYearAveragePrice,
        })),
      });
      await onCreated();
      setResult(`${response.year.label}を作成しました（業種目 ${response.categoryCount} 件）。月別株価は「月次株価を取り込む」から登録してください。`);
      paste.clear();
      setEraYear('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-panel-body">
      <div className="admin-row">
        <label className="admin-label">
          元号
          <select className="admin-select" value={era} onChange={(event) => setEra(event.target.value)}>
            {ERAS.map((candidate) => (
              <option key={candidate} value={candidate}>{candidate}</option>
            ))}
          </select>
        </label>

        <label className="admin-label">
          年
          <input
            className="admin-input admin-input-narrow"
            value={eraYear}
            onChange={(event) => setEraYear(event.target.value)}
            placeholder="8"
            inputMode="numeric"
          />
        </label>
      </div>

      {duplicated && (
        <div className="admin-alert admin-alert-error">
          {era}{eraYear}年分は既に登録されています。値を直す場合は一覧から個別に訂正してください。
        </div>
      )}

      <PasteTableEditor state={paste} fields={CATEGORY_FIELDS} placeholder={PLACEHOLDER} />

      {/* 貼り付ける前は「列が未割当」等の警告を出しても仕方がないので、本文が入ってから見せる。 */}
      {paste.table.rows.length > 0 && (
        <div className="admin-preview">
          <div className="admin-summary">
            <span>読み取り {extracted.rows.length} 件</span>
            {(Object.keys(LEVEL_LABELS) as (keyof typeof LEVEL_LABELS)[]).map((level) => (
              <span key={level} className="admin-badge">
                {LEVEL_LABELS[level]} {levelCounts[level]}
              </span>
            ))}
            {extracted.skipped.length > 0 && (
              <span className="admin-note">見出し等の読み飛ばし {extracted.skipped.length} 行</span>
            )}
          </div>

          {extracted.errors.length > 0 && (
            <div className="admin-alert admin-alert-error">
              <strong>取り込めない行があります（{extracted.errors.length}件）</strong>
              <ul>
                {extracted.errors.slice(0, 10).map((issue) => (
                  <li key={`${issue.line}-${issue.reason}`}>
                    {issue.line > 0 ? `${issue.line}行目: ` : ''}{issue.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {extracted.rows.length > 0 && (
            <div className="admin-scroll admin-scroll-tall">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>番号</th><th>階層</th><th>業種目</th>
                    <th>B 配当</th><th>C 利益</th><th>D 純資産</th><th>前年平均</th>
                  </tr>
                </thead>
                <tbody>
                  {extracted.rows.map((row) => (
                    <tr key={row.number}>
                      <td>{row.number}</td>
                      <td>{LEVEL_LABELS[row.level]}</td>
                      <td>{row.name}</td>
                      <td>{row.dividend}</td>
                      <td>{row.profit}</td>
                      <td>{row.netAsset}</td>
                      <td>{row.previousYearAveragePrice}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {error && <div className="admin-alert admin-alert-error">{error}</div>}
      {result && <div className="admin-alert admin-alert-ok">{result}</div>}

      <div className="admin-actions">
        <button type="button" className="app-tool-btn" onClick={paste.clear}>貼り付けをクリア</button>
        <button type="button" className="app-tool-btn admin-btn-primary" onClick={handleSubmit} disabled={!canSubmit}>
          {submitting ? '作成中…' : `${era}${eraYear || '?'}年分として作成`}
        </button>
      </div>
    </div>
  );
}
