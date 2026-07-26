import React, { memo } from 'react';

interface PrintCautionsProps {
  items: readonly string[];
}

/**
 * 印刷物にだけ載せる注意事項。
 * 画面側の CautionBox は入力エリア（no-print）にあるため、
 * お客様の手元に残る資料に前提と免責を明示する目的で別途出力する。
 */
export const PrintCautions: React.FC<PrintCautionsProps> = memo(({ items }) => (
  <div className="print-only-block print-cautions">
    <p>
      <span className="print-cautions-label">【ご注意】</span>
      {items.map(item => `※ ${item}`).join('　')}
    </p>
  </div>
));

PrintCautions.displayName = 'PrintCautions';
