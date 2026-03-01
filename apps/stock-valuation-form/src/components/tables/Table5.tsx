import { useState } from 'react';
import {
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { NumberField } from '@/components/ui/NumberField';
import { Computed } from '@/components/ui/Computed';
import { EditableTable, NoPrintSpacer, type ColumnDef, type Preset } from '@/components/ui/EditableTable';
import { TableTitleBar } from './TableTitleBar';
import { bb, br, bl, hdr, flex, parseNum, ROW_H } from './shared';
import type { TableProps } from '@/types/form';

/* ================================================
 * Constants
 * ================================================ */

const T = 'table5' as const;
const DEFAULT_ROWS = 20;
const NOTE_OPTIONS = ['', '株式等', '土地等'];
const ROW_FIELDS = ['name', 'eval', 'book', 'note'];
const cellVal: React.CSSProperties = { flex: 1, ...br, padding: '0px 2px', ...flex };

/* ---- Column Definitions ---- */

const ASSET_COLUMNS: ColumnDef[] = [
  { key: 'name', header: '科　目', width: '28%', type: 'text' },
  { key: 'eval', header: '相続税評価額（千円）', type: 'number', autoSync: 'book' },
  { key: 'book', header: '帳簿価額（千円）', type: 'number' },
  { key: 'note', header: '備　考', width: '14%', type: 'select', options: NOTE_OPTIONS },
];

const LIABILITY_COLUMNS: ColumnDef[] = [
  { key: 'name', header: '科　目', width: '28%', type: 'text' },
  { key: 'eval', header: '相続税評価額（千円）', type: 'number', autoSync: 'book' },
  { key: 'book', header: '帳簿価額（千円）', type: 'number' },
  { key: 'note', header: '備　考', width: '14%', type: 'text' },
];

/* ---- Presets ---- */

const ASSET_PRESETS: Preset[] = [
  { name: '現金預金' },
  { name: '受取手形' },
  { name: '売掛金' },
  { name: '有価証券', note: '株式等' },
  { name: '商品・製品' },
  { name: '原材料' },
  { name: '前払費用' },
  { name: '貸付金' },
  { name: '建物' },
  { name: '構築物' },
  { name: '機械装置' },
  { name: '車両運搬具' },
  { name: '器具備品' },
  { name: '土地', note: '土地等' },
  { name: '借地権', note: '土地等' },
  { name: '電話加入権' },
  { name: '保険積立金' },
  { name: '死亡保険金' },
  { name: 'その他の資産' },
];

const LIABILITY_PRESETS: Preset[] = [
  { name: '支払手形' },
  { name: '買掛金' },
  { name: '借入金' },
  { name: '未払金' },
  { name: '未払費用' },
  { name: '未払法人税等' },
  { name: '未払消費税等' },
  { name: '前受金' },
  { name: '預り金' },
  { name: '賞与引当金' },
  { name: '退職金' },
  { name: '保険差益に対する法人税等' },
  { name: 'その他の負債' },
];

/* ================================================
 * Sub-Components (Table5 specific)
 * ================================================ */

const CalcResult = ({ children, active }: { children: React.ReactNode; active?: boolean }) => (
  <span style={{ fontWeight: 700, padding: '0 3px', background: active ? '#fff8e1' : '#e8eaf6' }}>{children}</span>
);

const RowBtn = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button
    className="no-print"
    onClick={onClick}
    style={{ width: 16, height: 16, fontSize: 10, lineHeight: 1, border: '1px solid #ccc', borderRadius: 2, cursor: 'pointer', background: '#f5f5f5' }}
  >{label}</button>
);

/* ================================================
 * Main Component
 * ================================================ */

export function Table5({ getField, updateField, onTabChange }: TableProps) {
  const g = (f: string) => getField(T, f);
  const u = (f: string, v: string) => updateField(T, f, v);

  const [rows, setRows] = useState(DEFAULT_ROWS);
  const [showPreset, setShowPreset] = useState<'a' | 'l' | null>(null);
  const [showInsCalc, setShowInsCalc] = useState(false);

  /* ---- Shared actions ---- */
  const applyPreset = (prefix: string, presets: Preset[]) => {
    let idx = 0;
    for (const p of presets) {
      const exists = Array.from({ length: rows }, (_, i) => g(`${prefix}_name_${i}`)).includes(p.name);
      if (exists) continue;
      while (idx < rows && g(`${prefix}_name_${idx}`)) idx++;
      if (idx >= rows) break;
      u(`${prefix}_name_${idx}`, p.name);
      if (p.note) u(`${prefix}_note_${idx}`, p.note);
      idx++;
    }
    setShowPreset(null);
  };

  const clearSection = (prefix: string) => {
    for (let i = 0; i < rows; i++) ROW_FIELDS.forEach(f => u(`${prefix}_${f}_${i}`, ''));
  };

  const deleteRow = (prefix: string, idx: number) => {
    const name = g(`${prefix}_name_${idx}`);
    const label = name ? `行${idx + 1}「${name}」` : `行${idx + 1}`;
    if (!confirm(`${label}を削除しますか？`)) return;
    for (let i = idx; i < rows - 1; i++) {
      ROW_FIELDS.forEach(f => u(`${prefix}_${f}_${i}`, g(`${prefix}_${f}_${i + 1}`)));
    }
    ROW_FIELDS.forEach(f => u(`${prefix}_${f}_${rows - 1}`, ''));
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleReorder = (prefix: string) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const data = Array.from({ length: rows }, (_, i) =>
      ROW_FIELDS.map(f => g(`${prefix}_${f}_${i}`))
    );
    const reordered = arrayMove(data, Number(active.id), Number(over.id));
    reordered.forEach((row, i) => {
      ROW_FIELDS.forEach((f, j) => u(`${prefix}_${f}_${i}`, row[j]));
    });
  };

  const rowIds = Array.from({ length: rows }, (_, i) => String(i));

  /* ---- Calculations ---- */
  // 資産の部
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

  // 負債の部
  let lEvalSum = 0, lBookSum = 0;
  let insuranceTaxRowIdx = -1;
  for (let i = 0; i < rows; i++) {
    lEvalSum += parseNum(g(`l_eval_${i}`));
    lBookSum += parseNum(g(`l_book_${i}`));
    if (g(`l_name_${i}`) === '保険差益に対する法人税等') insuranceTaxRowIdx = i;
  }

  // 保険差益に対する法人税等
  const insClaim = parseNum(g('ins_claim'));
  const insRetire = parseNum(g('ins_retire'));
  const insuranceTax = Math.floor(Math.max(0, insClaim - insRetire) * 0.37);

  // ⑤〜⑧
  const genbutsuEval = parseNum(g('genbutsu_eval'));
  const genbutsuBook = parseNum(g('genbutsu_book'));
  const netEval  = Math.max(0, aEvalSum - lEvalSum);
  const netBook  = Math.max(0, aBookSum + genbutsuEval - genbutsuBook - lBookSum);
  const diff     = Math.max(0, netEval - netBook);
  const corpTax  = Math.floor(diff * 0.37);

  // ⑨〜⑫
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

  const renderGridCell = (cell: GridCell, isRight: boolean) => {
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
  };

  /* ---- Footers ---- */
  const assetFooter = (
    <>
      {/* 合計 ①② */}
      <div style={{ display: 'flex', ...bb, height: ROW_H, fontWeight: 700 }}>
        <NoPrintSpacer />
        <div style={{ width: '28%', ...br, ...hdr, textAlign: 'center', ...flex, justifyContent: 'center', letterSpacing: '0.5em' }}>合　計</div>
        <div style={cellVal}><span style={{ marginRight: 2 }}>①</span><Computed value={aEvalSum} /></div>
        <div style={cellVal}><span style={{ marginRight: 2 }}>②</span><Computed value={aBookSum} /></div>
        <div style={{ width: '14%' }} />
      </div>
      {/* 株式等 イ・ロ */}
      <div style={{ display: 'flex', ...bb, height: ROW_H, fontSize: 7 }}>
        <NoPrintSpacer />
        <div style={{ width: '28%', ...br, ...hdr, padding: '0px 2px', ...flex }}>株式等の価額の合計額</div>
        <div style={cellVal}><span style={{ marginRight: 2 }}>イ</span><Computed value={stockEval} /></div>
        <div style={cellVal}><span style={{ marginRight: 2 }}>ロ</span><Computed value={stockBook} /></div>
        <div style={{ width: '14%' }} />
      </div>
      {/* 土地等 ハ */}
      <div style={{ display: 'flex', ...bb, height: ROW_H, fontSize: 7 }}>
        <NoPrintSpacer />
        <div style={{ width: '28%', ...br, ...hdr, padding: '0px 2px', ...flex }}>土地等の価額の合計額</div>
        <div style={cellVal}><span style={{ marginRight: 2 }}>ハ</span><Computed value={landEval} /></div>
        <div style={{ flex: 1, ...br, padding: '0px 2px', ...flex, justifyContent: 'center' }}>
          <span style={{ fontSize: 14, color: '#999' }}>／</span>
        </div>
        <div style={{ width: '14%' }} />
      </div>
      {/* 現物出資等 ニ・ホ */}
      <div style={{ display: 'flex', height: ROW_H, fontSize: 7 }}>
        <NoPrintSpacer />
        <div style={{ width: '28%', ...br, ...hdr, padding: '0px 2px', fontSize: 6, ...flex, lineHeight: 1.1 }}>現物出資等受入れ<br />資産の価額の合計額</div>
        <div style={cellVal}><span style={{ marginRight: 2 }}>ニ</span><NumberField value={g('genbutsu_eval')} onChange={(v) => u('genbutsu_eval', v)} /></div>
        <div style={cellVal}><span style={{ marginRight: 2 }}>ホ</span><NumberField value={g('genbutsu_book')} onChange={(v) => u('genbutsu_book', v)} /></div>
        <div style={{ width: '14%' }} />
      </div>
    </>
  );

  const liabilityFooter = (
    <>
      {/* 合計 ③④ */}
      <div style={{ display: 'flex', ...bb, height: ROW_H, fontWeight: 700 }}>
        <NoPrintSpacer />
        <div style={{ width: '28%', ...br, ...hdr, textAlign: 'center', ...flex, justifyContent: 'center', letterSpacing: '0.5em' }}>合　計</div>
        <div style={cellVal}><span style={{ marginRight: 2 }}>③</span><Computed value={lEvalSum} /></div>
        <div style={cellVal}><span style={{ marginRight: 2 }}>④</span><Computed value={lBookSum} /></div>
        <div style={{ width: '14%' }} />
      </div>
      {/* 保険差益に対する法人税等 計算 */}
      <div className="no-print" style={{ ...bb, padding: '2px 4px', background: '#f5f5f5', fontSize: 7 }}>
        <button
          onClick={() => setShowInsCalc(!showInsCalc)}
          style={{ padding: '1px 4px', fontSize: 7, border: '1px solid #aaa', borderRadius: 2, cursor: 'pointer', background: '#fff', color: '#555' }}
        >{showInsCalc ? '▼' : '▶'} 保険差益に対する法人税等の計算</button>
        {showInsCalc && (
          <div style={{ marginTop: 2 }}>
            <div style={{ ...flex, gap: 4 }}>
              <span style={{ flexShrink: 0 }}>生命保険金請求権：</span>
              <div style={{ width: 90, flexShrink: 0 }}><NumberField value={g('ins_claim')} onChange={(v) => u('ins_claim', v)} /></div>
              <span style={{ flexShrink: 0 }}>（千円）</span>
              <span style={{ flexShrink: 0 }}>退職金：</span>
              <div style={{ width: 90, flexShrink: 0 }}><NumberField value={g('ins_retire')} onChange={(v) => u('ins_retire', v)} /></div>
              <span style={{ flexShrink: 0 }}>（千円）</span>
            </div>
            <div style={{ ...flex, gap: 4, marginTop: 1 }}>
              <span>（{insClaim.toLocaleString()} − {insRetire.toLocaleString()}）× 37% =</span>
              <span style={{ fontWeight: 700, background: '#e8eaf6', padding: '1px 4px' }}>{insuranceTax.toLocaleString()}千円</span>
            </div>
            <div style={{ marginTop: 1 }}>
              {insuranceTaxRowIdx >= 0 ? (
                <button
                  onClick={() => { const v = String(insuranceTax); u(`l_eval_${insuranceTaxRowIdx}`, v); u(`l_book_${insuranceTaxRowIdx}`, v); }}
                  style={{ padding: '1px 6px', fontSize: 7, border: '1px solid #1565c0', borderRadius: 2, cursor: 'pointer', background: '#e3f2fd', color: '#1565c0' }}
                >行{insuranceTaxRowIdx + 1}に反映</button>
              ) : (
                <span style={{ color: '#c62828', fontSize: 6.5 }}>※「保険差益に対する法人税等」行を追加で反映可</span>
              )}
            </div>
          </div>
        )}
      </div>
      <div style={{ flex: 1, background: '#fafafa' }} />
    </>
  );

  return (
    <div className="gov-form" style={{ fontSize: 8 }}>

      {/* Group 1: タイトル */}
      <TableTitleBar
        title="第５表　１株当たりの純資産価額（相続税評価額）の計算明細書"
        companyNameReadonly={getField('table1_1', 'companyName')}
      />

      {/* Group 2: 1. 資産及び負債の金額（課税時期現在） */}
      <div style={{ ...bb, padding: '2px 4px', fontWeight: 700, fontSize: 8, textAlign: 'center', letterSpacing: '0.3em', ...flex, justifyContent: 'center' }}>
        <span style={{ flex: 1 }}>１．資産及び負債の金額（課税時期現在）</span>
        <span className="no-print" style={{ display: 'inline-flex', gap: 2, marginLeft: 4, letterSpacing: 0 }}>
          <RowBtn label="−" onClick={() => setRows(Math.max(1, rows - 1))} />
          <RowBtn label="＋" onClick={() => setRows(rows + 1)} />
        </span>
      </div>

      <div style={{ display: 'flex', ...bb }}>
        {/* 資産の部 */}
        <div style={{ flex: 1, ...br, display: 'flex', flexDirection: 'column' }}>
          <EditableTable
            prefix="a"
            label="資　産　の　部"
            columns={ASSET_COLUMNS}
            presets={ASSET_PRESETS}
            rows={rows}
            rowIds={rowIds}
            g={g}
            u={u}
            showPreset={showPreset === 'a'}
            onTogglePreset={() => setShowPreset(showPreset === 'a' ? null : 'a')}
            onClear={() => { if (confirm('資産の部を全てクリアしますか？')) clearSection('a'); }}
            sensors={sensors}
            onDragEnd={handleReorder('a')}
            onDeleteRow={(idx) => deleteRow('a', idx)}
            onApplyPreset={(p) => applyPreset('a', [p])}
            onApplyAllPresets={() => applyPreset('a', ASSET_PRESETS)}
            footer={assetFooter}
          />
        </div>

        {/* 負債の部 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <EditableTable
            prefix="l"
            label="負　債　の　部"
            columns={LIABILITY_COLUMNS}
            presets={LIABILITY_PRESETS}
            rows={rows}
            rowIds={rowIds}
            g={g}
            u={u}
            showPreset={showPreset === 'l'}
            onTogglePreset={() => setShowPreset(showPreset === 'l' ? null : 'l')}
            onClear={() => { if (confirm('負債の部を全てクリアしますか？')) clearSection('l'); }}
            sensors={sensors}
            onDragEnd={handleReorder('l')}
            onDeleteRow={(idx) => deleteRow('l', idx)}
            onApplyPreset={(p) => applyPreset('l', [p])}
            onApplyAllPresets={() => applyPreset('l', LIABILITY_PRESETS)}
            footer={liabilityFooter}
          />
        </div>
      </div>

      {/* Group 3+4: ⑤-⑫ Grid */}
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

      {/* 計算過程（no-print） */}
      {(aEvalSum > 0 || aBookSum > 0 || lEvalSum > 0 || lBookSum > 0) && (
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
      )}

    </div>
  );
}
