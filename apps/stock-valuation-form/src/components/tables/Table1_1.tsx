import { useState, useEffect } from 'react';
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
import { bb, br, hdr, parseNum, pct, fmtNum, fmtPct } from './shared';
import type { TableProps } from '@/types/form';
import type { GFn, UFn } from './shared';

// ---- Constants ----
const T = 'table1_1' as const;
const MIN_ROWS = 1;
const MAX_ROWS = 20;
const DEFAULT_ROWS = 10;
const SH_KEYS = ['sh_name', 'sh_dozoku', 'sh_hittou', 'sh_rel', 'sh_shares', 'sh_votes', 'sh_ratio'];

// ---- Table1_1-specific Styles ----
const lbl: React.CSSProperties = {
  ...hdr, padding: '1px 3px', whiteSpace: 'nowrap', borderRight: '0.5px solid #000',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
const hl = { background: '#fff8e1', fontWeight: 700 } as const;
const roStyle: React.CSSProperties = { background: '#f5f5f0', cursor: 'default' };
const choiceCell: React.CSSProperties = { fontSize: 7.5, padding: '1px 3px' };
const defTermStyle: React.CSSProperties = { whiteSpace: 'nowrap', textAlign: 'left', verticalAlign: 'top' };

// ---- Data ----
const MINORITY_ITEMS = [
  { field: 'minority_officer', label: <>㋥ 役　員</>, yes: 'である', yesText: 'である → 原則的評価方式等', no: 'でない', noText: 'でない（次の㋭へ）' },
  { field: 'minority_central', label: <>㋭ 納税義務者が<br />中心的な同族株主</>, yes: 'である', yesText: 'である → 原則的評価方式等', no: 'でない', noText: 'でない（次の㋬へ）' },
  { field: 'minority_central_other', label: <>㋬ 納税義務者以外に<br />中心的な同族株主<br />（または株主）</>, yes: 'がいる', yesText: 'がいる → 配当還元方式', no: 'がいない', noText: 'がいない → 原則的評価方式等' },
];

const MINORITY_FIELDS = ['minority_name', 'minority_officer', 'minority_central', 'minority_central_other'] as const;

const MATRIX_ROWS = [
  { key: 'over50' as const, label: '50%超', values: ['50%超', '30%以上', '15%以上'], category: '同族株主', categoryStyle: {} as React.CSSProperties },
  { key: 'under50' as const, label: '50%未満', values: ['50%未満', '30%未満', '15%未満'], category: <>同族株主等<br />以外の株主</>, categoryStyle: { fontSize: 7.5 } as React.CSSProperties },
];

const DEFINITIONS = [
  { term: '同族関係者グループ', desc: '株主の1人及びその同族関係者（法人税法施行令第4条に規定する特殊の関係のある個人又は法人をいいます。）の有する議決権の合計数が最も多いグループをいいます。' },
  { term: '筆頭株主グループ', desc: '納税義務者の属する同族関係者グループ中、議決権数が最も多い株主（筆頭株主）の1人及びその同族関係者の有する議決権の合計数のグループをいいます。' },
  { term: '中心的な同族株主', desc: '課税時期において同族株主の1人並びにその株主の配偶者、直系血族、兄弟姉妹及び1親等の姻族（これらの者の同族関係者である会社のうち、これらの者が有する議決権の合計数がその会社の議決権総数の25%以上である会社を含みます。）の有する議決権の合計数がその会社の議決権総数の25%以上である場合におけるその株主をいいます。' },
  { term: '中心的な株主', desc: '課税時期において株主の1人及びその同族関係者の有する議決権の合計数がその会社の議決権総数の15%以上であるグループのうちに、いずれかのグループに単独でその会社の議決権総数の10%以上の議決権を有する株主がいる場合におけるその株主をいいます。' },
];

// ---- Utilities ----
const formatWareki = (dateStr: string): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  const wareki = new Intl.DateTimeFormat('ja-JP-u-ca-japanese', {
    era: 'long', year: 'numeric', month: 'long', day: 'numeric',
  }).format(d);
  return `${wareki}（${d.getFullYear()}年）`;
};

// ---- Helper Components ----
function ReadonlyCell({ n, value }: { n?: number; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {n !== undefined && <CircledNumber n={n} />}
      <span className="gov-input gov-input-number" style={roStyle}>{value}</span>
    </div>
  );
}

function SlashCell() {
  return <td style={{ textAlign: 'center', color: '#666' }}>／</td>;
}

/* ================================================
 * Extracted Sub-Components
 * ================================================ */

function CompanyHeader({ g, u }: { g: GFn; u: UFn }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '50% 50%', ...bb }}>
      {/* 左ヘッダー */}
      <div style={{ ...br }}>
        <div style={{ display: 'flex', alignItems: 'center', ...bb, minHeight: 22 }}>
          <span style={{ ...lbl, width: 60 }}>会 社 名</span>
          <FormField value={g('companyName')} onChange={(v) => u('companyName', v)} className="flex-1 px-1" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', ...bb, minHeight: 24 }}>
          <span style={{ ...lbl, width: 60 }}>代表者氏名</span>
          <FormField value={g('representative')} onChange={(v) => u('representative', v)} className="flex-1 px-1" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', ...bb, minHeight: 24 }}>
          <span style={{ ...lbl, width: 60 }}>課税時期</span>
          <div style={{ flex: 1, padding: '1px 3px', display: 'flex', alignItems: 'center', gap: 4 }}>
            <input type="date" className="gov-input" style={{ width: 'auto', flex: '0 0 auto' }} value={g('taxDate')} onChange={(e) => u('taxDate', e.target.value)} />
            <span style={{ fontSize: 8, color: '#333' }}>{formatWareki(g('taxDate'))}</span>
          </div>
        </div>
        <div style={{ display: 'flex', minHeight: 40 }}>
          <span style={{ ...lbl, width: 60 }}>直 前 期</span>
          <div style={{ flex: 1, padding: '2px 3px', fontSize: 8.5 }}>
            {(['fiscalStart', 'fiscalEnd'] as const).map((key, idx) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4, ...(idx === 0 ? { marginBottom: 2 } : {}) }}>
                <span>{idx === 0 ? '自' : '至'}</span>
                <input type="date" className="gov-input" style={{ width: 'auto', flex: '0 0 auto' }} value={g(key)} onChange={(e) => u(key, e.target.value)} />
                <span style={{ fontSize: 7.5, color: '#333' }}>{formatWareki(g(key))}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 右ヘッダー */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', ...bb, minHeight: 22 }}>
          <span style={{ ...lbl, width: 55, flexDirection: 'column', lineHeight: 1.2, fontSize: 8 }}>
            <span>本 店 の</span><span>所 在 地</span>
          </span>
          <FormField value={g('address')} onChange={(v) => u('address', v)} className="flex-1 px-1" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr' }}>
          <div style={{ ...br, display: 'flex', alignItems: 'center', justifyContent: 'center', ...hdr, writingMode: 'vertical-rl', textOrientation: 'mixed', letterSpacing: '0.2em', fontSize: 8.5 }}>
            事業内容
          </div>
          <div>
            <div style={{ display: 'flex', ...bb }}>
              <div style={{ flex: 1, ...br, ...hdr, padding: '1px 3px', fontSize: 7, whiteSpace: 'nowrap' }}>取扱品目及び製造、卸売、小売等の区分</div>
              <div style={{ width: 50, ...br, ...hdr, padding: '1px 2px', fontSize: 7, textAlign: 'center', whiteSpace: 'nowrap' }}>業種目番号</div>
              <div style={{ width: 65, ...hdr, padding: '1px 2px', fontSize: 7, textAlign: 'center', whiteSpace: 'nowrap' }}>取引金額の構成比</div>
            </div>
            {[0, 1, 2, 3].map((row) => (
              <div key={row} style={{ display: 'flex', ...bb }}>
                <div style={{ flex: 1, ...br, padding: '1px 3px' }}>
                  <FormField value={g(`businessDesc_${row}`)} onChange={(v) => u(`businessDesc_${row}`, v)} />
                </div>
                <div style={{ width: 50, ...br, padding: '1px 2px' }}>
                  <FormField value={g(`businessCode_${row}`)} onChange={(v) => u(`businessCode_${row}`, v)} textAlign="center" />
                </div>
                <div style={{ width: 65, padding: '1px 2px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FormField value={g(`salesRatio_${row}`)} onChange={(v) => u(`salesRatio_${row}`, v)} className="w-10" textAlign="right" />
                    <span style={{ marginLeft: 1 }}>%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
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

function JudgmentMatrix({ matrixRow, matrixCol, autoClass }: {
  matrixRow: 'over50' | 'under50' | null;
  matrixCol: 0 | 1 | 2 | null;
  autoClass: '同族株主等' | '同族株主等以外' | null;
}) {
  return (
    <>
      {/* 判定基準ヘッダー */}
      <div style={{ padding: '2px 4px', fontSize: 8, ...bb }}>
        納税義務者の属する同族関係者グループの議決権割合
        （<CircledNumber n={5} />の割合）を基として、区分します。
      </div>

      {/* 判定マトリクス */}
      <div style={{ ...bb }}>
        <table className="gov-table" style={{ fontSize: 8 }}>
          <thead>
            <tr>
              <th rowSpan={2} style={{ width: '15%', fontSize: 7.5, lineHeight: 1.3 }}>
                同族関係者<br />グループの<br />議決権割合<br />（<CircledNumber n={5} />の割合）
              </th>
              <th colSpan={3} style={{ fontSize: 7.5 }}>
                筆頭株主グループの議決権割合（<CircledNumber n={6} />の割合）
              </th>
              <th rowSpan={2} style={{ width: '18%', fontSize: 7.5 }}>株主の区分</th>
            </tr>
            <tr>
              <th style={{ fontSize: 7.5, width: '22%' }}>50%超の<br />場合</th>
              <th style={{ fontSize: 7.5, width: '22%' }}>30%以上50%<br />以下の場合</th>
              <th style={{ fontSize: 7.5, width: '22%' }}>30%未満の<br />場合</th>
            </tr>
          </thead>
          <tbody>
            {MATRIX_ROWS.map(({ key, label, values, category, categoryStyle }) => (
              <tr key={key}>
                <td className="gov-header" style={matrixRow === key ? hl : undefined}>{label}</td>
                {values.map((v, col) => (
                  <td key={col} style={matrixRow === key && matrixCol === col ? hl : undefined}>{v}</td>
                ))}
                <td className="gov-header" style={{ ...categoryStyle, ...(matrixRow === key ? hl : {}) }}>{category}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 同族/配当還元 分類（自動判定） */}
      <div style={{ display: 'flex', ...bb }}>
        {([
          { label: '同 族 株 主 等', sub: '（原則的評価方式等）', key: '同族株主等' as const },
          { label: '同族株主等以外の株主', sub: '（配 当 還 元 方 式）', key: '同族株主等以外' as const },
        ]).map(({ label, sub, key }, idx) => (
          <div key={key} style={{ flex: 1, textAlign: 'center', padding: '3px 2px', fontSize: 8.5, ...(idx === 0 ? br : {}), ...(autoClass === key ? hl : {}) }}>
            <div>{label}</div>
            <div>{sub}</div>
          </div>
        ))}
      </div>

      {/* 注意文 */}
      <div style={{ padding: '2px 4px', fontSize: 7.5, ...bb, lineHeight: 1.25 }}>
        「同族株主等」に該当する納税義務者のうち、議決権割合（<CircledNumber n={5} />
        の割合）が５％未満の者の評価方式は、「２．少数株式所有者の評価
        方式の判定」欄により判定します。
      </div>
    </>
  );
}

function MinoritySection({ g, u, minorityResult }: {
  g: GFn; u: UFn;
  minorityResult: '原則的評価方式等' | '配当還元方式' | null;
}) {
  return (
    <>
      <div style={{ padding: '2px 4px', fontWeight: 700, ...bb, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>２．少数株式所有者の評価方式の判定</span>
        <span
          className="no-print"
          onClick={() => MINORITY_FIELDS.forEach((f) => u(f, ''))}
          style={{ cursor: 'pointer', color: '#d32f2f', fontSize: 8, fontWeight: 400 }}
        >
          リセット
        </span>
      </div>

      <table className="gov-table" style={{ fontSize: 8 }}>
        <thead>
          <tr>
            <th style={{ width: '30%' }}>項　　目</th>
            <th colSpan={2}>判　定　内　容</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ height: 18 }}>
            <td className="text-left" style={{ padding: '1px 3px' }}>氏　名</td>
            <td colSpan={2}><FormField value={g('minority_name')} onChange={(v) => u('minority_name', v)} /></td>
          </tr>
          {MINORITY_ITEMS.map(({ field, label, yes, yesText, no, noText }) => (
            <tr key={field} style={{ height: 20 }}>
              <td className="text-left" style={{ padding: '1px 3px', fontSize: 7.5 }}>{label}</td>
              <td style={choiceCell} className={`gov-choice${g(field) === yes ? ' selected' : ''}`} onClick={() => u(field, yes)}>
                {yesText}
              </td>
              <td style={choiceCell} className={`gov-choice${g(field) === no ? ' selected' : ''}`} onClick={() => u(field, no)}>
                {noText}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 判定結果（自動反映） */}
      <table className="gov-table" style={{ fontSize: 8 }}>
        <tbody>
          <tr style={{ height: 22 }}>
            <td className="gov-header" style={{ width: '30%', fontWeight: 700, letterSpacing: '0.3em', textAlign: 'center' }}>判　定</td>
            {([
              { label: '原則的評価方式等', key: '原則的評価方式等' as const },
              { label: '配当還元方式', key: '配当還元方式' as const },
            ]).map(({ label, key }) => (
              <td key={key} style={{ textAlign: 'center', padding: '1px 3px', ...(minorityResult === key ? hl : {}) }}>
                {label}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </>
  );
}

function DefinitionsPanel({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <div className="no-print" style={{ ...bb }}>
      <div
        style={{ padding: '2px 4px', fontWeight: 700, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        onClick={onToggle}
      >
        <span>（参考）用語の定義</span>
        <span style={{ fontSize: 9, fontWeight: 400 }}>{open ? '▲ 閉じる' : '▼ 開く'}</span>
      </div>
      {open && (
        <div style={{ padding: '2px 4px', fontSize: 7.5, lineHeight: 1.5 }}>
          <table className="gov-table" style={{ fontSize: 7.5 }}>
            <tbody>
              {DEFINITIONS.map(({ term, desc }) => (
                <tr key={term}>
                  <td className="gov-header" style={{ width: '15%', ...defTermStyle }}>{term}</td>
                  <td style={{ padding: '1px 4px', textAlign: 'left' }}>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ================================================
 * Main Component
 * ================================================ */

export function Table1_1({ getField, updateField }: TableProps) {
  const g = (f: string) => getField(T, f);
  const u = (f: string, v: string) => updateField(T, f, v);
  const [defOpen, setDefOpen] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // 株主行管理
  const rowCount = Math.max(parseNum(g('sh_count')) || DEFAULT_ROWS, DEFAULT_ROWS);
  const indices = Array.from({ length: rowCount }, (_, i) => i);

  const addRow = () => {
    if (rowCount < MAX_ROWS) u('sh_count', String(rowCount + 1));
  };

  const removeRow = (idx: number) => {
    if (rowCount <= MIN_ROWS) return;
    const hasData = SH_KEYS.some((k) => g(`${k}_${idx}`) !== '');
    if (hasData && !window.confirm(`No.${idx + 1} の行を削除しますか？`)) return;
    for (let i = idx; i < rowCount - 1; i++) {
      SH_KEYS.forEach((k) => u(`${k}_${i}`, g(`${k}_${i + 1}`)));
    }
    SH_KEYS.forEach((k) => u(`${k}_${rowCount - 1}`, ''));
    u('sh_count', String(rowCount - 1));
  };

  const rowIds = Array.from({ length: rowCount }, (_, i) => String(i));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = Number(active.id);
    const to = Number(over.id);
    const rows = Array.from({ length: rowCount }, (_, i) =>
      SH_KEYS.map((k) => g(`${k}_${i}`))
    );
    const [moved] = rows.splice(from, 1);
    rows.splice(to, 0, moved);
    rows.forEach((vals, i) => {
      SH_KEYS.forEach((k, j) => u(`${k}_${i}`, vals[j]));
    });
  };

  // リセット: セクション1（株主テーブル）
  const resetShareholders = () => {
    if (!window.confirm('株主データをすべてリセットしますか？')) return;
    for (let i = 0; i < rowCount; i++) SH_KEYS.forEach((k) => u(`${k}_${i}`, ''));
    u('sh_count', String(DEFAULT_ROWS));
    u('treasury_shares', '');
  };

  // リセット: ヘッダー（会社情報）
  const HEADER_FIELDS = [
    'companyName', 'representative', 'taxDate', 'fiscalStart', 'fiscalEnd', 'address',
    ...([0, 1, 2, 3].flatMap((i) => [`businessDesc_${i}`, `businessCode_${i}`, `salesRatio_${i}`])),
  ];
  const resetHeader = () => {
    if (!window.confirm('会社情報をすべてリセットしますか？')) return;
    HEADER_FIELDS.forEach((f) => u(f, ''));
  };

  // クイック操作: 議決権数の多い順にソート
  const sortByVotes = () => {
    const rows = Array.from({ length: rowCount }, (_, i) =>
      SH_KEYS.map((k) => g(`${k}_${i}`))
    );
    rows.sort((a, b) => parseNum(b[5]) - parseNum(a[5]));
    rows.forEach((vals, i) => {
      SH_KEYS.forEach((k, j) => u(`${k}_${i}`, vals[j]));
    });
  };

  // クイック操作: 空行を削除
  const clearEmptyRows = () => {
    const nonEmpty: string[][] = [];
    for (let i = 0; i < rowCount; i++) {
      const row = SH_KEYS.map((k) => g(`${k}_${i}`));
      if (row.some((v) => v !== '')) nonEmpty.push(row);
    }
    const newCount = Math.max(nonEmpty.length, DEFAULT_ROWS);
    for (let i = 0; i < rowCount; i++) {
      const vals = i < nonEmpty.length ? nonEmpty[i] : SH_KEYS.map(() => '');
      SH_KEYS.forEach((k, j) => u(`${k}_${i}`, vals[j]));
    }
    u('sh_count', String(newCount));
  };

  // 自動計算
  const totalSharesSum = indices.reduce((s, i) => s + parseNum(g(`sh_shares_${i}`)), 0);
  const dozokuVotesSum = indices.reduce((s, i) => g(`sh_dozoku_${i}`) === '1' ? s + parseNum(g(`sh_votes_${i}`)) : s, 0);
  const hittouVotesSum = indices.reduce((s, i) => g(`sh_hittou_${i}`) === '1' ? s + parseNum(g(`sh_votes_${i}`)) : s, 0);
  const totalVotesSum = indices.reduce((s, i) => s + parseNum(g(`sh_votes_${i}`)), 0);
  const ratio5 = pct(dozokuVotesSum, totalVotesSum);
  const ratio6 = pct(hittouVotesSum, totalVotesSum);

  // ① 発行済株式総数・⑤議決権割合をフォーム状態に同期（他の表から参照用）
  useEffect(() => {
    updateField(T, 'total_shares_sum', totalSharesSum > 0 ? String(totalSharesSum) : '');
    updateField(T, 'ratio5', ratio5 !== null ? String(ratio5) : '');
  }, [totalSharesSum, ratio5, updateField]);

  // 入力検証
  const hasAnyName = indices.some((i) => g(`sh_name_${i}`) !== '');
  const hasDozoku = indices.some((i) => g(`sh_dozoku_${i}`) === '1');
  const hasHittou = indices.some((i) => g(`sh_hittou_${i}`) === '1');

  // 判定ロジック: ⑤⑥ → マトリクス → 株主区分
  const matrixRow: 'over50' | 'under50' | null = ratio5 !== null ? (ratio5 > 50 ? 'over50' : 'under50') : null;
  const matrixCol: 0 | 1 | 2 | null = ratio6 !== null ? (ratio6 > 50 ? 0 : ratio6 >= 30 ? 1 : 2) : null;
  const autoClass: '同族株主等' | '同族株主等以外' | null = matrixRow === 'over50' ? '同族株主等' : matrixRow === 'under50' ? '同族株主等以外' : null;

  // 少数株式所有者の判定ロジック
  const mOfficer = g('minority_officer');
  const mCentral = g('minority_central');
  const mCentralOther = g('minority_central_other');
  const minorityResult: '原則的評価方式等' | '配当還元方式' | null =
    mOfficer === 'である' ? '原則的評価方式等' :
    mOfficer === 'でない' && mCentral === 'である' ? '原則的評価方式等' :
    mOfficer === 'でない' && mCentral === 'でない' && mCentralOther === 'がいる' ? '配当還元方式' :
    mOfficer === 'でない' && mCentral === 'でない' && mCentralOther === 'がいない' ? '原則的評価方式等' :
    null;

  return (
    <div className="gov-form">
      {/* タイトル行 */}
      <div style={{ padding: '3px 6px', fontWeight: 700, fontSize: 11, ...bb, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>第１表の１　評価上の株主の判定及び会社規模の判定の明細書</span>
        <span className="no-print" onClick={resetHeader} style={{ cursor: 'pointer', color: '#d32f2f', fontSize: 8, fontWeight: 400 }}>会社情報リセット</span>
      </div>

      {/* 会社情報ヘッダー */}
      <CompanyHeader g={g} u={u} />

      {/* メイン2列: 株主判定 + 判定フロー */}
      <div style={{ display: 'grid', gridTemplateColumns: '50% 50%', flex: 1, minHeight: 0 }}>
        {/* 左: 株主テーブル */}
        <div className="panel-left" style={{ ...br, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '2px 4px', fontWeight: 700, ...bb, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>１．株主及び評価方式の判定</span>
            <span className="no-print" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {rowCount < MAX_ROWS && (
                <span onClick={addRow} style={{ cursor: 'pointer', color: '#1976d2', fontSize: 8, fontWeight: 400 }}>＋ 追加</span>
              )}
              <span onClick={sortByVotes} style={{ cursor: 'pointer', color: '#1976d2', fontSize: 8, fontWeight: 400 }}>↓ ソート</span>
              <span onClick={clearEmptyRows} style={{ cursor: 'pointer', color: '#1976d2', fontSize: 8, fontWeight: 400 }}>空行削除</span>
              <span onClick={resetShareholders} style={{ cursor: 'pointer', color: '#d32f2f', fontSize: 8, fontWeight: 400 }}>リセット</span>
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

        {/* 右: 判定フロー */}
        <div className="panel-right" style={{ display: 'flex', flexDirection: 'column' }}>
          <JudgmentMatrix matrixRow={matrixRow} matrixCol={matrixCol} autoClass={autoClass} />
          <MinoritySection g={g} u={u} minorityResult={minorityResult} />
        </div>
      </div>

      {/* 用語の定義 */}
      <DefinitionsPanel open={defOpen} onToggle={() => setDefOpen((v) => !v)} />
    </div>
  );
}
