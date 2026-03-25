import { useState, useCallback, useMemo, useRef } from 'react';
import { PageLayout } from '../components/PageLayout';
import { HeirSettings } from '../components/HeirSettings';
import { EstateInput } from '../components/EstateInput';
import { AcquisitionInputs } from '../components/split/AcquisitionInputs';
import { SimulationSettings } from '../components/split/SimulationSettings';
import { SplitResultTable } from '../components/split/SplitResultTable';
import { CautionBox } from '../components/CautionBox';
import { StatusCard } from '../components/StatusCard';
import { useScrollToResult } from '../hooks/useScrollToResult';
import { useFormValidation } from '../hooks/useFormValidation';
import type { HeirComposition, HeirAcquisition, SplitSimulationResult } from '../types';
import { createDefaultComposition } from '../constants';
import { SPLIT_CAUTIONS } from '../constants/cautionMessages';
import { buildHeirLabels, calculateLegalAcquisitions, generateSplitSimulation } from '../utils';

function createAcquisitions(
  labels: { label: string; type: import('../types').HeirType }[],
  prev: HeirAcquisition[] = [],
): HeirAcquisition[] {
  return labels.map((h, i) => {
    const existing = prev.find(p => p.label === h.label);
    return {
      label: h.label,
      type: h.type,
      amount: existing?.amount ?? 0,
      step: existing?.step ?? 0,
      isAutoAdjust: existing?.isAutoAdjust ?? (i === labels.length - 1),
    };
  });
}

export const SplitPage: React.FC = () => {
  const [composition, setComposition] = useState<HeirComposition>(createDefaultComposition);
  const [estateValue, setEstateValue] = useState(0);
  const [acquisitions, setAcquisitions] = useState<HeirAcquisition[]>(
    () => createAcquisitions(buildHeirLabels(createDefaultComposition())),
  );
  const [rowCount, setRowCount] = useState(5);
  const [result, setResult] = useState<SplitSimulationResult | null>(null);

  const heirRef = useRef<HTMLDivElement>(null);
  const estateRef = useRef<HTMLDivElement>(null);
  const resultRef = useScrollToResult(!!result);

  const noHeirs = !composition.hasSpouse && composition.selectedRank === 'none';

  const handleCompositionChange = useCallback((newComp: HeirComposition) => {
    setComposition(newComp);
    setResult(null);
    setAcquisitions(prev => createAcquisitions(buildHeirLabels(newComp), prev));
  }, []);

  const handleEstateChange = useCallback((value: number) => {
    setEstateValue(value);
    setResult(null);
  }, []);

  const handleFillLegal = useCallback(() => {
    if (estateValue <= 0 || acquisitions.length === 0) return;
    const legalAmounts = calculateLegalAcquisitions(estateValue, composition);
    setAcquisitions(prev =>
      prev.map((h, i) => ({ ...h, amount: legalAmounts[i] ?? 0 }))
    );
    setResult(null);
  }, [estateValue, composition, acquisitions.length]);

  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (estateValue <= 0) errors.push('遺産総額を入力してください');
    if (noHeirs) errors.push('相続人を設定してください');
    if (acquisitions.length > 0 && !acquisitions.some(h => h.isAutoAdjust)) {
      errors.push('自動調整対象の相続人を1人選択してください');
    }
    const total = acquisitions.reduce((s, h) => s + h.amount, 0);
    if (estateValue > 0 && total > 0 && total !== estateValue) {
      errors.push(`取得額の合計（${total.toLocaleString()}万円）が遺産総額（${estateValue.toLocaleString()}万円）と一致しません`);
    }
    return errors;
  }, [estateValue, noHeirs, acquisitions]);

  const checks = useCallback(() => [
    { condition: estateValue <= 0, ref: estateRef },
    { condition: noHeirs, ref: heirRef },
  ], [estateValue, noHeirs]);

  const onValid = useCallback(() => {
    if (validationErrors.length > 0) return;
    setResult(generateSplitSimulation(estateValue, composition, acquisitions, rowCount));
  }, [estateValue, composition, acquisitions, rowCount, validationErrors]);

  const { hasAttempted, handleCalculate } = useFormValidation(checks, onValid);

  return (
    <PageLayout
      printClassName="split-print"
      leftSection={
        <div ref={heirRef} className="space-y-6">
          <HeirSettings
            composition={composition}
            onChange={handleCompositionChange}
            hasError={hasAttempted && noHeirs}
          />
          {acquisitions.length > 0 && (
            <SimulationSettings
              acquisitions={acquisitions}
              onChange={setAcquisitions}
              rowCount={rowCount}
              onRowCountChange={setRowCount}
            />
          )}
        </div>
      }
      rightSection={
        <>
          <div ref={estateRef}>
            <EstateInput
              value={estateValue}
              onChange={handleEstateChange}
              hasError={hasAttempted && estateValue <= 0}
            />
          </div>
          {acquisitions.length > 0 && (
            <AcquisitionInputs
              estateValue={estateValue}
              acquisitions={acquisitions}
              onChange={setAcquisitions}
              onFillLegal={handleFillLegal}
              hasError={hasAttempted && acquisitions.reduce((s, h) => s + h.amount, 0) !== estateValue}
            />
          )}
          <CautionBox items={SPLIT_CAUTIONS} />
        </>
      }
      validationErrors={validationErrors}
      hasAttempted={hasAttempted}
      onCalculate={handleCalculate}
      resultRef={resultRef}
      resultSection={
        <>
          {result && result.rows.length > 0 && (
            <div className="result-fade-in">
              <SplitResultTable result={result} />
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
