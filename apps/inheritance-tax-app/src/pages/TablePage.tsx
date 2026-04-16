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

function buildConditionLabel(composition: HeirComposition): string {
  const { rank, rankHeirsCount } = getHeirInfo(composition);
  const parts = [`配偶者：${composition.hasSpouse ? 'あり' : 'なし'}`];
  if (rank > 0 && rankHeirsCount > 0) {
    parts.push(`${RANK_LABELS[rank]}：${rankHeirsCount}人`);
  }
  return parts.join(' ／ ');
}

interface TableResults {
  tableData: TaxCalculationResult[];
  bracketData: BracketAnalysisRow[];
  secondaryTableData: TaxCalculationResult[];
}

const EMPTY_RESULTS: TableResults = { tableData: [], bracketData: [], secondaryTableData: [] };

export const TablePage: React.FC = () => {
  const [composition, setComposition] = useState<HeirComposition>(createDefaultComposition);
  const [maxValue, setMaxValue] = useState<number>(TABLE_CONFIG.DEFAULT_MAX_VALUE);
  const [results, setResults] = useState<TableResults>(EMPTY_RESULTS);

  const handleCalculate = useCallback(() => {
    const tableData: TaxCalculationResult[] = [];
    const bracketData: BracketAnalysisRow[] = [];
    const secondaryTableData: TaxCalculationResult[] = [];
    const noSpouseComposition: HeirComposition = { ...composition, hasSpouse: false };
    for (let value = TABLE_CONFIG.MIN_VALUE; value <= maxValue; value += TABLE_CONFIG.STEP) {
      tableData.push(calculateInheritanceTax(value, composition));
      bracketData.push(calculateBracketAnalysis(value, composition));
      if (composition.hasSpouse) {
        secondaryTableData.push(calculateInheritanceTax(value, noSpouseComposition));
      }
    }
    setResults({ tableData, bracketData, secondaryTableData });
  }, [maxValue, composition]);

  const { rank } = getHeirInfo(composition);
  const heirLabel = RANK_LABELS[rank] || '子';
  const hasData = results.tableData.length > 0;
  const conditionLabel = buildConditionLabel(composition);
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
              <TaxTable data={results.tableData} hasSpouse={composition.hasSpouse} secondaryData={results.secondaryTableData} conditionLabel={conditionLabel} />
              <div className="mt-6 print-page-break">
                <PrintHeader title="加重平均適用税率表" />
                <BracketRateTable data={results.bracketData} hasSpouse={composition.hasSpouse} heirLabel={heirLabel} conditionLabel={conditionLabel} />
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
