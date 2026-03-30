import { NumberField } from '@/components/ui/NumberField';
import { br, hdr } from '../shared';
import type { GFn, UFn } from '../shared';

interface Props {
  g: GFn;
  u: UFn;
}

export function Section2DividendReturn({ g, u }: Props) {
  return (
    <div style={{ display: 'flex', fontSize: 7.5, flex: 1 }}>
      <div style={{ width: 90, ...br, ...hdr, padding: '3px 6px', display: 'flex', alignItems: 'center', fontSize: 7, lineHeight: 1.3 }}>
        配当還元価額
      </div>
      <div style={{ flex: 1, ...br, padding: '3px 6px', display: 'flex', alignItems: 'center', gap: 4 }}>
        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ padding: '0 4px', fontSize: 7 }}>⑱の金額</div>
          <div style={{ borderTop: '0.5px solid #000', padding: '0 4px', fontSize: 7 }}>10%</div>
        </div>
        <span>×</span>
        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ padding: '0 4px', fontSize: 7 }}>⑬の金額</div>
          <div style={{ borderTop: '0.5px solid #000', padding: '0 4px', fontSize: 7 }}>50円</div>
        </div>
        <span>=</span>
        <span style={{ fontWeight: 500, fontSize: 8 }}>⑲</span>
        <NumberField value={g('div_return_price')} onChange={(v) => u('div_return_price', v)} className="w-12" />
        <span>円</span>
      </div>
      <div style={{ width: 80, ...br, padding: '3px 6px', display: 'flex', alignItems: 'center' }}>
        <span style={{ fontWeight: 500, fontSize: 8, marginRight: 2 }}>⑳</span>
        <NumberField value={g('div_return_final')} onChange={(v) => u('div_return_final', v)} className="flex-1" />
        <span className="ml-0.5">円</span>
      </div>
      <div style={{ width: 110, padding: '2px 4px', fontSize: 5.5, lineHeight: 1.3, display: 'flex', alignItems: 'center' }}>
        【⑲の金額が、原則的評価方式により計算した価額を超える場合には、原則的評価方式により計算した価額とします。】
      </div>
    </div>
  );
}
