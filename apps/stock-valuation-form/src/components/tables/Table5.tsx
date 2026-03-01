import { useState } from 'react';
import { TableTitleBar } from './TableTitleBar';
import { parseNum } from './shared';
import type { TableProps } from '@/types/form';
import { Table5Section1 } from './Table5Section1';
import { Table5Section2 } from './Table5Section2';
import { Table5CalcProcess } from './Table5CalcProcess';

const T = 'table5' as const;
const DEFAULT_ROWS = 20;

export function Table5({ getField, updateField, onTabChange }: TableProps) {
  const g = (f: string) => getField(T, f);
  const u = (f: string, v: string) => updateField(T, f, v);
  const [rows, setRows] = useState(DEFAULT_ROWS);

  /* ---- 1. 資産・負債の集計 ---- */
  let aEvalSum = 0, aBookSum = 0;
  let stockEval = 0, stockBook = 0, landEval = 0;
  for (let i = 0; i < rows; i++) {
    const ev = parseNum(g(`a_eval_${i}`));
    const bk = parseNum(g(`a_book_${i}`));
    aEvalSum += ev; aBookSum += bk;
    const note = g(`a_note_${i}`);
    if (note === '株式等') { stockEval += ev; stockBook += bk; }
    else if (note === '土地等') { landEval += ev; }
  }

  let lEvalSum = 0, lBookSum = 0;
  for (let i = 0; i < rows; i++) {
    lEvalSum += parseNum(g(`l_eval_${i}`));
    lBookSum += parseNum(g(`l_book_${i}`));
  }

  /* ---- 2. 評価差額 ⑤〜⑧ ---- */
  const genbutsuEval = parseNum(g('genbutsu_eval'));
  const genbutsuBook = parseNum(g('genbutsu_book'));
  const netEval  = Math.max(0, aEvalSum - lEvalSum);
  const netBook  = Math.max(0, aBookSum + genbutsuEval - genbutsuBook - lBookSum);
  const diff     = Math.max(0, netEval - netBook);
  const corpTax  = Math.floor(diff * 0.37);

  /* ---- 3. 純資産価額 ⑨〜⑫ ---- */
  const currentNet     = netEval - corpTax;
  const issuedShares   = parseNum(getField('table1_1', 'total_shares_sum'));
  const treasuryShares = parseNum(getField('table1_1', 'treasury_shares'));
  const currentShares  = issuedShares - treasuryShares;
  const netPerShare    = currentShares > 0 ? Math.floor(currentNet * 1000 / currentShares) : null;
  const ratio5         = parseFloat(getField('table1_1', 'ratio5')) || null;
  const is50orLess     = ratio5 !== null && ratio5 <= 50;
  const net80pct       = netPerShare !== null ? Math.floor(netPerShare * 0.8) : null;

  /* ---- Grid data ⑤-⑫ ---- */
  type GridCell = { label: string; value: number | null; unit: string; highlight?: boolean };
  const gridRows: [GridCell, GridCell][] = [
    [
      { label: '⑤　相続税評価額による純資産価額（①−③、マイナスの場合は０）', value: netEval, unit: '千円' },
      { label: '⑨　課税時期現在の純資産価額（相続税評価額）（⑤−⑧）', value: currentNet, unit: '千円' },
    ],
    [
      { label: '⑥　帳簿価額による純資産価額（（②＋（ニ−ホ）−④）、マイナスの場合は０）', value: netBook, unit: '千円' },
      { label: '⑩　課税時期現在の発行済株式数（（第１表の１の①）−自己株式数）', value: currentShares > 0 ? currentShares : null, unit: '株' },
    ],
    [
      { label: '⑦　評価差額に相当する金額（⑤−⑥、マイナスの場合は０）', value: diff, unit: '千円' },
      { label: '⑪　課税時期現在の1株当たりの純資産価額（相続税評価額）（⑨÷⑩）', value: netPerShare, unit: '円', highlight: ratio5 !== null && !is50orLess },
    ],
    [
      { label: '⑧　評価差額に対する法人税額等相当額（⑦×37%）', value: corpTax, unit: '千円' },
      { label: '⑫　同族株主等の議決権割合（第１表の１の⑤の割合）が50％以下の場合（⑪×80%）', value: net80pct, unit: '円', highlight: is50orLess },
    ],
  ];

  return (
    <div className="gov-form" style={{ fontSize: 8 }}>
      <TableTitleBar
        title="第５表　１株当たりの純資産価額（相続税評価額）の計算明細書"
        companyNameReadonly={getField('table1_1', 'companyName')}
      />

      <Table5Section1
        g={g} u={u}
        rows={rows} setRows={setRows}
        totals={{ aEvalSum, aBookSum, stockEval, stockBook, landEval, lEvalSum, lBookSum }}
      />

      <Table5Section2 gridRows={gridRows} />

      <Table5CalcProcess
        aEvalSum={aEvalSum} aBookSum={aBookSum}
        lEvalSum={lEvalSum} lBookSum={lBookSum}
        genbutsuEval={genbutsuEval} genbutsuBook={genbutsuBook}
        netEval={netEval} netBook={netBook}
        diff={diff} corpTax={corpTax} currentNet={currentNet}
        issuedShares={issuedShares} treasuryShares={treasuryShares}
        currentShares={currentShares} netPerShare={netPerShare}
        ratio5={ratio5} is50orLess={is50orLess} net80pct={net80pct}
        onTabChange={onTabChange}
      />
    </div>
  );
}
