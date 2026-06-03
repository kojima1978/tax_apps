import type { GFn, UFn } from './types';

/** 該当・非該当トグル（クリックで赤丸） */
function Toggle({ value, selected, onToggle, children }: {
  value: string; selected: boolean; onToggle: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <span
      onClick={() => onToggle(selected ? '' : value)}
      style={{ position: 'relative', display: 'inline-block', cursor: 'pointer', userSelect: 'none' }}
    >
      {children}
      {selected && (
        <span style={{ position: 'absolute', inset: -3, border: '2px solid #c00', borderRadius: '50%', pointerEvents: 'none' }} />
      )}
    </span>
  );
}

/** 該当・非該当セル */
function JudgeCell({ field, g, u }: { field: string; g: GFn; u: UFn }) {
  const v = g(field);
  return (
    <>
      <td>
        <Toggle value="yes" selected={v === 'yes'} onToggle={(nv) => u(field, nv)}>該　当</Toggle>
      </td>
      <td>
        <Toggle value="no" selected={v === 'no'} onToggle={(nv) => u(field, nv)}>非該当</Toggle>
      </td>
    </>
  );
}

export function Section56({ g, u }: { g: GFn; u: UFn }) {
  return (
    <div style={{ display: 'flex', borderBottom: '0.5px solid #000', height: '100%' }}>
      {/* ===== 5. 開業前又は休業中の会社 ===== */}
      <table className="gov-table" style={{ tableLayout: 'fixed', fontSize: 7, borderRight: '0.5px solid #000', height: '100%' }}>
        <colgroup>
          <col style={{ width: '32%' }} />{/* 5 ラベル */}
          <col style={{ width: '17%' }} />
          <col style={{ width: '17%' }} />
          <col style={{ width: '17%' }} />
          <col style={{ width: '17%' }} />
        </colgroup>
        <tbody>
          <tr>
            <td rowSpan={2} style={{ textAlign: 'left', fontWeight: 700, fontSize: 7.5, verticalAlign: 'middle' }}>
              ５．開業前又は休業中の会社
            </td>
            <td colSpan={2} style={{ fontSize: 6.5 }}>開業前の会社の判定</td>
            <td colSpan={2} style={{ fontSize: 6.5 }}>休業中の会社の判定</td>
          </tr>
          <tr>
            <JudgeCell field="judgment5_before" g={g} u={u} />
            <JudgeCell field="judgment5_rest" g={g} u={u} />
          </tr>
        </tbody>
      </table>

      {/* ===== 6. 清算中の会社 ===== */}
      <table className="gov-table" style={{ tableLayout: 'fixed', fontSize: 7 }}>
        <colgroup>
          <col style={{ width: '40%' }} />{/* 6 ラベル */}
          <col style={{ width: '30%' }} />
          <col style={{ width: '30%' }} />
        </colgroup>
        <tbody>
          <tr>
            <td rowSpan={2} style={{ textAlign: 'left', fontWeight: 700, fontSize: 7.5, verticalAlign: 'middle' }}>
              ６．清 算 中 の 会 社
            </td>
            <td colSpan={2} style={{ fontWeight: 500, letterSpacing: '1em' }}>判　定</td>
          </tr>
          <tr>
            <JudgeCell field="judgment6" g={g} u={u} />
          </tr>
        </tbody>
      </table>
    </div>
  );
}
