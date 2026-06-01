import { br } from '../shared';

export function Section7() {
  return (
    <div style={{ display: 'flex', fontSize: 7, flex: 1 }}>
      {/* 左ラベル */}
      <div style={{ width: 85, ...br, padding: '2px 3px', fontWeight: 700, display: 'flex', alignItems: 'center' }}>
        ７．特定の評価会社の判定結果
      </div>

      {/* 右: 番号リスト + 注記 */}
      <div style={{ flex: 1, padding: '4px 8px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 16px', marginBottom: 6, lineHeight: 1.5 }}>
          <div>１．比準要素数１の会社</div>
          <div>２．株式等保有特定会社</div>
          <div>３．土地保有特定会社</div>
          <div>４．開業後３年未満の会社等</div>
          <div>５．開業前又は休業中の会社</div>
          <div>６．清算中の会社</div>
        </div>
        <div style={{ border: '0.5px solid #000', padding: '3px 6px', fontSize: 6.5, lineHeight: 1.4 }}>
          該当する番号を○で囲んでください。なお、上記の「１．比準要素数１の会社」欄から「６．清算中の会社」欄の判定において２以上に該当する場合には、後の番号の判定によります。
        </div>
      </div>
    </div>
  );
}
