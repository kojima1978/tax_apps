import { useState, useCallback, useMemo, useRef } from 'react';
import { PageLayout } from '../components/PageLayout';
import { HeirSettings } from '../components/HeirSettings';
import { EstateInput } from '../components/EstateInput';
import { SpouseAcquisitionSettings } from '../components/calculator/SpouseAcquisitionSettings';
import { CalculationResult } from '../components/calculator/CalculationResult';
import { CautionBox } from '../components/CautionBox';
import { StatusCard } from '../components/StatusCard';
import { useScrollToResult } from '../hooks/useScrollToResult';
import { useFormValidation } from '../hooks/useFormValidation';
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

  const heirRef = useRef<HTMLDivElement>(null);
  const estateRef = useRef<HTMLDivElement>(null);
  const resultRef = useScrollToResult(!!result);

  const noHeirs = !composition.hasSpouse && composition.selectedRank === 'none';

  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (estateValue <= 0) errors.push('遺産総額を入力してください');
    if (noHeirs) errors.push('相続人を設定してください（配偶者または相続人の順位を選択）');
    return errors;
  }, [estateValue, noHeirs]);

  const checks = useCallback(() => [
    { condition: estateValue <= 0, ref: estateRef },
    { condition: noHeirs, ref: heirRef },
  ], [estateValue, noHeirs]);

  const onValid = useCallback(() => {
    setResult(calculateDetailedInheritanceTax(estateValue, composition, spouseMode));
    setWeightedRate(calculateBracketAnalysis(estateValue, composition).weightedRate);
  }, [estateValue, composition, spouseMode]);

  const { hasAttempted, handleCalculate } = useFormValidation(checks, onValid);

  return (
    <PageLayout
      printClassName="calculator-print"
      leftSection={
        <div ref={heirRef}>
          <HeirSettings
            composition={composition}
            onChange={setComposition}
            hasError={hasAttempted && noHeirs}
          />
        </div>
      }
      rightSection={
        <>
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
        </>
      }
      validationErrors={validationErrors}
      hasAttempted={hasAttempted}
      onCalculate={handleCalculate}
      resultRef={resultRef}
      resultSection={
        <>
          {result && result.taxableAmount > 0 && (
            <div className="result-fade-in">
              <CalculationResult result={result} weightedRate={weightedRate} />
            </div>
          )}
          {result && result.taxableAmount === 0 && estateValue > 0 && (
            <div className="result-fade-in">
              <StatusCard
                variant="success"
                title="相続税はかかりません"
                description={`遺産総額（${result.estateValue.toLocaleString()}万円）が基礎控除額（${result.basicDeduction.toLocaleString()}万円）以下のため、課税されません。`}
              />
            </div>
          )}
        </>
      }
    />
  );
};
