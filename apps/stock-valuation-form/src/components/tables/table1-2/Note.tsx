import { bb } from '../shared';

export function Note() {
  return (
    <div style={{ padding: '2px 4px', fontSize: 7, lineHeight: 1.3, ...bb }}>
      ・「会社規模とＬの割合（中会社）の区分」欄は、㋠欄の区分（「総資産価額（帳簿価額）」と「従業員数」とのいずれか
      下位の区分）と㋷欄（取引金額）の区分とのいずれか上位の区分により判定します。
    </div>
  );
}
