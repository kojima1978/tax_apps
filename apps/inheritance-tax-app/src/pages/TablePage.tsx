import { useState, useCallback } from 'react';
import { Header } from '../components/Header';
import { HeirSettings } from '../components/HeirSettings';
import { RangeSettings } from '../components/RangeSettings';
import { TaxTable } from '../components/TaxTable';
import { BracketRateTable } from '../components/BracketRateTable';
import { TaxBracketTable } from '../components/TaxBracketTable';
import { ExcelExport } from '../components/ExcelExport';
import { CalculateButton } from '../components/CalculateButton';
import { PrintHeader } from '../components/PrintHeader';
import { CautionBox } from '../components/CautionBox';
import type { HeirComposition, TaxCalculationResult } from '../types';
import type { BracketAnalysisRow } from '../utils';
import { TABLE_CONFIG, createDefaultComposition, RANK_LABELS } from '../constants';
import { calculateInheritanceTax, calculateBracketAnalysis, getHeirInfo } from '../utils';

export const TablePage: React.FC = () => {
  const [composition, setComposition] = useState<HeirComposition>(createDefaultComposition);

  const [maxValue, setMaxValue] = useState<number>(TABLE_CONFIG.DEFAULT_MAX_VALUE);

  const [tableData, setTableData] = useState<TaxCalculationResult[]>([]);
  const [bracketData, setBracketData] = useState<BracketAnalysisRow[]>([]);

  const handleCalculate = useCallback(() => {
    const newTableData: TaxCalculationResult[] = [];
    const newBracketData: BracketAnalysisRow[] = [];
    for (let value = TABLE_CONFIG.MIN_VALUE; value <= maxValue; value += TABLE_CONFIG.STEP) {
      newTableData.push(calculateInheritanceTax(value, composition));
      newBracketData.push(calculateBracketAnalysis(value, composition));
    }
    setTableData(newTableData);
    setBracketData(newBracketData);
  }, [maxValue, composition]);

  const { rank } = getHeirInfo(composition);
  const heirLabel = RANK_LABELS[rank] || '子';

  return (
    <>
      <Header
        actions={
          tableData.length > 0
            ? <ExcelExport data={tableData} composition={composition} />
            : undefined
        }
      />

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

        <div className="mb-8 no-print">
          <CalculateButton onClick={handleCalculate} />
        </div>

        {tableData.length > 0 && (
          <>
            <PrintHeader title="相続税早見表" />
            <TaxTable data={tableData} hasSpouse={composition.hasSpouse} />

            <div className="mt-6 print-page-break">
              <PrintHeader title="加重平均適用税率表" />
              <BracketRateTable data={bracketData} hasSpouse={composition.hasSpouse} heirLabel={heirLabel} />
            </div>
          </>
        )}

        <div className="mt-6 print-page-break">
          <PrintHeader title="相続税の速算表" />
          <TaxBracketTable />
        </div>
      </main>
    </>
  );
};
