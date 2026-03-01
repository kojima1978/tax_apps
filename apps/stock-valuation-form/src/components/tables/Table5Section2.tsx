import { Computed } from '@/components/ui/Computed';
import { bb, br, bl, hdr, flex, ROW_H } from './shared';

/* ---- Types ---- */

interface GridCell {
  label: string;
  value: number | null;
  unit: string;
  highlight?: boolean;
}

interface Props {
  gridRows: [GridCell, GridCell][];
}

/* ---- Helper ---- */

function renderGridCell(cell: GridCell, isRight: boolean) {
  const hl = cell.highlight ? { background: '#fff8e1' } : {};
  const hlBold = cell.highlight ? { background: '#fff8e1', fontWeight: 700 as const } : {};
  return (
    <div style={{ display: 'flex', ...bb, ...(isRight ? {} : br), ...hl }}>
      <div style={{ flex: 1, ...hdr, padding: '2px 3px', fontSize: 6.5, ...flex, ...hlBold }}>
        {cell.label}
      </div>
      <div style={{ width: '30%', ...(isRight ? {} : bl), ...flex, ...hlBold }}>
        <Computed value={cell.value} unit={cell.unit} />
      </div>
    </div>
  );
}

/** 2. 評価差額に対する法人税額等相当額の計算 + 3. 1株当たりの純資産価額の計算 */
export function Table5Section2({ gridRows }: Props) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'auto repeat(4, 1fr)', fontSize: 7 }}>
      <div style={{ ...bb, ...br, ...hdr, padding: '2px 4px', fontWeight: 700, fontSize: 7.5, ...flex, height: ROW_H }}>
        ２．評価差額に対する法人税額等相当額の計算
      </div>
      <div style={{ ...bb, ...hdr, padding: '2px 4px', fontWeight: 700, fontSize: 7.5, ...flex, height: ROW_H }}>
        ３．１株当たりの純資産価額の計算
      </div>
      {gridRows.map(([left, right], i) => (
        <div key={i} style={{ display: 'contents' }}>
          {renderGridCell(left, false)}
          {renderGridCell(right, true)}
        </div>
      ))}
    </div>
  );
}
