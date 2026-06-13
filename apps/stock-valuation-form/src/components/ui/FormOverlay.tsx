import { useRef, useState, useCallback, useEffect } from 'react';
import { GridForm, type GridCell } from './GridForm';

/** オーバーレイ入力欄の定義（座標・サイズはすべて％） */
export interface OverlayField {
  field: string;
  top: number;
  left: number;
  width: number;
  height?: number;
  type?: 'text' | 'number';
  align?: 'left' | 'center' | 'right';
  fontSize?: number;
  readOnly?: boolean;
  value?: string;
  kind?: 'cell' | 'input' | 'label'; // グリッド生成用の種別
  text?: string;                     // label/cell の表示文字
}

interface FormOverlayProps {
  image: string;
  width?: string;
  fields: OverlayField[];
  g: (f: string) => string;
  u: (f: string, v: string) => void;
  /** 開発用: ドラッグで矩形を描いて蓄積・コピー */
  picker?: boolean;
  /** ピッカー蓄積用 localStorage キー（表ごとに分ける） */
  storageKey?: string;
}

export function FormOverlay({ image, width = '210mm', fields, g, u, picker = false, storageKey = 'overlay_picker' }: FormOverlayProps) {
  const ref = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ left: number; top: number } | null>(null);

  // ピッカーで蓄積中のフィールド（localStorage 永続）
  const [reg, setReg] = useState<OverlayField[]>(() => {
    if (!picker) return [];
    try { return JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch { return []; }
  });
  useEffect(() => {
    if (picker) localStorage.setItem(storageKey, JSON.stringify(reg));
  }, [reg, picker, storageKey]);

  // グリッド描画プレビュー（測定したセルを GridForm で表示）
  const [preview, setPreview] = useState(false);
  // ドラッグ直後の未確定の枠
  const [pending, setPending] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  // ドラッグ中のリアルタイム枠
  const [live, setLive] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  const confirmPending = useCallback(() => {
    setReg((prev) => {
      if (!pending) return prev;
      return [...prev, { field: `f${prev.length + 1}`, ...pending, kind: 'input' as const, text: '' }];
    });
    setPending(null);
  }, [pending]);

  const patch = useCallback((i: number, key: 'top' | 'left' | 'width' | 'height', v: number) => {
    setReg((p) => p.map((x, j) => j === i ? { ...x, [key]: v } : x));
  }, []);

  const toPct = useCallback((clientX: number, clientY: number) => {
    const rect = ref.current!.getBoundingClientRect();
    return {
      left: ((clientX - rect.left) / rect.width) * 100,
      top: ((clientY - rect.top) / rect.height) * 100,
    };
  }, []);

  const boxFrom = useCallback((s: { left: number; top: number }, clientX: number, clientY: number) => {
    const end = toPct(clientX, clientY);
    return {
      left: +Math.min(s.left, end.left).toFixed(2),
      top: +Math.min(s.top, end.top).toFixed(2),
      width: +Math.abs(end.left - s.left).toFixed(2),
      height: +Math.abs(end.top - s.top).toFixed(2),
    };
  }, [toPct]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (!picker || !ref.current) return;
    dragStart.current = toPct(e.clientX, e.clientY);
    setPending(null);
    setLive({ ...dragStart.current, width: 0, height: 0 });
  }, [picker, toPct]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!picker || !dragStart.current) return;
    setLive(boxFrom(dragStart.current, e.clientX, e.clientY));
  }, [picker, boxFrom]);

  const onMouseUp = useCallback((e: React.MouseEvent) => {
    if (!picker || !ref.current || !dragStart.current) return;
    const b = boxFrom(dragStart.current, e.clientX, e.clientY);
    dragStart.current = null;
    setLive(null);
    if (b.width < 0.5 || b.height < 0.5) { setPending(null); return; } // クリックだけは無視
    setPending(b); // 確定ボタンで登録
  }, [picker, boxFrom]);

  const copyAll = useCallback(() => {
    const text = reg.map((f) => {
      const kind = f.kind ?? 'input';
      const body = kind === 'input'
        ? `field: '${f.field}', kind: 'input'`
        : `kind: '${kind}', text: '${(f.text ?? '').replace(/'/g, "\\'")}'`;
      return `  { ${body}, top: ${f.top}, left: ${f.left}, width: ${f.width}, height: ${f.height} },`;
    }).join('\n');
    navigator.clipboard?.writeText(text);
  }, [reg]);

  const cycleKind = useCallback((i: number) => {
    setReg((p) => p.map((x, j) => {
      if (j !== i) return x;
      const order = ['input', 'label', 'cell'] as const;
      const next = order[(order.indexOf((x.kind ?? 'input') as 'input') + 1) % 3];
      return { ...x, kind: next };
    }));
  }, []);

  const renderInput = (f: OverlayField, isReg: boolean) => {
    const common: React.CSSProperties = {
      position: 'absolute',
      top: `${f.top}%`, left: `${f.left}%`, width: `${f.width}%`,
      height: f.height ? `${f.height}%` : undefined,
      fontSize: f.fontSize ?? 11,
      textAlign: f.align ?? 'right',
      border: picker ? `1px solid ${isReg ? 'rgba(30,136,229,0.7)' : 'rgba(255,0,0,0.5)'}` : 'none',
      background: picker ? (isReg ? 'rgba(30,136,229,0.12)' : 'rgba(255,255,0,0.12)') : 'transparent',
      padding: '0 2px', boxSizing: 'border-box', fontFamily: 'inherit', color: '#000', outline: 'none',
      lineHeight: f.height ? `${f.height}%` : undefined,
    };
    if (f.readOnly) {
      return <div key={f.field} style={{ ...common, display: 'flex', alignItems: 'center', justifyContent: f.align === 'left' ? 'flex-start' : f.align === 'center' ? 'center' : 'flex-end' }}>{f.value ?? g(f.field)}</div>;
    }
    return (
      <input key={f.field} id={`overlay-${f.field}`} name={`overlay.${f.field}`} value={g(f.field)} onChange={(e) => u(f.field, e.target.value)}
        inputMode={f.type === 'number' ? 'numeric' : undefined} style={common}
        onMouseDown={(e) => { if (!picker) e.stopPropagation(); }} />
    );
  };

  return (
    <>
      {preview ? (
        <GridForm cells={reg as GridCell[]} g={g} u={u} width={width} />
      ) : (
        <div ref={ref} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp}
          style={{ position: 'relative', width, margin: '0 auto', cursor: picker ? 'crosshair' : 'default', userSelect: picker ? 'none' : undefined }}>
          <img src={image} alt="" style={{ width: '100%', display: 'block' }} draggable={false} />
          {fields.map((f) => renderInput(f, false))}
          {picker && reg.map((f) => renderInput(f, true))}
          {/* ドラッグ中のライブ枠 */}
          {picker && live && (
            <div style={{ position: 'absolute', top: `${live.top}%`, left: `${live.left}%`, width: `${live.width}%`, height: `${live.height}%`, border: '2px solid #e53935', background: 'rgba(229,57,53,0.10)', pointerEvents: 'none' }} />
          )}
          {/* 未確定の枠（破線） */}
          {picker && pending && (
            <div style={{ position: 'absolute', top: `${pending.top}%`, left: `${pending.left}%`, width: `${pending.width}%`, height: `${pending.height}%`, border: '2px dashed #e53935', background: 'rgba(229,57,53,0.12)', pointerEvents: 'none' }} />
          )}
        </div>
      )}

      {/* 確定 / やり直しバー */}
      {picker && pending && (
        <div style={{ position: 'fixed', bottom: 12, left: '50%', transform: 'translateX(-50%)', background: '#fff', border: '1px solid #333', borderRadius: 6, padding: '6px 10px', fontSize: 12, zIndex: 9999, boxShadow: '0 2px 8px rgba(0,0,0,0.3)', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontFamily: 'monospace', fontSize: 11 }}>
            t{pending.top} l{pending.left} {pending.width}×{pending.height}
          </span>
          <button onClick={confirmPending} style={{ cursor: 'pointer', background: '#1e88e5', color: '#fff', border: 'none', borderRadius: 4, padding: '3px 12px' }}>確定</button>
          <button onClick={() => setPending(null)} style={{ cursor: 'pointer', padding: '3px 10px' }}>やり直し</button>
        </div>
      )}

      {/* 登録パネル */}
      {picker && (
        <div style={{ position: 'fixed', top: 8, right: 8, width: 230, maxHeight: '90vh', overflowY: 'auto', background: '#fff', border: '1px solid #333', borderRadius: 4, fontSize: 11, zIndex: 9999, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
          <div style={{ padding: '4px 6px', background: '#1e88e5', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>登録 {reg.length}件</span>
            <span>
              <button onClick={() => setPreview((v) => !v)} style={{ marginRight: 4, cursor: 'pointer' }}>{preview ? '測定' : 'ｸﾞﾘｯﾄﾞ'}</button>
              <button onClick={copyAll} style={{ marginRight: 4, cursor: 'pointer' }}>コピー</button>
              <button onClick={() => { if (confirm('全削除しますか？')) setReg([]); }} style={{ cursor: 'pointer' }}>クリア</button>
            </span>
          </div>
          <div style={{ padding: 4 }}>
            {reg.map((f, i) => {
              const kind = f.kind ?? 'input';
              const kColor = kind === 'input' ? '#1e88e5' : kind === 'label' ? '#43a047' : '#999';
              const numCell = (key: 'top' | 'left' | 'width' | 'height', label: string) => (
                <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <span style={{ color: '#999' }}>{label}</span>
                  <input id={`overlay-reg-${i}-${key}`} name={`overlay.reg.${i}.${key}`} type="number" step={0.1} value={f[key] ?? 0} onChange={(e) => patch(i, key, +e.target.value)} style={{ width: 38, fontSize: 9 }} />
                </span>
              );
              return (
                <div key={i} style={{ marginBottom: 3, paddingBottom: 2, borderBottom: '1px solid #eee' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <button onClick={() => cycleKind(i)} title="種別切替" style={{ width: 18, fontSize: 9, cursor: 'pointer', color: '#fff', background: kColor, border: 'none', borderRadius: 2 }}>
                      {kind === 'input' ? '入' : kind === 'label' ? '文' : '枠'}
                    </button>
                    {kind === 'input' ? (
                      <input id={`overlay-reg-${i}-field`} name={`overlay.reg.${i}.field`} value={f.field} placeholder="field" onChange={(e) => setReg((p) => p.map((x, j) => j === i ? { ...x, field: e.target.value } : x))} style={{ flex: 1, fontSize: 10, minWidth: 0 }} />
                    ) : (
                      <input id={`overlay-reg-${i}-text`} name={`overlay.reg.${i}.text`} value={f.text ?? ''} placeholder="表示文字" onChange={(e) => setReg((p) => p.map((x, j) => j === i ? { ...x, text: e.target.value } : x))} style={{ flex: 1, fontSize: 10, minWidth: 0 }} />
                    )}
                    <button onClick={() => setReg((p) => p.filter((_, j) => j !== i))} style={{ cursor: 'pointer', color: '#c00' }}>×</button>
                  </div>
                  <div style={{ display: 'flex', gap: 3, fontSize: 9, marginTop: 1 }}>
                    {numCell('top', 't')}{numCell('left', 'l')}{numCell('width', 'w')}{numCell('height', 'h')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
