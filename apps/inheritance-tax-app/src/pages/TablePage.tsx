import { useState, useMemo } from 'react';
import { Header } from '../components/Header';
import { HeirSettings } from '../components/HeirSettings';
import { RangeSettings } from '../components/RangeSettings';
import { TaxTable } from '../components/TaxTable';
import { ExcelExport } from '../components/ExcelExport';
import { PrintHeader } from '../components/PrintHeader';
import { CautionBox } from '../components/CautionBox';
import type { HeirComposition, TaxCalculationResult } from '../types';
import { TABLE_CONFIG, createDefaultComposition } from '../constants';
import { calculateInheritanceTax } from '../utils';

export const TablePage: React.FC = () => {
  const [composition, setComposition] = useState<HeirComposition>(createDefaultComposition);

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
      <Header
        actions={
          <ExcelExport data={tableData} composition={composition} />
        }
      />
      <PrintHeader title="相続税早見表" />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 no-print">
          <div className="space-y-6">
            <HeirSettings composition={composition} onChange={setComposition} />
          </div>
          <div className="space-y-6">
            <RangeSettings
              maxValue={maxValue}
              onMaxValueChange={setMaxValue}
            />
            <CautionBox
              items={[
                'この早見表は概算です。実際の税額は個別の事情により異なります。',
                '配偶者控除は配偶者の法定相続分（最大1.6億円）まで非課税となります。',
                '第3順位（兄弟姉妹）の相続人には2割加算が適用されます。',
                '詳細は税理士にご相談ください。',
              ]}
            />
          </div>
        </div>

        <TaxTable data={tableData} hasSpouse={composition.hasSpouse} />
      </main>
    </>
  );
};
