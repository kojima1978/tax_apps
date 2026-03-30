import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FormField } from '@/components/ui/FormField';
import { NumberField } from '@/components/ui/NumberField';
import { CircledNumber } from '@/components/ui/CircledNumber';
import { ResetButton } from '@/components/ui/ResetButton';
import { bb, parseNum, pct, fmtNum, fmtPct } from '../shared';
import type { GFn, UFn } from '../shared';

const MIN_ROWS = 1;
const MAX_ROWS = 20;
const DEFAULT_ROWS = 10;
const SH_KEYS = ['sh_name', 'sh_dozoku', 'sh_hittou', 'sh_rel', 'sh_shares', 'sh_votes', 'sh_ratio'];

const roStyle: React.CSSProperties = { background: '#f5f5f0', cursor: 'default' };

function SlashCell() {
  return <td style={{ textAlign: 'center', color: '#666' }}>／</td>;
}

function ReadonlyCell({ n, value }: { n?: number; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {n !== undefined && <CircledNumber n={n} />}
      <span className="gov-input gov-input-number" style={roStyle}>{value}</span>
    </div>
  );
}

function ShareholderRow({ id, index, g, u, totalVotesSum, rowCount, onRemove }: {
  id: string; index: number; g: GFn; u: UFn; totalVotesSum: number; rowCount: number;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const i = index;
  return (
    <tr
      ref={setNodeRef}
      style={{
        height: 18,
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        background: isDragging ? '#fff8e1' : undefined,
      }}
    >
      <td style={{ border: 'none', padding: 0, textAlign: 'center' }}>
        {rowCount > MIN_ROWS && (
          <span onClick={onRemove} style={{ cursor: 'pointer', color: '#999', fontSize: 9, lineHeight: 1 }} title={`No.${i + 1} を削除`}>×</span>
        )}
      </td>
      <td style={{ textAlign: 'center', fontSize: 8, color: '#666', cursor: 'grab' }} {...attributes} {...listeners}>{i + 1}</td>
      <td><FormField value={g(`sh_name_${i}`)} onChange={(v) => u(`sh_name_${i}`, v)} /></td>
      <td style={{ textAlign: 'center' }}>
        <input type="checkbox" checked={g(`sh_dozoku_${i}`) === '1'} onChange={(e) => u(`sh_dozoku_${i}`, e.target.checked ? '1' : '')} style={{ cursor: 'pointer' }} />
      </td>
      <td style={{ textAlign: 'center' }}>
        <input type="checkbox" checked={g(`sh_hittou_${i}`) === '1'} onChange={(e) => { u(`sh_hittou_${i}`, e.target.checked ? '1' : ''); if (e.target.checked) u(`sh_dozoku_${i}`, '1'); }} style={{ cursor: 'pointer' }} />
      </td>
      <td><FormField value={g(`sh_rel_${i}`)} onChange={(v) => u(`sh_rel_${i}`, v)} textAlign="center" /></td>
      <td><NumberField value={g(`sh_shares_${i}`)} onChange={(v) => { const votes = g(`sh_votes_${i}`); u(`sh_shares_${i}`, v); if (!votes || votes === g(`sh_shares_${i}`)) u(`sh_votes_${i}`, v); }} /></td>
      <td style={parseNum(g(`sh_shares_${i}`)) > 0 && parseNum(g(`sh_votes_${i}`)) > parseNum(g(`sh_shares_${i}`)) ? { background: '#fff3e0' } : undefined}>
        <NumberField value={g(`sh_votes_${i}`)} onChange={(v) => u(`sh_votes_${i}`, v)} />
      </td>
      <td>
        <span className="gov-input gov-input-number" style={roStyle}>
          {totalVotesSum > 0 && g(`sh_votes_${i}`) ? `${pct(parseNum(g(`sh_votes_${i}`)), totalVotesSum)}%` : ''}
        </span>
      </td>
    </tr>
  );
}

function SummaryRows({ g, u, dozokuVotesSum, hittouVotesSum, totalSharesSum, totalVotesSum, ratio5, ratio6 }: {
  g: GFn; u: UFn; dozokuVotesSum: number; hittouVotesSum: number;
  totalSharesSum: number; totalVotesSum: number;
  ratio5: number | null; ratio6: number | null;
}) {
  return (
    <>
      <tr>
        <td colSpan={6} className="gov-header text-left" style={{ padding: '1px 3px', fontSize: 7.5 }}>自己株式</td>
        <td><NumberField value={g('treasury_shares')} onChange={(v) => u('treasury_shares', v)} /></td>
        <SlashCell /><SlashCell />
      </tr>
      <tr>
        <td colSpan={6} className="gov-header text-left" style={{ padding: '1px 3px', fontSize: 7.5 }}>
          納税義務者の属する同族関係者グルー<br />プの議決権の合計数
        </td>
        <SlashCell />
        <td><ReadonlyCell n={2} value={fmtNum(dozokuVotesSum)} /></td>
        <td><ReadonlyCell n={5} value={fmtPct(ratio5)} /></td>
      </tr>
      <tr>
        <td colSpan={6} className="gov-header text-left" style={{ padding: '1px 3px', fontSize: 7.5 }}>
          筆頭株主グループの議決権の合計数
        </td>
        <SlashCell />
        <td><ReadonlyCell n={3} value={fmtNum(hittouVotesSum)} /></td>
        <td><ReadonlyCell n={6} value={fmtPct(ratio6)} /></td>
      </tr>
      <tr>
        <td colSpan={6} className="gov-header text-left" style={{ padding: '1px 3px', fontSize: 7.5 }}>
          評価会社の発行済株式又は議決権<br />の総数
        </td>
        <td><ReadonlyCell n={1} value={fmtNum(totalSharesSum)} /></td>
        <td><ReadonlyCell n={4} value={fmtNum(totalVotesSum)} /></td>
        <td><span className="gov-input gov-input-number" style={roStyle}>100%</span></td>
      </tr>
    </>
  );
}

interface Props {
  g: GFn;
  u: UFn;
  rowCount: number;
  setRowCount: (n: number) => void;
  totalSharesSum: number;
  dozokuVotesSum: number;
  hittouVotesSum: number;
  totalVotesSum: number;
  ratio5: number | null;
  ratio6: number | null;
}

export function Shareholders({
  g, u, rowCount, setRowCount,
  totalSharesSum, dozokuVotesSum, hittouVotesSum, totalVotesSum,
  ratio5, ratio6,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const indices = Array.from({ length: rowCount }, (_, i) => i);
  const rowIds = Array.from({ length: rowCount }, (_, i) => String(i));

  const addRow = () => {
    if (rowCount < MAX_ROWS) setRowCount(rowCount + 1);
  };

  const removeRow = (idx: number) => {
    if (rowCount <= MIN_ROWS) return;
    const hasData = SH_KEYS.some((k) => g(`${k}_${idx}`) !== '');
    if (hasData && !window.confirm(`No.${idx + 1} の行を削除しますか？`)) return;
    for (let i = idx; i < rowCount - 1; i++) {
      SH_KEYS.forEach((k) => u(`${k}_${i}`, g(`${k}_${i + 1}`)));
    }
    SH_KEYS.forEach((k) => u(`${k}_${rowCount - 1}`, ''));
    setRowCount(rowCount - 1);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = Number(active.id);
    const to = Number(over.id);
    const rows = Array.from({ length: rowCount }, (_, i) =>
      SH_KEYS.map((k) => g(`${k}_${i}`))
    );
    const [moved] = rows.splice(from, 1);
    if (moved) rows.splice(to, 0, moved);
    rows.forEach((vals, i) => {
      SH_KEYS.forEach((k, j) => u(`${k}_${i}`, vals[j] ?? ''));
    });
  };

  const sortByVotes = () => {
    const rows = Array.from({ length: rowCount }, (_, i) =>
      SH_KEYS.map((k) => g(`${k}_${i}`))
    );
    rows.sort((a, b) => parseNum(b[5] ?? '') - parseNum(a[5] ?? ''));
    rows.forEach((vals, i) => {
      SH_KEYS.forEach((k, j) => u(`${k}_${i}`, vals[j] ?? ''));
    });
  };

  const clearEmptyRows = () => {
    const nonEmpty: string[][] = [];
    for (let i = 0; i < rowCount; i++) {
      const row = SH_KEYS.map((k) => g(`${k}_${i}`));
      if (row.some((v) => v !== '')) nonEmpty.push(row);
    }
    const newCount = Math.max(nonEmpty.length, DEFAULT_ROWS);
    for (let i = 0; i < rowCount; i++) {
      const vals = (i < nonEmpty.length ? nonEmpty[i] : undefined) ?? SH_KEYS.map(() => '');
      SH_KEYS.forEach((k, j) => u(`${k}_${i}`, vals[j] ?? ''));
    }
    setRowCount(newCount);
  };

  const resetShareholders = () => {
    if (!window.confirm('株主データをすべてリセットしますか？')) return;
    for (let i = 0; i < rowCount; i++) SH_KEYS.forEach((k) => u(`${k}_${i}`, ''));
    setRowCount(DEFAULT_ROWS);
    u('treasury_shares', '');
  };

  const hasAnyName = indices.some((i) => g(`sh_name_${i}`) !== '');
  const hasDozoku = indices.some((i) => g(`sh_dozoku_${i}`) === '1');
  const hasHittou = indices.some((i) => g(`sh_hittou_${i}`) === '1');

  return (
    <div className="panel-left" style={{ borderRight: '0.5px solid #000', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '2px 4px', fontWeight: 700, ...bb, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>１．株主及び評価方式の判定</span>
        <span className="no-print" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {rowCount < MAX_ROWS && (
            <span onClick={addRow} style={{ cursor: 'pointer', color: '#1976d2', fontSize: 8, fontWeight: 400 }}>＋ 追加</span>
          )}
          <span onClick={sortByVotes} style={{ cursor: 'pointer', color: '#1976d2', fontSize: 8, fontWeight: 400 }}>↓ ソート</span>
          <span onClick={clearEmptyRows} style={{ cursor: 'pointer', color: '#1976d2', fontSize: 8, fontWeight: 400 }}>空行削除</span>
          <ResetButton onClick={resetShareholders} />
        </span>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={rowIds} strategy={verticalListSortingStrategy}>
      <table className="gov-table" style={{ fontSize: 8.5, tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: 16 }} /><col style={{ width: 20 }} /><col />
          <col style={{ width: 26 }} /><col style={{ width: 26 }} /><col style={{ width: 30 }} />
          <col style={{ width: 50 }} /><col style={{ width: 50 }} /><col style={{ width: 50 }} />
        </colgroup>
        <thead>
          <tr>
            <th style={{ fontSize: 7, border: 'none', background: 'transparent' }} />
            <th style={{ fontSize: 7 }}>No.</th>
            <th>氏名又は名称</th>
            <th style={{ fontSize: 7 }}>同族</th>
            <th style={{ fontSize: 7 }}>筆頭</th>
            <th>続柄</th>
            <th>株式数</th>
            <th>議決権数</th>
            <th style={{ whiteSpace: 'nowrap' }}>議決権割合</th>
          </tr>
        </thead>
        <tbody>
          {indices.map((i) => (
            <ShareholderRow
              key={i}
              id={String(i)}
              index={i}
              g={g}
              u={u}
              totalVotesSum={totalVotesSum}
              rowCount={rowCount}
              onRemove={() => removeRow(i)}
            />
          ))}
          <SummaryRows
            g={g}
            u={u}
            dozokuVotesSum={dozokuVotesSum}
            hittouVotesSum={hittouVotesSum}
            totalSharesSum={totalSharesSum}
            totalVotesSum={totalVotesSum}
            ratio5={ratio5}
            ratio6={ratio6}
          />
        </tbody>
      </table>
      </SortableContext>
      </DndContext>
      {hasAnyName && (!hasDozoku || !hasHittou) && (
        <div className="no-print" style={{ padding: '2px 6px', fontSize: 7.5, color: '#795548', background: '#fff3e0' }}>
          {!hasDozoku && <div>○ 同族関係者グループのチェックがありません</div>}
          {!hasHittou && <div>○ 筆頭株主グループのチェックがありません</div>}
        </div>
      )}
    </div>
  );
}
