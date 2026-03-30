import type React from 'react';
import { bb } from '../shared';

type SizeLevel = 0 | 1 | 2 | 3 | 4;
type BgFn2 = (lv: SizeLevel, col: number) => React.CSSProperties;
type BgFn1 = (lv: SizeLevel) => React.CSSProperties;

interface Props {
  tBg: BgFn2;
  jBg: BgFn1;
}

export function SizeMatrixRight({ tBg, jBg }: Props) {
  return (
    <div style={{ ...bb, flex: 1 }}>
      <table className="gov-table" style={{ fontSize: 7, height: '100%' }}>
        <thead>
          <tr>
            <th colSpan={3} style={{ fontSize: 7.5, textAlign: 'left', padding: '2px 4px', fontWeight: 400 }}>
              ㋷　直前期末以前１年間の取引金額に応ずる区分
            </th>
            <th rowSpan={3} style={{ width: 55, fontSize: 6.5, lineHeight: 1.2 }}>
              会社規模とＬの<br />割合（中会社）<br />の区分
            </th>
          </tr>
          <tr>
            <th colSpan={3} style={{ fontSize: 7.5 }}>取　引　金　額</th>
          </tr>
          <tr>
            <th>卸 売 業</th>
            <th style={{ fontSize: 6.5 }}>小売・サービ<br />ス業</th>
            <th style={{ fontSize: 6.5 }}>卸売業、小売・<br />サービス業以外</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ height: 18 }}>
            <td style={tBg(4, 0)}>30億円以上</td>
            <td style={tBg(4, 1)}>20億円以上</td>
            <td style={tBg(4, 2)}>15億円以上</td>
            <td style={{ fontWeight: 700, letterSpacing: '0.3em', ...jBg(4) }}>大 会 社</td>
          </tr>
          <tr style={{ height: 22 }}>
            <td style={tBg(3, 0)}>７億円以上<br />30億円未満</td>
            <td style={tBg(3, 1)}>５億円以上<br />20億円未満</td>
            <td style={tBg(3, 2)}>４億円以上<br />15億円未満</td>
            <td style={jBg(3)}><div>０．９０</div></td>
          </tr>
          <tr style={{ height: 22 }}>
            <td style={{ fontSize: 6.5, ...tBg(2, 0) }}>3億5,000万円以上<br />７億円未満</td>
            <td style={{ fontSize: 6.5, ...tBg(2, 1) }}>2億5,000万円以上<br />５億円未満</td>
            <td style={tBg(2, 2)}>２億円以上<br />４億円未満</td>
            <td style={jBg(2)}><div>０．７５</div></td>
          </tr>
          <tr style={{ height: 22 }}>
            <td style={{ fontSize: 6.5, ...tBg(1, 0) }}>２億円以上<br />3億5,000万円未満</td>
            <td style={{ fontSize: 6.5, ...tBg(1, 1) }}>6,000万円以上<br />2億5,000万円未満</td>
            <td style={{ fontSize: 6.5, ...tBg(1, 2) }}>8,000万円以上<br />２億円未満</td>
            <td style={jBg(1)}><div>０．６０</div></td>
          </tr>
          <tr style={{ height: 18 }}>
            <td style={tBg(0, 0)}>２億円未満</td>
            <td style={{ fontSize: 6.5, ...tBg(0, 1) }}>6,000万円未満</td>
            <td style={{ fontSize: 6.5, ...tBg(0, 2) }}>8,000万円未満</td>
            <td style={{ fontWeight: 700, letterSpacing: '0.3em', ...jBg(0) }}>小 会 社</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
