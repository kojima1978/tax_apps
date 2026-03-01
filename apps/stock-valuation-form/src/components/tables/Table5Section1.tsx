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
import { bb, br, hdr, flex, parseNum, ROW_H } from './shared';
import type { GFn, UFn } from './shared';

/* ---- Constants ---- */

const NOTE_OPTIONS = ['', '株式等', '土地等'];
const ROW_FIELDS = ['name', 'eval', 'book', 'note'];
const cellVal: React.CSSProperties = { flex: 1, ...br, padding: '0px 2px', ...flex };

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

/* ---- Sub-Components ---- */

const RowBtn = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button
    className="no-print"
    onClick={onClick}
    style={{ width: 16, height: 16, fontSize: 10, lineHeight: 1, border: '1px solid #ccc', borderRadius: 2, cursor: 'pointer', background: '#f5f5f5' }}
  >{label}</button>
);

/* ---- Types ---- */

export interface Section1Totals {
  aEvalSum: number;
  aBookSum: number;
  stockEval: number;
  stockBook: number;
  landEval: number;
  lEvalSum: number;
  lBookSum: number;
}

interface Props {
  g: GFn;
  u: UFn;
  rows: number;
  setRows: (n: number) => void;
  totals: Section1Totals;
}

/** 1. 資産及び負債の金額（課税時期現在） */
export function Table5Section1({ g, u, rows, setRows, totals }: Props) {
  const [showPreset, setShowPreset] = useState<'a' | 'l' | null>(null);
  const [showInsCalc, setShowInsCalc] = useState(false);

  const { aEvalSum, aBookSum, stockEval, stockBook, landEval, lEvalSum, lBookSum } = totals;

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

  /* ---- 保険差益計算 ---- */
  const insClaim = parseNum(g('ins_claim'));
  const insRetire = parseNum(g('ins_retire'));
  const insuranceTax = Math.floor(Math.max(0, insClaim - insRetire) * 0.37);
  let insuranceTaxRowIdx = -1;
  for (let i = 0; i < rows; i++) {
    if (g(`l_name_${i}`) === '保険差益に対する法人税等') { insuranceTaxRowIdx = i; break; }
  }

  /* ---- Footers ---- */
  const assetFooter = (
    <>
      <div style={{ display: 'flex', ...bb, height: ROW_H, fontWeight: 700 }}>
        <NoPrintSpacer />
        <div style={{ width: '28%', ...br, ...hdr, textAlign: 'center', ...flex, justifyContent: 'center', letterSpacing: '0.5em' }}>合　計</div>
        <div style={cellVal}><span style={{ marginRight: 2 }}>①</span><Computed value={aEvalSum} /></div>
        <div style={cellVal}><span style={{ marginRight: 2 }}>②</span><Computed value={aBookSum} /></div>
        <div style={{ width: '14%' }} />
      </div>
      <div style={{ display: 'flex', ...bb, height: ROW_H, fontSize: 7 }}>
        <NoPrintSpacer />
        <div style={{ width: '28%', ...br, ...hdr, padding: '0px 2px', ...flex }}>株式等の価額の合計額</div>
        <div style={cellVal}><span style={{ marginRight: 2 }}>イ</span><Computed value={stockEval} /></div>
        <div style={cellVal}><span style={{ marginRight: 2 }}>ロ</span><Computed value={stockBook} /></div>
        <div style={{ width: '14%' }} />
      </div>
      <div style={{ display: 'flex', ...bb, height: ROW_H, fontSize: 7 }}>
        <NoPrintSpacer />
        <div style={{ width: '28%', ...br, ...hdr, padding: '0px 2px', ...flex }}>土地等の価額の合計額</div>
        <div style={cellVal}><span style={{ marginRight: 2 }}>ハ</span><Computed value={landEval} /></div>
        <div style={{ flex: 1, ...br, padding: '0px 2px', ...flex, justifyContent: 'center' }}>
          <span style={{ fontSize: 14, color: '#999' }}>／</span>
        </div>
        <div style={{ width: '14%' }} />
      </div>
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
      <div style={{ display: 'flex', ...bb, height: ROW_H, fontWeight: 700 }}>
        <NoPrintSpacer />
        <div style={{ width: '28%', ...br, ...hdr, textAlign: 'center', ...flex, justifyContent: 'center', letterSpacing: '0.5em' }}>合　計</div>
        <div style={cellVal}><span style={{ marginRight: 2 }}>③</span><Computed value={lEvalSum} /></div>
        <div style={cellVal}><span style={{ marginRight: 2 }}>④</span><Computed value={lBookSum} /></div>
        <div style={{ width: '14%' }} />
      </div>
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
    <>
      {/* セクションヘッダー */}
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
    </>
  );
}
