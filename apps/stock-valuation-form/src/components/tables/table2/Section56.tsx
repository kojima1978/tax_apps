import { bb, br } from '../shared';

export function Section56() {
  return (
    <div style={{ display: 'flex', ...bb }}>
      {/* 5. 開業前又は休業中の会社 */}
      <div style={{ flex: 1, ...br, fontSize: 7 }}>
        <div style={{ padding: '2px 3px', fontWeight: 700, ...bb }}>
          ５．開業前又は休業中の会社
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', ...bb }}>
          <div style={{ ...br, padding: '1px 3px', textAlign: 'center', fontSize: 6.5 }}>
            開業前の会社の判定
          </div>
          <div style={{ padding: '1px 3px', textAlign: 'center', fontSize: 6.5 }}>
            休業中の会社の判定
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
          <div style={{ ...br, textAlign: 'center', padding: '2px 3px' }}>
            該　当　　非該当
          </div>
          <div style={{ textAlign: 'center', padding: '2px 3px' }}>
            該　当　　非該当
          </div>
        </div>
      </div>

      {/* 6. 清算中の会社 */}
      <div style={{ flex: 1, fontSize: 7 }}>
        <div style={{ padding: '2px 3px', fontWeight: 700, ...bb }}>
          ６．清 算 中 の 会 社
        </div>
        <div style={{ ...bb, textAlign: 'center', padding: '1px 0', fontWeight: 500, letterSpacing: '1em' }}>
          判　定
        </div>
        <div style={{ textAlign: 'center', padding: '2px 3px' }}>
          該　当　　非 該 当
        </div>
      </div>
    </div>
  );
}
