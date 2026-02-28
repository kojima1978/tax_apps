import React from 'react';
import { formatCurrency } from '../utils';
import { TH, TD } from './tableStyles';

export type HeirColumn = {
  label: string;
  getValue: (i: number) => React.ReactNode;
  getTotalValue: () => React.ReactNode;
  align?: 'left' | 'right';
  bold?: boolean;
};

interface HeirScenarioTableProps {
  label: string;
  taxTotal: number;
  headerBg: string;
  heirCount: number;
  getHeirKey: (i: number) => string;
  columns: HeirColumn[];
}

export const HeirScenarioTable: React.FC<HeirScenarioTableProps> = ({
  label,
  taxTotal,
  headerBg,
  heirCount,
  getHeirKey,
  columns,
}) => (
  <div>
    <h4 className="text-base font-bold text-gray-700 mb-2 flex items-center gap-2">
      <span className="inline-block w-3 h-3 rounded-full bg-green-600" />
      {label}
      <span className="text-sm font-normal text-gray-500">
        （税額合計: {formatCurrency(taxTotal)}）
      </span>
    </h4>
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className={`${headerBg} text-white`}>
            {columns.map(col => (
              <th key={col.label} className={TH}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: heirCount }, (_, i) => (
            <tr key={getHeirKey(i)} className="hover:bg-green-50">
              {columns.map(col => (
                <td
                  key={col.label}
                  className={`${TD}${col.align === 'left' ? ' text-left font-medium' : ''}${col.bold ? ' font-bold' : ''}`}
                >
                  {col.getValue(i)}
                </td>
              ))}
            </tr>
          ))}
          <tr className="bg-gray-50 font-semibold">
            {columns.map(col => (
              <td
                key={col.label}
                className={`${TD}${col.align === 'left' ? ' text-left' : ''}${col.bold ? ' font-bold' : ''}`}
              >
                {col.getTotalValue()}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  </div>
);
