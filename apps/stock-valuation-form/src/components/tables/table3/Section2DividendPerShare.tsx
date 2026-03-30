import { NumberField } from '@/components/ui/NumberField';
import { bb, br, hdr } from '../shared';
import type { GFn, UFn } from '../shared';

interface Props {
  g: GFn;
  u: UFn;
}

export function Section2DividendPerShare({ g, u }: Props) {
  return (
    <div style={{ display: 'flex', ...bb, fontSize: 7.5, flex: 1 }}>
      <div style={{ width: 90, ...br, ...hdr, padding: '3px 6px', display: 'flex', alignItems: 'center', fontSize: 7, lineHeight: 1.3 }}>
        １株（50円）当たりの<br />年配当金額
      </div>
      <div style={{ flex: 1, padding: '3px 6px', display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
        <span>年平均配当金額（⑰の金額）÷⑫の株式数＝</span>
        <span style={{ marginRight: 4, fontWeight: 500, fontSize: 8 }}>⑱</span>
        <NumberField value={g('div_per_share_yen')} onChange={(v) => u('div_per_share_yen', v)} className="w-10" />
        <span className="mx-0.5">円</span>
        <NumberField value={g('div_per_share_sen')} onChange={(v) => u('div_per_share_sen', v)} className="w-10" />
        <span className="ml-0.5">銭</span>
        <span style={{ marginLeft: 6, fontSize: 6, lineHeight: 1.3 }}>
          【この金額が２円50銭未満の場合は２円50銭とします。】
        </span>
      </div>
    </div>
  );
}
