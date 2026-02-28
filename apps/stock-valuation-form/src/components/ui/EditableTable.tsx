import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  type SensorDescriptor,
  type SensorOptions,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FormField } from '@/components/ui/FormField';
import { NumberField } from '@/components/ui/NumberField';

/* ================================================
 * Types (exported)
 * ================================================ */

export interface ColumnDef {
  key: string;
  header: string;
  width?: string;
  type: 'text' | 'number' | 'select';
  options?: string[];
  autoSync?: string;
}

export interface Preset {
  name: string;
  note?: string;
}

export interface EditableTableProps {
  prefix: string;
  label: string;
  columns: ColumnDef[];
  presets: Preset[];
  rows: number;
  rowIds: string[];
  g: (field: string) => string;
  u: (field: string, value: string) => void;
  showPreset: boolean;
  onTogglePreset: () => void;
  onClear: () => void;
  sensors: SensorDescriptor<SensorOptions>[];
  onDragEnd: (event: DragEndEvent) => void;
  onDeleteRow: (idx: number) => void;
  onApplyPreset: (p: Preset) => void;
  onApplyAllPresets: () => void;
  footer?: React.ReactNode;
}

/* ================================================
 * Style constants
 * ================================================ */

const ROW_H = 16;
const bb = { borderBottom: '0.5px solid #000' } as const;
const br = { borderRight: '0.5px solid #000' } as const;
const hdr: React.CSSProperties = { background: '#f5f5f0', fontWeight: 500 };
const flex: React.CSSProperties = { display: 'flex', alignItems: 'center' };

/* ================================================
 * Internal Sub-Components
 * ================================================ */

function SortableRow({ id, rowIndex, onDelete, children }: {
  id: string; rowIndex: number; onDelete: () => void; children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      className="sortable-row"
      style={{
        ...flex, borderBottom: '0.5px solid #000', height: ROW_H,
        transform: CSS.Transform.toString(transform), transition,
        opacity: isDragging ? 0.5 : 1,
        background: isDragging ? '#fff8e1' : undefined,
      }}
    >
      <div
        className="no-print row-num"
        {...attributes}
        {...listeners}
        onDoubleClick={(e) => { e.preventDefault(); onDelete(); }}
        style={{ width: 18, ...br, ...flex, justifyContent: 'center', fontSize: 6.5, color: '#999', cursor: 'grab' }}
      >
        {rowIndex + 1}
      </div>
      {children}
    </div>
  );
}

function SectionTitle({ label, showPreset, onTogglePreset, onClear }: {
  label: string; showPreset: boolean; onTogglePreset: () => void; onClear: () => void;
}) {
  return (
    <div style={{ ...bb, ...hdr, textAlign: 'center', padding: '1px', letterSpacing: '0.5em', fontWeight: 700, height: ROW_H, ...flex, justifyContent: 'center', position: 'relative' }}>
      {label}
      <span className="no-print" style={{ position: 'absolute', right: 2, display: 'flex', gap: 2, letterSpacing: 0, fontSize: 7, fontWeight: 400 }}>
        <button onClick={onTogglePreset} style={{ padding: '0 3px', border: '1px solid #aaa', borderRadius: 2, cursor: 'pointer', background: showPreset ? '#e3f2fd' : '#fff', fontSize: 7 }}>科目</button>
        <button onClick={onClear} style={{ padding: '0 3px', border: '1px solid #aaa', borderRadius: 2, cursor: 'pointer', background: '#fff', fontSize: 7, color: '#c62828' }}>クリア</button>
      </span>
    </div>
  );
}

function PresetPanel({ presets, onSelect, onSelectAll }: {
  presets: Preset[]; onSelect: (p: Preset) => void; onSelectAll: () => void;
}) {
  return (
    <div className="no-print" style={{ padding: '3px 4px', background: '#e3f2fd', ...bb, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
      {presets.map((p) => (
        <button key={p.name} onClick={() => onSelect(p)} style={{ padding: '1px 4px', fontSize: 7, border: '1px solid #90caf9', borderRadius: 2, cursor: 'pointer', background: '#fff' }}>{p.name}</button>
      ))}
      <button onClick={onSelectAll} style={{ padding: '1px 4px', fontSize: 7, border: '1px solid #1565c0', borderRadius: 2, cursor: 'pointer', background: '#1565c0', color: '#fff' }}>全科目</button>
    </div>
  );
}

const NoPrintSpacer = () => <div className="no-print" style={{ width: 18, ...br }} />;

/* ================================================
 * Cell renderer
 * ================================================ */

function CellRenderer({ col, prefix, rowIndex, isLast, g, u }: {
  col: ColumnDef; prefix: string; rowIndex: number; isLast: boolean;
  g: (field: string) => string; u: (field: string, value: string) => void;
}) {
  const fieldKey = `${prefix}_${col.key}_${rowIndex}`;
  const value = g(fieldKey);

  const cellStyle: React.CSSProperties = col.width
    ? { width: col.width, padding: '0px 1px', ...(isLast ? {} : br) }
    : { flex: 1, ...br, padding: '0px 2px', ...flex };

  if (col.type === 'select') {
    return (
      <div style={cellStyle}>
        <select value={value} onChange={(e) => u(fieldKey, e.target.value)} className="gov-input" style={{ fontSize: 'inherit', padding: '1px 0' }}>
          {(col.options ?? []).map((opt) => <option key={opt} value={opt}>{opt || '—'}</option>)}
        </select>
      </div>
    );
  }

  if (col.type === 'number') {
    const handleChange = (v: string) => {
      u(fieldKey, v);
      if (col.autoSync) {
        const syncKey = `${prefix}_${col.autoSync}_${rowIndex}`;
        const syncVal = g(syncKey);
        if (!syncVal || syncVal === value) u(syncKey, v);
      }
    };
    return (
      <div style={cellStyle}>
        <NumberField value={value} onChange={handleChange} />
      </div>
    );
  }

  // text
  return (
    <div style={cellStyle}>
      <FormField value={value} onChange={(v) => u(fieldKey, v)} />
    </div>
  );
}

/* ================================================
 * Main Component
 * ================================================ */

export function EditableTable({
  prefix, label, columns, presets, rows, rowIds,
  g, u, showPreset, onTogglePreset, onClear,
  sensors, onDragEnd, onDeleteRow, onApplyPreset, onApplyAllPresets,
  footer,
}: EditableTableProps) {
  return (
    <>
      <SectionTitle label={label} showPreset={showPreset} onTogglePreset={onTogglePreset} onClear={onClear} />
      {showPreset && (
        <PresetPanel presets={presets} onSelect={onApplyPreset} onSelectAll={onApplyAllPresets} />
      )}
      {/* Column Headers */}
      <div style={{ display: 'flex', ...bb, fontSize: 7, textAlign: 'center', height: ROW_H }}>
        <div className="no-print" style={{ width: 18, ...br, ...hdr, ...flex, justifyContent: 'center', fontSize: 6 }}>No</div>
        {columns.map((col, ci) => {
          const isLast = ci === columns.length - 1;
          return (
            <div key={col.key} style={col.width
              ? { width: col.width, ...(isLast ? {} : br), ...hdr, ...flex, justifyContent: 'center' }
              : { flex: 1, ...br, ...hdr, ...flex, justifyContent: 'center' }
            }>{col.header}</div>
          );
        })}
      </div>
      {/* Sortable Rows */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={rowIds} strategy={verticalListSortingStrategy}>
          {rowIds.map((id) => {
            const i = Number(id);
            return (
              <SortableRow key={id} id={id} rowIndex={i} onDelete={() => onDeleteRow(i)}>
                {columns.map((col, ci) => (
                  <CellRenderer key={col.key} col={col} prefix={prefix} rowIndex={i} isLast={ci === columns.length - 1} g={g} u={u} />
                ))}
              </SortableRow>
            );
          })}
        </SortableContext>
      </DndContext>
      {/* Footer (summary rows etc.) */}
      {footer}
    </>
  );
}
