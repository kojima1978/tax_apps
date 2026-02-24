import { useState, useCallback } from 'react';
import { Header } from '../components/Header';
import { HeirSettings } from '../components/HeirSettings';
import { EstateInput } from '../components/EstateInput';
import { SpouseAcquisitionSettings } from '../components/calculator/SpouseAcquisitionSettings';
import { CalculationResult } from '../components/calculator/CalculationResult';
import { CalculatorExcelExport } from '../components/calculator/CalculatorExcelExport';
import { CalculateButton } from '../components/CalculateButton';
import { CautionBox } from '../components/CautionBox';
import { StatusCard } from '../components/StatusCard';
import type { HeirComposition, SpouseAcquisitionMode } from '../types';
import { createDefaultComposition } from '../constants';
import { CALCULATOR_CAUTIONS } from '../constants/cautionMessages';
import { calculateDetailedInheritanceTax, calculateBracketAnalysis } from '../utils';

export const CalculatorPage: React.FC = () => {
  const [composition, setComposition] = useState<HeirComposition>(createDefaultComposition);

  const [estateValue, setEstateValue] = useState<number>(0);
  const [spouseMode, setSpouseMode] = useState<SpouseAcquisitionMode>({ mode: 'legal' });

  const [result, setResult] = useState<ReturnType<typeof calculateDetailedInheritanceTax> | null>(null);
  const [weightedRate, setWeightedRate] = useState(0);

  const handleCalculate = useCallback(() => {
    if (estateValue <= 0) {
      setResult(null);
      setWeightedRate(0);
      return;
    }
    setResult(calculateDetailedInheritanceTax(estateValue, composition, spouseMode));
    setWeightedRate(calculateBracketAnalysis(estateValue, composition).weightedRate);
  }, [estateValue, composition, spouseMode]);

  const excelAction = result && result.taxableAmount > 0
    ? <CalculatorExcelExport result={result} composition={composition} spouseMode={spouseMode} />
    : undefined;

  return (
    <>
      <Header actions={excelAction} />
      <main className="max-w-7xl mx-auto px-4 py-8 calculator-print">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 no-print">
          <div className="space-y-6">
            <HeirSettings composition={composition} onChange={setComposition} />
          </div>
          <div className="space-y-6">
            <EstateInput value={estateValue} onChange={setEstateValue} />
            <SpouseAcquisitionSettings
              value={spouseMode}
              onChange={setSpouseMode}
              hasSpouse={composition.hasSpouse}
            />
            <CautionBox items={CALCULATOR_CAUTIONS} />
          </div>
        </div>

        <div className="mb-8 no-print">
          <CalculateButton onClick={handleCalculate} />
        </div>

        {result && result.taxableAmount > 0 && (
          <CalculationResult result={result} weightedRate={weightedRate} />
        )}

        {result && result.taxableAmount === 0 && estateValue > 0 && (
          <StatusCard
            variant="success"
            title="相続税はかかりません"
            description={`遺産総額（${result.estateValue.toLocaleString()}万円）が基礎控除額（${result.basicDeduction.toLocaleString()}万円）以下のため、課税されません。`}
          />
        )}
      </main>
    </>
  );
};
