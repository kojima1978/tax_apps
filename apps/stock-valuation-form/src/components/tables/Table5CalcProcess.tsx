import type { TableId } from '@/types/form';

/* ---- Sub-Component ---- */

const CalcResult = ({ children, active }: { children: React.ReactNode; active?: boolean }) => (
  <span style={{ fontWeight: 700, padding: '0 3px', background: active ? '#fff8e1' : '#e8eaf6' }}>{children}</span>
);

/* ---- Types ---- */

interface Props {
  aEvalSum: number;
  aBookSum: number;
  lEvalSum: number;
  lBookSum: number;
  genbutsuEval: number;
  genbutsuBook: number;
  netEval: number;
  netBook: number;
  diff: number;
  corpTax: number;
  currentNet: number;
  issuedShares: number;
  treasuryShares: number;
  currentShares: number;
  netPerShare: number | null;
  ratio5: number | null;
  is50orLess: boolean;
  net80pct: number | null;
  onTabChange?: (tab: TableId) => void;
}

/** 計算過程（no-print） */
export function Table5CalcProcess({
  aEvalSum, aBookSum, lEvalSum, lBookSum,
  genbutsuEval, genbutsuBook,
  netEval, netBook, diff, corpTax, currentNet,
  issuedShares, treasuryShares, currentShares,
  netPerShare, ratio5, is50orLess, net80pct,
  onTabChange,
}: Props) {
  if (aEvalSum === 0 && aBookSum === 0 && lEvalSum === 0 && lBookSum === 0) return null;

  return (
    <div className="no-print" style={{ padding: '3px 6px', fontSize: 7.5, background: '#f5f5f5', lineHeight: 1.8 }}>
      <div style={{ fontWeight: 700, marginBottom: 1 }}>▶ 計算過程</div>
      <div>
        ⑤　{aEvalSum.toLocaleString()}千円 − {lEvalSum.toLocaleString()}千円 = {(aEvalSum - lEvalSum).toLocaleString()}千円
        {aEvalSum - lEvalSum < 0 ? ' → 0（マイナスのため）' : '（プラス）'}
        {' => '}<CalcResult>{netEval.toLocaleString()}千円</CalcResult>
      </div>
      <div>
        ⑥　{aBookSum.toLocaleString()}千円 ＋（{genbutsuEval.toLocaleString()}千円 − {genbutsuBook.toLocaleString()}千円）− {lBookSum.toLocaleString()}千円 = {(aBookSum + genbutsuEval - genbutsuBook - lBookSum).toLocaleString()}千円
        {aBookSum + genbutsuEval - genbutsuBook - lBookSum < 0 ? ' → 0（マイナスのため）' : '（プラス）'}
        {' => '}<CalcResult>{netBook.toLocaleString()}千円</CalcResult>
      </div>
      <div>
        ⑦　{netEval.toLocaleString()}千円 − {netBook.toLocaleString()}千円 = {(netEval - netBook).toLocaleString()}千円
        {netEval - netBook < 0 ? ' → 0（マイナスのため）' : '（プラス）'}
        {' => '}<CalcResult>{diff.toLocaleString()}千円</CalcResult>
      </div>
      <div>⑧　{diff.toLocaleString()}千円 × 37% = <CalcResult>{corpTax.toLocaleString()}千円</CalcResult></div>
      <div>⑨　{netEval.toLocaleString()}千円 − {corpTax.toLocaleString()}千円 = <CalcResult>{currentNet.toLocaleString()}千円</CalcResult></div>
      <div>
        ⑩　{issuedShares > 0 ? `${issuedShares.toLocaleString()}株` : '—'} − {treasuryShares > 0 ? `${treasuryShares.toLocaleString()}株` : '0株'} = <CalcResult>{currentShares > 0 ? `${currentShares.toLocaleString()}株` : '—'}</CalcResult>
        {issuedShares === 0 && onTabChange && <span onClick={() => onTabChange('table1_1')} style={{ marginLeft: 4, color: '#1565c0', textDecoration: 'underline', cursor: 'pointer', fontSize: 7 }}>第１表の１で株式数を入力</span>}
      </div>
      {currentShares > 0 && netPerShare !== null && (
        <div>
          ⑪　{currentNet.toLocaleString()}千円 × 1,000 ÷ {currentShares.toLocaleString()}株 = <CalcResult active={ratio5 !== null && !is50orLess}>{netPerShare.toLocaleString()}円</CalcResult>
          {ratio5 !== null && !is50orLess && <span style={{ color: '#2e7d32', fontWeight: 700, marginLeft: 4 }}>← 適用</span>}
        </div>
      )}
      {currentShares > 0 && net80pct !== null && (
        <div>
          ⑫　{netPerShare!.toLocaleString()}円 × 80% = <CalcResult active={is50orLess}>{net80pct.toLocaleString()}円</CalcResult>
          {is50orLess && <span style={{ color: '#2e7d32', fontWeight: 700, marginLeft: 4 }}>← 適用</span>}
        </div>
      )}
      <div style={{ marginTop: 2, fontSize: 7 }}>
        第１表の１の⑤の割合: {ratio5 !== null
          ? <span style={{ fontWeight: 700, background: is50orLess ? '#c8e6c9' : '#ffcdd2', padding: '0 3px' }}>{ratio5}%{is50orLess ? '（50%以下 → ⑫適用）' : '（50%超 → ⑪適用）'}</span>
          : <><span style={{ background: '#fff3e0', padding: '0 3px' }}>未入力</span>{onTabChange && <span onClick={() => onTabChange('table1_1')} style={{ marginLeft: 4, color: '#1565c0', textDecoration: 'underline', cursor: 'pointer' }}>第１表の１で株主情報を入力</span>}</>
        }
      </div>
    </div>
  );
}
