/**
 * 第11表の付表1の補助資料「単価（円）又は倍数の計算根拠」。
 *
 * 用紙の「単価（円）又は倍数」は枠が1つしか無いため、路線価（又は倍数）に調整を掛けた
 * **結果**しか印字されない。何をどう掛けてその値になったのかが用紙からは追えないので、
 * 検算用にこの1枚を別に出す。提出する様式ではない（申告書には添付しない）。
 */

import { useMemo } from 'react';
import { table11f1Calc, type Values } from '../lib/calc';
import { formatCommaDecimal, formatCommaInteger, formatCommaNumber } from '../lib/format';

/** 補助資料の見出し */
const TITLE = '第11表の付表1　単価（円）又は倍数の計算根拠';

/** 1枚に載せる明細の件数 */
const ROWS_PER_PAGE = 18;

/** 補助資料の列（見出しと、明細1件からその欄を作る関数） */
interface Column {
  name: string;
  /** 用紙の幅に対する割合（合計100）。見出しが2行に折れる前提で決めてある */
  width: number;
  /** 数字の欄（右詰めにする） */
  num?: boolean;
}

const COLUMNS: readonly Column[] = [
  { name: '番号', width: 4 },
  { name: '細目・所在場所', width: 14 },
  { name: '評価方式', width: 7 },
  { name: '数量', width: 9, num: true },
  { name: '路線価又は倍数', width: 9, num: true },
  { name: '調整', width: 6, num: true },
  { name: '単価又は倍数', width: 9, num: true },
  { name: '持分割合', width: 6, num: true },
  { name: '価額（円）', width: 11, num: true },
  { name: '計算式', width: 25 },
];

export interface Table11f1WorksheetProps {
  /** 付表1の明細（空の明細は呼ぶ側で落としてある） */
  rows: readonly { index: number; item: Values }[];
}

/** 明細1件を列の並びに直す */
function cells(index: number, item: Values): string[] {
  const calc = table11f1Calc(item);
  const place = [item.pref, item.city, item.town, item.lot].filter((part) => (part ?? '') !== '').join(' ');
  return [
    String(index + 1),
    [item.kind, place].filter((part) => (part ?? '') !== '').join('　'),
    calc.methodLabel,
    // 面積は小数2位、固定資産税評価額は整数。どちらもカンマを入れる
    calc.method === 'route' ? formatCommaDecimal(calc.base, 2) : formatCommaInteger(calc.base),
    calc.method === 'route' ? formatCommaInteger(calc.unitSource) : calc.unitSource,
    calc.adjust,
    formatCommaNumber(calc.unit),
    calc.share,
    formatCommaInteger(calc.value),
    calc.formula,
  ];
}

export function Table11f1Worksheet({ rows }: Table11f1WorksheetProps) {
  const pages = useMemo(() => {
    const built = rows.map(({ index, item }) => cells(index, item));
    const count = Math.max(1, Math.ceil(built.length / ROWS_PER_PAGE));
    return Array.from({ length: count }, (_, page) => built.slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE));
  }, [rows]);

  return (
    <>
      {pages.map((page, i) => (
        <div className="gov-page worksheet" key={i}>
          <div className="worksheet__head">
            <h2 className="worksheet__title">{TITLE}</h2>
            <span className="worksheet__page">{i + 1}／{pages.length}</span>
          </div>
          <p className="worksheet__lead">
            路線価方式は「面積 × 単価 × 持分割合」、倍率方式は「固定資産税評価額 × 倍数 × 持分割合」で価額を出します。
            単価は路線価（又は倍数）に調整（奥行価格補正率・借地権割合など）を掛けた後の値で、
            路線価方式は円未満を切り捨てます。この資料は検算用で、申告書には添付しません。
          </p>
          <table className="worksheet__table">
            <colgroup>
              {COLUMNS.map((column) => <col key={column.name} style={{ width: `${column.width}%` }} />)}
            </colgroup>
            <thead>
              <tr>{COLUMNS.map((column) => <th key={column.name}>{column.name}</th>)}</tr>
            </thead>
            <tbody>
              {page.map((row, r) => (
                <tr key={r}>
                  {row.map((value, c) => (
                    <td key={COLUMNS[c]!.name} className={COLUMNS[c]!.num ? 'worksheet__num' : undefined}>{value}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="worksheet__empty">付表1の明細がまだありません。</p>}
        </div>
      ))}
    </>
  );
}
