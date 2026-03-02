import { useState, useCallback, useMemo, useRef } from 'react';
import { Header } from '../components/Header';
import { HeirSettings } from '../components/HeirSettings';
import { EstateInput } from '../components/EstateInput';
import { SpouseAcquisitionSettings } from '../components/calculator/SpouseAcquisitionSettings';
import { CalculationResult } from '../components/calculator/CalculationResult';
import { CalculateButton } from '../components/CalculateButton';
import { ValidationErrorPanel } from '../components/ValidationErrorPanel';
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
  const [hasAttempted, setHasAttempted] = useState(false);

  const heirRef = useRef<HTMLDivElement>(null);
  const estateRef = useRef<HTMLDivElement>(null);

  const noHeirs = !composition.hasSpouse && composition.selectedRank === 'none';

  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (estateValue <= 0) errors.push('遺産総額を入力してください');
    if (noHeirs) errors.push('相続人を設定してください（配偶者または相続人の順位を選択）');
    return errors;
  }, [estateValue, noHeirs]);

  const handleCalculate = useCallback(() => {
    setHasAttempted(true);
    if (estateValue <= 0) {
      estateRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (noHeirs) {
      heirRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setResult(calculateDetailedInheritanceTax(estateValue, composition, spouseMode));
    setWeightedRate(calculateBracketAnalysis(estateValue, composition).weightedRate);
  }, [estateValue, noHeirs, composition, spouseMode]);

  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8 calculator-print">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 no-print">
          <div ref={heirRef} className="space-y-6">
            <HeirSettings
              composition={composition}
              onChange={setComposition}
              hasError={hasAttempted && noHeirs}
            />
          </div>
          <div className="space-y-6">
            <div ref={estateRef}>
              <EstateInput
                value={estateValue}
                onChange={setEstateValue}
                hasError={hasAttempted && estateValue <= 0}
              />
            </div>
            <SpouseAcquisitionSettings
              value={spouseMode}
              onChange={setSpouseMode}
              hasSpouse={composition.hasSpouse}
            />
            <CautionBox items={CALCULATOR_CAUTIONS} />
          </div>
        </div>

        <div className="mb-8 no-print">
          <ValidationErrorPanel show={hasAttempted} errors={validationErrors} />
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
