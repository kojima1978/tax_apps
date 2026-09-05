import { useEffect, useMemo, useState } from 'react';
import type { IndustryYear } from '@/data/industryDataset';
import { AdminAlert } from './AdminAlert';
import { createIndustryYear, fetchIndustryCategories } from './api';
import { PasteTableEditor } from './PasteTableEditor';
import {
  categoryFieldsFor,
  extractCategoryRows,
  type CategoryField,
  type CategoryTemplate,
} from './parsePastedTable';
import { usePastedTable } from './usePastedTable';

const PLACEHOLDER = `国税庁の「類似業種比準価額計算上の業種目及び業種目別株価等」の表を貼り付けてください。
例（タブ区切り・見出し行を含めてよい）:
番号\t大分類\t中分類\t小分類\tB\tC\tD\t前年平均
1\t鉱業，採石業，砂利採取業\t\t\t5.2\t34\t312\t451`;

/** 雛形を使う場合の貼り付け例。番号とB・C・D・前年平均だけで足りる。 */
const TEMPLATE_PLACEHOLDER = `業種目名は引き継ぐので、番号とB・C・D・前年平均だけで登録できます。
例（タブ区切り・見出し行を含めてよい）:
番号\tB\tC\tD\t前年平均
1\t5.2\t34\t312\t451`;

// 元号は西暦への換算表（server 側の gregorianYearOf）と対応させる。
const ERAS = ['令和', '平成'] as const;

const LEVEL_LABELS = { LARGE: '大分類', MIDDLE: '中分類', SMALL: '小分類' } as const;

/** 引き継ぎ元を選ばないときの値。select は文字列しか持てないので番号と区別する。 */
const NO_TEMPLATE = '';

interface Props {
  years: readonly IndustryYear[];
  onCreated: () => Promise<void>;
  /**
   * 作成した年分を一覧側で開く。作ったあとに自分でタブを探し直さなくて済むようにする。
   * この画面は切り替えと同時に消えるので、作成できた旨は文言ごと預ける。
   */
  onOpenYear: (gregorianYear: number, notice: string) => void;
}

/**
 * 年分の新規追加。業種目マスタとB・C・D・前年平均株価をまとめて登録する。
 * 月別株価は件数が多く公表も月ごとなので、ここでは扱わず一覧の月チップに任せる。
 */
export function NewYearPanel({ years, onCreated, onOpenYear }: Props) {
  const [era, setEra] = useState<string>(ERAS[0]);
  const [eraYear, setEraYear] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /*
   * 引き継ぎ元の年分。業種目の分類は年が変わってもほぼ同じで、毎年変わるのは
   * B・C・Dと前年平均株価だけ。分類名まで毎回貼り直すのは手間なので、
   * 既定で最新の年分を雛形にしておく。
   */
  const [templateYearText, setTemplateYearText] = useState<string>(
    () => (years[0] ? String(years[0].gregorianYear) : NO_TEMPLATE),
  );
  const [template, setTemplate] = useState<CategoryTemplate | null>(null);
  const [templateError, setTemplateError] = useState<string | null>(null);

  const templateYear = templateYearText === NO_TEMPLATE ? null : Number(templateYearText);
  const templateSource = years.find((year) => year.gregorianYear === templateYear);

  useEffect(() => {
    if (templateYear === null) {
      setTemplate(null);
      setTemplateError(null);
      return;
    }

    let alive = true;
    setTemplate(null);
    setTemplateError(null);

    // 内容説明もまとめて引き継ぎたいので、データセットではなく業種目マスタから取る。
    fetchIndustryCategories(templateYear)
      .then((categories) => {
        if (!alive) return;
        setTemplate(new Map(categories.map((category) => [category.number, {
          largeName: category.largeName,
          middleName: category.middleName,
          smallName: category.smallName,
          name: category.name,
          description: category.description,
        }])));
      })
      .catch((caught) => {
        if (alive) setTemplateError(caught instanceof Error ? caught.message : String(caught));
      });

    return () => { alive = false; };
  }, [templateYear]);

  // 参照が変わるたび usePastedTable の列推測が走り直すので、必ずメモ化して渡す。
  const fields = useMemo(() => categoryFieldsFor(template !== null), [template]);
  const paste = usePastedTable<CategoryField>(fields);

  const extracted = useMemo(
    () => extractCategoryRows(paste.table, paste.assignment, template ?? undefined),
    [paste.table, paste.assignment, template],
  );

  const eraYearNumber = /^\d+$/.test(eraYear.trim()) ? Number(eraYear.trim()) : null;
  const duplicated = eraYearNumber !== null
    && years.some((year) => year.era === era && year.eraYear === eraYearNumber);

  const levelCounts = useMemo(() => {
    const counts = { LARGE: 0, MIDDLE: 0, SMALL: 0 };
    for (const row of extracted.rows) counts[row.level] += 1;
    return counts;
  }, [extracted.rows]);

  // 雛形から名前を補ったかどうか。貼り付けに大分類の列が無いときだけ効いている。
  const inheritedNames = template !== null && paste.assignment.largeName === undefined;

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
      paste.clear();
      setEraYear('');
      // 次にやることは月別株価の登録。一覧へ移して、作った年分を開いた状態で渡す。
      onOpenYear(
        response.year.gregorianYear,
        `${response.year.label}を作成しました（業種目 ${response.categoryCount} 件）。`
        + '続けて月チップから月別株価を登録してください。',
      );
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

        {years.length > 0 && (
          <label className="admin-label">
            業種目名の引き継ぎ元
            <select
              className="admin-select"
              value={templateYearText}
              onChange={(event) => setTemplateYearText(event.target.value)}
            >
              {years.map((year) => (
                <option key={year.gregorianYear} value={String(year.gregorianYear)}>
                  {year.label}から引き継ぐ
                </option>
              ))}
              <option value={NO_TEMPLATE}>引き継がない（すべて貼り付ける）</option>
            </select>
          </label>
        )}
      </div>

      {templateSource && (
        <div className="admin-note">
          {template === null && templateError === null && `${templateSource.label}の業種目を読込中…`}
          {template !== null && `${templateSource.label}の業種目 ${template.size} 件を雛形にします。`
            + '番号で突き合わせて、大分類・中分類・小分類・業種目名・内容を補います'
            + '（貼り付けに列があればそちらが優先されます）。'}
        </div>
      )}

      {templateError && (
        <AdminAlert kind="warn" scrollKey={templateError}>
          引き継ぎ元を読み込めませんでした（{templateError}）。
          このまま登録する場合は大分類から貼り付けてください。
        </AdminAlert>
      )}

      {duplicated && (
        <AdminAlert kind="error" scrollKey={`${era}${eraYear}`}>
          {era}{eraYear}年分は既に登録されています。値を直す場合は一覧から個別に訂正してください。
        </AdminAlert>
      )}

      <PasteTableEditor
        state={paste}
        fields={fields}
        placeholder={template === null ? PLACEHOLDER : TEMPLATE_PLACEHOLDER}
      />

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
            {inheritedNames && templateSource && (
              <span className="admin-badge admin-badge-new">
                業種目名は{templateSource.label}から引き継ぎ {extracted.rows.length}件
              </span>
            )}
            {extracted.skipped.length > 0 && (
              <span className="admin-note">見出し等の読み飛ばし {extracted.skipped.length} 行</span>
            )}
          </div>

          {/*
            引き継ぎは番号で引く。国税庁が番号を振り直した年分では、番号だけを貼り付けると
            前年の名前がそのまま登録されてしまい、しかも取り込み時には何も起こらない
            （前年に無い番号だけがエラーになる）。危ないのは番号が残って中身が変わった場合。
          */}
          {inheritedNames && templateSource && (
            <AdminAlert kind="warn">
              業種目名を{templateSource.label}から<strong>業種目番号で</strong>引き継いでいます。
              業種目番号は年分ごとに振り直されるため、番号だけを貼り付けると名前が食い違うことがあります。
              公表資料の表から大分類・中分類・小分類の列ごと貼り付ければ引き継ぎは行われず、
              貼り付けた名前がそのまま登録されます。
            </AdminAlert>
          )}

          {extracted.errors.length > 0 && (
            <AdminAlert kind="error" scrollKey={`extract-${extracted.errors.length}`}>
              <strong>取り込めない行があります（{extracted.errors.length}件）</strong>
              <ul>
                {extracted.errors.slice(0, 10).map((issue) => (
                  <li key={`${issue.line}-${issue.reason}`}>
                    {issue.line > 0 ? `${issue.line}行目: ` : ''}{issue.reason}
                  </li>
                ))}
              </ul>
            </AdminAlert>
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

      {error && <AdminAlert kind="error" scrollKey={error}>{error}</AdminAlert>}

      <div className="admin-actions">
        <button type="button" className="app-tool-btn" onClick={paste.clear}>貼り付けをクリア</button>
        <button type="button" className="app-tool-btn admin-btn-primary" onClick={handleSubmit} disabled={!canSubmit}>
          {submitting ? '作成中…' : `${era}${eraYear || '?'}年分として作成`}
        </button>
      </div>
    </div>
  );
}
