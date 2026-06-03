import { useRef, useState, useCallback, useEffect } from 'react';

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

  const toPct = useCallback((clientX: number, clientY: number) => {
    const rect = ref.current!.getBoundingClientRect();
    return {
      left: ((clientX - rect.left) / rect.width) * 100,
      top: ((clientY - rect.top) / rect.height) * 100,
    };
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (!picker || !ref.current) return;
    dragStart.current = toPct(e.clientX, e.clientY);
  }, [picker, toPct]);

  const onMouseUp = useCallback((e: React.MouseEvent) => {
    if (!picker || !ref.current || !dragStart.current) return;
    const end = toPct(e.clientX, e.clientY);
    const s = dragStart.current;
    dragStart.current = null;
    const left = +Math.min(s.left, end.left).toFixed(2);
    const top = +Math.min(s.top, end.top).toFixed(2);
    const w = +Math.abs(end.left - s.left).toFixed(2);
    const h = +Math.abs(end.top - s.top).toFixed(2);
    if (w < 0.5 || h < 0.5) return; // クリックだけは無視
    setReg((prev) => [...prev, { field: `f${prev.length + 1}`, top, left, width: w, height: h }]);
  }, [picker, toPct]);

  const copyAll = useCallback(() => {
    const text = reg.map((f) => `  { field: '${f.field}', top: ${f.top}, left: ${f.left}, width: ${f.width}, height: ${f.height} },`).join('\n');
    navigator.clipboard?.writeText(text);
  }, [reg]);

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
      <input key={f.field} value={g(f.field)} onChange={(e) => u(f.field, e.target.value)}
        inputMode={f.type === 'number' ? 'numeric' : undefined} style={common}
        onMouseDown={(e) => { if (!picker) e.stopPropagation(); }} />
    );
  };

  return (
    <>
      <div ref={ref} onMouseDown={onMouseDown} onMouseUp={onMouseUp}
        style={{ position: 'relative', width, margin: '0 auto', cursor: picker ? 'crosshair' : 'default', userSelect: picker ? 'none' : undefined }}>
        <img src={image} alt="" style={{ width: '100%', display: 'block' }} draggable={false} />
        {fields.map((f) => renderInput(f, false))}
        {picker && reg.map((f) => renderInput(f, true))}
      </div>

      {/* 登録パネル */}
      {picker && (
        <div style={{ position: 'fixed', top: 8, right: 8, width: 230, maxHeight: '90vh', overflowY: 'auto', background: '#fff', border: '1px solid #333', borderRadius: 4, fontSize: 11, zIndex: 9999, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
          <div style={{ padding: '4px 6px', background: '#1e88e5', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>登録 {reg.length}件</span>
            <span>
              <button onClick={copyAll} style={{ marginRight: 4, cursor: 'pointer' }}>コピー</button>
              <button onClick={() => { if (confirm('全削除しますか？')) setReg([]); }} style={{ cursor: 'pointer' }}>クリア</button>
            </span>
          </div>
          <div style={{ padding: 4 }}>
            {reg.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 2, marginBottom: 2 }}>
                <input value={f.field} onChange={(e) => setReg((p) => p.map((x, j) => j === i ? { ...x, field: e.target.value } : x))}
                  style={{ width: 70, fontSize: 10 }} />
                <span style={{ flex: 1, fontSize: 9, color: '#666' }}>{f.top},{f.left} {f.width}×{f.height}</span>
                <button onClick={() => setReg((p) => p.filter((_, j) => j !== i))} style={{ cursor: 'pointer', color: '#c00' }}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
