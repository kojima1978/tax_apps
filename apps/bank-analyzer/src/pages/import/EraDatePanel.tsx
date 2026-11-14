// 取込ウィザードの手順3: 元号の無い日付（`6-08-12` など）をまとめて直す欄（依頼27）
//
// 年が戻る所で区切り、区切りごとに元号を選ぶ（元号をまたぐ通帳）。候補は合いそうな順に並べ、
// 先頭に「候補」と付けるだけで、当てるのは人が押したときだけ（アプリは黙って元号を決めない）。
// 当てたあとも行ごとに日付を直せる（手で直した行はここの対象から外れる）。

import { useMemo } from 'react';
import { warekiShort } from '../../lib/format';
import { eraAnchor, eraSegments, eraWarnings, rankEras, type EraChoice, type EraContext } from '../../../server/lib/import/eralessDates';
import { eraTargets, type EditFile } from './wizardRows';

export type EraPanelContext = EraContext & {
  onApply: (fileKey: number, rowKeys: ReadonlySet<number>, era: EraChoice) => void;
};

const span = <T,>(from: T, to: T) => (from === to ? `${from}` : `${from}〜${to}`);
// 西暦の候補は西暦で見せる（和暦にすると平成の日付に見えて紛らわしい）
const showDate = (iso: string, era: EraChoice) => (era === 'AD' ? iso.replaceAll('-', '/') : warekiShort(iso));

export function EraDatePanel({ file, era }: { file: EditFile; era: EraPanelContext }) {
  const targets = useMemo(() => eraTargets(file.rows), [file.rows]);
  const segments = useMemo(() => eraSegments(targets), [targets]);
  const warnings = useMemo(() => {
    const lineOf = new Map(file.rows.map((r, i) => [r.key, i + 1]));
    return eraWarnings(file.rows, era).map((w) => ({ ...w, line: lineOf.get(w.key)! }));
  }, [file.rows, era]);
  if (targets.length === 0) return null;
  const anchor = eraAnchor(era);
  const unfilled = targets.filter((t) => t.row.eraFilled === null).length;

  return (
    <div className="mb-3 rounded border border-amber-300 bg-amber-50 p-3 text-sm" role="group" aria-label="元号の無い日付">
      <p className="font-medium text-amber-950">
        元号の無い日付が {targets.length}行あります。
        {unfilled > 0 ? '元号を選ぶと、その行の日付をまとめて入れます。' : 'すべて元号を当てました。行ごとに直すこともできます。'}
      </p>
      <p className="mt-0.5 text-xs text-slate-600">
        候補は{anchor.text}順です。どれを当てるかは通帳の表紙・前後のページで確かめて選んでください。
      </p>

      <ul className="mt-2 space-y-2">
        {segments.map((seg, si) => {
          const first = seg[0]!;
          const last = seg[seg.length - 1]!;
          const options = rankEras(
            seg.map((t) => t.date),
            era,
          );
          const keys = new Set(seg.map((t) => t.row.key));
          const chosen = seg.every((t) => t.row.eraFilled === seg[0]!.row.eraFilled) ? seg[0]!.row.eraFilled : null;
          return (
            <li key={first.row.key} className="rounded bg-white/70 p-2">
              <div className="text-slate-700">
                {span(first.index + 1, last.index + 1)}行目（{span(first.row.rawDate, last.row.rawDate)}・{seg.length}行）
                {si > 0 && <span className="ml-1 text-amber-900">年が戻っています。元号が変わったかもしれません</span>}
              </div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {options.map((o, oi) => (
                  <button
                    key={o.era}
                    type="button"
                    className={`btn btn-sm ${chosen === o.era ? 'btn-primary' : 'btn-secondary'}`}
                    aria-pressed={chosen === o.era}
                    disabled={o.impossible > 0}
                    title={o.impossible > 0 ? `実在しない日付になる行が${o.impossible}行あります` : undefined}
                    onClick={() => era.onApply(file.key, keys, o.era)}
                  >
                    {oi === 0 && o.impossible === 0 && o.future === 0 && o.outside === 0 && <span className="mr-1 rounded bg-amber-200 px-1 text-xs text-amber-950">候補</span>}
                    {o.label}
                    {o.from && o.to && (
                      <span className="ml-1 text-xs opacity-80">
                        {span(showDate(o.from, o.era), showDate(o.to, o.era))}
                      </span>
                    )}
                    {o.future > 0 && <span className="ml-1 text-xs">（未来の日付）</span>}
                    {o.future === 0 && o.outside > 0 && <span className="ml-1 text-xs">（{o.label}の期間の外）</span>}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>

      {warnings.length > 0 && (
        <div className="mt-2 rounded bg-red-50 p-2 text-red-800">
          <p className="font-medium">当てた日付に気になる所があります（{warnings.length}件）</p>
          <ul className="mt-0.5 list-disc pl-5 text-xs">
            {warnings.map((w, i) => (
              <li key={`${w.key}-${i}`}>
                {w.line}行目: {w.text}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
