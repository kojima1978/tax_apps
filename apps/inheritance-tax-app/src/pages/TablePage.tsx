import { useState, useCallback } from 'react';
import { PageLayout } from '../components/PageLayout';
import { HeirSettings } from '../components/HeirSettings';
import { RangeSettings } from '../components/RangeSettings';
import { TaxTable } from '../components/TaxTable';
import { BracketRateTable } from '../components/BracketRateTable';
import { TaxBracketTable } from '../components/TaxBracketTable';
import { PrintHeader } from '../components/PrintHeader';
import { CautionBox } from '../components/CautionBox';
import { useScrollToResult } from '../hooks/useScrollToResult';
import type { HeirComposition, TaxCalculationResult } from '../types';
import type { BracketAnalysisRow } from '../utils';
import { TABLE_CONFIG, createDefaultComposition, RANK_LABELS } from '../constants';
import { TABLE_CAUTIONS } from '../constants/cautionMessages';
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
  const hasData = tableData.length > 0;
  const resultRef = useScrollToResult(hasData);

  return (
    <PageLayout
      leftSection={
        <HeirSettings composition={composition} onChange={setComposition} />
      }
      rightSection={
        <>
          <RangeSettings maxValue={maxValue} onMaxValueChange={setMaxValue} />
          <CautionBox items={TABLE_CAUTIONS} />
        </>
      }
      onCalculate={handleCalculate}
      resultRef={resultRef}
      resultSection={
        <>
          {hasData && (
            <div className="result-fade-in">
              <PrintHeader title="相続税早見表" />
              <TaxTable data={tableData} hasSpouse={composition.hasSpouse} />
              <div className="mt-6 print-page-break">
                <PrintHeader title="加重平均適用税率表" />
                <BracketRateTable data={bracketData} hasSpouse={composition.hasSpouse} heirLabel={heirLabel} />
              </div>
            </div>
          )}
          <div className="mt-6 print-page-break">
            <PrintHeader title="相続税の速算表" />
            <TaxBracketTable />
          </div>
        </>
      }
    />
  );
};
