import { useState, useMemo } from 'react';
import { HeirSettings } from '../components/HeirSettings';
import { RangeSettings } from '../components/RangeSettings';
import { TaxTable } from '../components/TaxTable';
import { ExcelExport } from '../components/ExcelExport';
import { PrintButton } from '../components/PrintButton';
import type { HeirComposition, TaxCalculationResult } from '../types';
import { TABLE_CONFIG, COMPANY_INFO } from '../constants';
import { generateId, calculateInheritanceTax } from '../utils';

export const TablePage: React.FC = () => {
  const [composition, setComposition] = useState<HeirComposition>({
    hasSpouse: true,
    selectedRank: 'rank1',
    rank1Children: [
      {
        id: generateId(),
        type: 'child',
        isDeceased: false,
        representatives: [],
      },
    ],
    rank2Ascendants: [],
    rank3Siblings: [],
  });

  const [maxValue, setMaxValue] = useState<number>(TABLE_CONFIG.DEFAULT_MAX_VALUE);

  const tableData = useMemo<TaxCalculationResult[]>(() => {
    const data: TaxCalculationResult[] = [];
    for (let value = TABLE_CONFIG.MIN_VALUE; value <= maxValue; value += TABLE_CONFIG.STEP) {
      const result = calculateInheritanceTax(value, composition);
      data.push(result);
    }
    return data;
  }, [maxValue, composition]);

  return (
    <>
      {/* 印刷専用ヘッダー */}
      <div className="print-only justify-between items-start px-4 py-3 border-b-2 border-green-700">
        <div>
          <h1 className="text-2xl font-bold text-green-800">相続税早見表</h1>
        </div>
        <address className="text-right text-sm not-italic text-gray-700">
          <p className="font-bold text-base">{COMPANY_INFO.name}</p>
          <p>{COMPANY_INFO.postalCode} {COMPANY_INFO.address}</p>
          <p>TEL: {COMPANY_INFO.phone}</p>
        </address>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-1 space-y-6">
            <HeirSettings composition={composition} onChange={setComposition} />
            <RangeSettings
              maxValue={maxValue}
              onMaxValueChange={setMaxValue}
            />
            <ExcelExport
              data={tableData}
              composition={composition}
            />
            <PrintButton />
          </div>
          <div className="lg:col-span-2">
            <TaxTable data={tableData} hasSpouse={composition.hasSpouse} />
          </div>
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-8 no-print">
          <h3 className="font-bold text-yellow-800 mb-2">ご注意</h3>
          <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
            <li>この早見表は概算です。実際の税額は個別の事情により異なります。</li>
            <li>配偶者控除は配偶者の法定相続分（最大1.6億円）まで非課税となります。</li>
            <li>第3順位（兄弟姉妹）の相続人には2割加算が適用されます。</li>
            <li>詳細は税理士にご相談ください。</li>
          </ul>
        </div>
      </main>
    </>
  );
};
