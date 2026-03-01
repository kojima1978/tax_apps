import { TableTitleBar } from './TableTitleBar';
import { parseNum } from './shared';
import type { TableProps } from '@/types/form';
import { Table4Section1 } from './Table4Section1';
import { Table4Section2 } from './Table4Section2';
import { Table4Section3 } from './Table4Section3';

const T = 'table4' as const;

// リセット対象フィールド
const RESET_FIELDS = [
  'capital', 'issued_shares', 'capital_per_share', 'shares_50yen',
  'div_y1', 'div_extra_y1', 'div_reg_y1', 'div_y2', 'div_extra_y2', 'div_reg_y2', 'div_y3', 'div_extra_y3', 'div_reg_y3', 'avg_div',
  'income_y1', 'extra_profit_y1', 'div_exclusion_y1', 'tax_y1', 'loss_deduct_y1', 'net_profit_y1', 'income_y2', 'extra_profit_y2', 'div_exclusion_y2', 'tax_y2', 'loss_deduct_y2', 'net_profit_y2', 'income_y3', 'extra_profit_y3', 'div_exclusion_y3', 'tax_y3', 'loss_deduct_y3', 'net_profit_y3',
  'cap_y1', 'retained_y1', 'net_asset_y1', 'cap_y2', 'retained_y2', 'net_asset_y2',
];

export function Table4({ getField, updateField }: TableProps) {
  const g = (f: string) => getField(T, f);
  const u = (f: string, v: string) => updateField(T, f, v);
  const treasuryShares = parseNum(getField('table1_1', 'treasury_shares'));

  const resetAll = () => {
    RESET_FIELDS.forEach((f) => u(f, ''));
  };

  return (
    <div className="gov-form" style={{ fontSize: 7 }}>
      <TableTitleBar
        title="第４表　類似業種比準価額等の計算明細書"
        fontSize={10}
        companyNameReadonly={getField('table1_1', 'companyName')}
        extra={
          <button
            className="no-print"
            onClick={resetAll}
            style={{ padding: '2px 8px', fontSize: 7, background: '#f5f5f5', border: '1px solid #ccc', borderRadius: 2, cursor: 'pointer', whiteSpace: 'nowrap', marginRight: 4 }}
            title="全フィールドをリセット"
          >
            リセット
          </button>
        }
      />

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <Table4Section1 g={g} u={u} treasuryShares={treasuryShares} />
        <Table4Section2 g={g} u={u} />
        <Table4Section3 g={g} u={u} />
      </div>
    </div>
  );
}
