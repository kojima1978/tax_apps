import type React from 'react';
import { bb } from '../shared';

type SizeLevel = 0 | 1 | 2 | 3 | 4;
type BgFn2 = (lv: SizeLevel, col: number) => React.CSSProperties;
type BgFn1 = (lv: SizeLevel) => React.CSSProperties;

interface Props {
  aBg: BgFn2;
  eBg: BgFn1;
}

export function SizeMatrixLeft({ aBg, eBg }: Props) {
  return (
    <div style={{ ...bb, flex: 1 }}>
      <table className="gov-table" style={{ fontSize: 7, height: '100%' }}>
        <thead>
          <tr>
            <th colSpan={4} style={{ fontSize: 7.5, textAlign: 'left', padding: '2px 4px', fontWeight: 400 }}>
              ㋠　直前期末の総資産価額（帳簿価額）及び直前期末以前１年間における従業員数に応ずる区分
            </th>
          </tr>
          <tr>
            <th colSpan={3} style={{ fontSize: 7.5 }}>総 資 産 価 額（帳 簿 価 額）</th>
            <th rowSpan={2} style={{ width: 45, fontSize: 7 }}>従業員数</th>
          </tr>
          <tr>
            <th>卸 売 業</th>
            <th style={{ fontSize: 6.5 }}>小売・サービ<br />ス業</th>
            <th style={{ fontSize: 6.5 }}>卸売業、小売・<br />サービス業以外</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ height: 18 }}>
            <td style={aBg(4, 0)}>20億円以上</td>
            <td style={aBg(4, 1)}>15億円以上</td>
            <td style={aBg(4, 2)}>15億円以上</td>
            <td style={eBg(4)}>35 人 超</td>
          </tr>
          <tr style={{ height: 22 }}>
            <td style={aBg(3, 0)}>４億円以上<br />20億円未満</td>
            <td style={aBg(3, 1)}>５億円以上<br />15億円未満</td>
            <td style={aBg(3, 2)}>５億円以上<br />15億円未満</td>
            <td style={eBg(3)}>35 人 超</td>
          </tr>
          <tr style={{ height: 22 }}>
            <td style={aBg(2, 0)}>２億円以上<br />４億円未満</td>
            <td style={{ fontSize: 6.5, ...aBg(2, 1) }}>2億5,000万円以上<br />５億円未満</td>
            <td style={{ fontSize: 6.5, ...aBg(2, 2) }}>2億5,000万円以上<br />５億円未満</td>
            <td style={{ fontSize: 6.5, ...eBg(2) }}>20 人 超<br />35 人 以下</td>
          </tr>
          <tr style={{ height: 22 }}>
            <td style={{ fontSize: 6.5, ...aBg(1, 0) }}>7,000万円以上<br />２億円未満</td>
            <td style={{ fontSize: 6.5, ...aBg(1, 1) }}>4,000万円以上<br />2億5,000万円未満</td>
            <td style={{ fontSize: 6.5, ...aBg(1, 2) }}>5,000万円以上<br />2億5,000万円未満</td>
            <td style={{ fontSize: 6.5, ...eBg(1) }}>５ 人 超<br />20 人 以下</td>
          </tr>
          <tr style={{ height: 18 }}>
            <td style={{ fontSize: 6.5, ...aBg(0, 0) }}>7,000万円未満</td>
            <td style={{ fontSize: 6.5, ...aBg(0, 1) }}>4,000万円未満</td>
            <td style={{ fontSize: 6.5, ...aBg(0, 2) }}>5,000万円未満</td>
            <td style={eBg(0)}>５ 人 以下</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
