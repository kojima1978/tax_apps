import { useEffect, useMemo, useState } from 'react';
import { useIndustryDataset } from '@/data/IndustryDataProvider';
import { categoryLabel, industryYearDiffs, type IndustryYearDiff } from '@/lib/industryYearAudit';
import type { TableId, TableProps } from '@/types/form';

interface Props {
  getField: TableProps['getField'];
  updateField: TableProps['updateField'];
  /** 一覧から入力欄へ移動する（選び直すとき） */
  onJump: (tab: TableId, field: string) => void;
}

/** 番号が当年分から消えているときの説明。 */
function goneText(diff: IndustryYearDiff): string {
  return `番号 ${diff.number} は ${diff.toYear.label} にありません`;
}

/**
 * 参照している業種目の年分と、年分をまたいだときの食い違いを出す。
 *
 * 業種目番号は年分ごとに振り直されるので、課税時期の年分を変えると同じ番号が別の
 * 業種目を指すことがある。番号が消えていれば欄が空になって気づけるが、番号が残った
 * まま中身が変わった場合は何も起こらない。ここはその「黙って入れ替わる」ぶんを拾う。
 *
 * 見つけたら直すところまでこの場でできるようにしてある。付け替え先（同じ分類が当年分で
 * 別番号になっているもの）が分かるときは、その番号への変更ボタンを出す。
 */
export function IndustryYearNotice({ getField, updateField, onJump }: Props) {
  const dataset = useIndustryDataset();
  const [open, setOpen] = useState(false);

  const era = getField('table1_1', 'f14_g');
  const eraYear = getField('table1_1', 'f14_y');
  const month = getField('table1_1', 'f14_m');
  const view = useMemo(
    () => dataset.forTaxPeriod({ era, eraYear, month }),
    [dataset, era, eraYear, month],
  );
  const diffs = useMemo(() => industryYearDiffs(getField, dataset), [getField, dataset]);

  // 直せば一覧は空になる。開いたままにしておく意味がない
  useEffect(() => { if (diffs.length === 0) setOpen(false); }, [diffs.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // 業種目データが1件も無ければ、年分の話をしても仕方がない
  if (dataset.years.length === 0) return null;

  if (diffs.length === 0) {
    if (!/^\d+$/.test(eraYear.trim())) {
      return (
        <span className="app-industry-year" title="課税時期の年を入れると、その年分の業種目に切り替わります">
          業種目 年分未定
        </span>
      );
    }
    return view.year
      ? (
        <span className="app-industry-year" title="課税時期の属する年分の業種目・株価を参照しています">
          業種目 {view.year.label}
        </span>
      )
      : (
        <span
          className="app-industry-year is-missing"
          title="この年分の業種目データが未登録のため、業種目の選択肢と類似業種の株価は空欄になります。業種目データ管理から登録してください"
        >
          業種目 未登録
        </span>
      );
  }

  const changeTo = (diff: IndustryYearDiff, number: string) => {
    updateField(diff.target.table, diff.target.field, number);
  };

  const keep = (diff: IndustryYearDiff) => {
    updateField(diff.target.table, diff.target.stampField, String(diff.toYear.gregorianYear));
  };

  return (
    <>
      <button
        type="button"
        className="app-tool-btn app-tool-btn-check"
        onClick={() => setOpen(true)}
        title="課税時期の年分を変えたことで、選んでいる業種目が別のものに変わっています"
      >
        業種目の確認 {diffs.length}件
      </button>

      {open && (
        <div className="no-print app-modal-backdrop" onClick={() => setOpen(false)}>
          <div
            className="app-modal industry-year-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="industry-year-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="industry-year-title" className="check-title">業種目の確認 {diffs.length}件</h2>
            <p className="check-note">
              業種目番号は年分ごとに振り直されます。番号はそのままでも、指している業種目が
              変わっているものがあります。B・C・Dと株価はすでに{view.year?.label}のもので
              計算されているので、業種目が正しいかここで確かめてください。
            </p>
            <ul className="check-list">
              {diffs.map((diff) => {
                const { replacement } = diff;
                return (
                <li key={`${diff.target.table}.${diff.target.field}`} className="industry-diff">
                  <span className="check-item-where">{diff.target.where}</span>

                  <div className="industry-diff-rows">
                    <div className="industry-diff-row">
                      <span className="industry-diff-year">{diff.from.year.label}</span>
                      <span className="industry-diff-name">{categoryLabel(diff.from.category)}</span>
                    </div>
                    <div className="industry-diff-row is-now">
                      <span className="industry-diff-year">{diff.toYear.label}</span>
                      <span className="industry-diff-name">
                        {diff.to ? categoryLabel(diff.to) : goneText(diff)}
                      </span>
                    </div>
                  </div>

                  <div className="industry-diff-actions">
                    {replacement && (
                      <button
                        type="button"
                        className="app-tool-btn industry-diff-primary"
                        onClick={() => changeTo(diff, String(replacement.number))}
                      >
                        番号 {replacement.number}（{diff.from.category.name}）に変更
                      </button>
                    )}
                    {diff.to
                      ? (
                        <button type="button" className="app-tool-btn" onClick={() => keep(diff)}>
                          このままでよい
                        </button>
                      )
                      : (
                        <button
                          type="button"
                          className="app-tool-btn"
                          onClick={() => changeTo(diff, '')}
                        >
                          番号を消す
                        </button>
                      )}
                    <button
                      type="button"
                      className="app-tool-btn"
                      onClick={() => { setOpen(false); onJump(diff.target.tab, diff.target.field); }}
                    >
                      選び直す
                    </button>
                  </div>
                </li>
                );
              })}
            </ul>
            <div className="prereq-actions">
              <button type="button" className="app-tool-btn" onClick={() => setOpen(false)}>閉じる</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
