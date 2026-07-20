import { useState, useCallback, useEffect, useRef } from 'react';
import { PageLayout } from '../components/PageLayout';
import { HeirSettings } from '../components/HeirSettings';
import { EstateInput } from '../components/EstateInput';
import { SpouseAcquisitionSettings } from '../components/calculator/SpouseAcquisitionSettings';
import { CalculationResult } from '../components/calculator/CalculationResult';
import { CautionBox } from '../components/CautionBox';
import { StatusCard } from '../components/StatusCard';
import { useScrollToResult } from '../hooks/useScrollToResult';
import { useFormValidation } from '../hooks/useFormValidation';
import type { Heir, HeirComposition, SpouseAcquisitionMode } from '../types';
import { createDefaultComposition } from '../constants';
import { CALCULATOR_CAUTIONS } from '../constants/cautionMessages';
import { calculateDetailedInheritanceTax, calculateBracketAnalysis } from '../utils';

type PbFamilyComposition = {
  hasSpouse: boolean;
  selectedRank: HeirComposition['selectedRank'];
  heirCount: number;
};

type PbInheritancePayload = {
  estimatedNetEstate: number;
  asOfDate: string;
  warning: string;
  familyComposition: PbFamilyComposition;
};

const createPbComposition = ({
  hasSpouse,
  selectedRank,
  heirCount,
}: PbFamilyComposition): HeirComposition => {
  const heirType: Heir['type'] =
    selectedRank === 'rank2' ? 'parent' : selectedRank === 'rank3' ? 'sibling' : 'child';
  const heirs: Heir[] = Array.from({ length: selectedRank === 'none' ? 0 : heirCount }, (_, index) => ({
    id: `pb-${selectedRank}-${index + 1}`,
    type: heirType,
  }));

  return {
    hasSpouse,
    selectedRank,
    rank1Children: selectedRank === 'rank1' ? heirs : [],
    rank2Ascendants: selectedRank === 'rank2' ? heirs : [],
    rank3Siblings: selectedRank === 'rank3' ? heirs : [],
  };
};

const syncTaxToPb = async (totalFinalTax: number, householdId: number) => {
  const response = await fetch('/private-banking/api/inheritance-estimate', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estimatedInheritanceTax: totalFinalTax * 10000, householdId }),
  });
  if (!response.ok) throw new Error('PB API error');
};

export const CalculatorPage: React.FC = () => {
  const [composition, setComposition] = useState<HeirComposition>(createDefaultComposition);
  const [estateValue, setEstateValue] = useState<number>(0);
  const [spouseMode, setSpouseMode] = useState<SpouseAcquisitionMode>({ mode: 'legal' });
  const [result, setResult] = useState<ReturnType<typeof calculateDetailedInheritanceTax> | null>(null);
  const [weightedRate, setWeightedRate] = useState(0);
  const [pbImportMessage, setPbImportMessage] = useState('');
  const [pbSyncMessage, setPbSyncMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('source') !== 'pb') return;
    const householdId = Number(params.get('householdId'));
    if (!Number.isInteger(householdId) || householdId <= 0) return;

    const controller = new AbortController();
    fetch(`/private-banking/api/inheritance-export?householdId=${householdId}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('PB API error');
        return response.json() as Promise<PbInheritancePayload>;
      })
      .then((payload) => {
        const importedEstateValue = Math.round(payload.estimatedNetEstate / 10000);
        const importedComposition = createPbComposition(payload.familyComposition);
        const legalShareMode: SpouseAcquisitionMode = { mode: 'legal' };

        setEstateValue(importedEstateValue);
        setComposition(importedComposition);
        setSpouseMode(legalShareMode);
        setPbImportMessage(
          `PB管理B/S（${payload.asOfDate}時点）の純資産と家族情報を取り込みました。${payload.warning}`,
        );

        if (params.get('autocalc') === '1') {
          const calculated = calculateDetailedInheritanceTax(
            importedEstateValue,
            importedComposition,
            legalShareMode,
          );
          setResult(calculated);
          setWeightedRate(calculateBracketAnalysis(importedEstateValue, importedComposition).weightedRate);
          setPbSyncMessage('想定相続税をPB管理B/Sへ連携しています。');
          void syncTaxToPb(calculated.totalFinalTax, householdId)
            .then(() => setPbSyncMessage('想定相続税をPB管理B/Sへ連携しました。'))
            .catch(() => setPbSyncMessage('想定相続税をPB管理B/Sへ連携できませんでした。'));
        }
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setPbImportMessage('PB管理B/Sから家族情報を取得できませんでした。');
      });

    return () => controller.abort();
  }, []);

  const heirRef = useRef<HTMLDivElement>(null);
  const estateRef = useRef<HTMLDivElement>(null);
  const resultRef = useScrollToResult(!!result);

  const noHeirs = !composition.hasSpouse && composition.selectedRank === 'none';

  const onValid = useCallback(() => {
    const calculated = calculateDetailedInheritanceTax(estateValue, composition, spouseMode);
    setResult(calculated);
    setWeightedRate(calculateBracketAnalysis(estateValue, composition).weightedRate);
    if (new URLSearchParams(window.location.search).get('source') === 'pb') {
      const householdId = Number(new URLSearchParams(window.location.search).get('householdId'));
      if (!Number.isInteger(householdId) || householdId <= 0) return;
      setPbSyncMessage('PB管理B/Sへ想定相続税を連携しています。');
      void syncTaxToPb(calculated.totalFinalTax, householdId)
        .then(() => setPbSyncMessage('想定相続税をPB管理B/Sへ連携しました。'))
        .catch(() => setPbSyncMessage('想定相続税をPB管理B/Sへ連携できませんでした。'));
    }
  }, [estateValue, composition, spouseMode]);

  const { validationErrors, hasAttempted, handleCalculate } = useFormValidation([
    { condition: estateValue <= 0, ref: estateRef, message: '遺産総額を入力してください' },
    { condition: noHeirs, ref: heirRef, message: '相続人を設定してください（配偶者または相続人の順位を選択）' },
  ], onValid);

  return (
    <>
      {pbImportMessage && (
        <div className="no-print mx-auto mt-4 max-w-7xl px-3 md:px-4" role="status">
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
            {pbImportMessage}
          </div>
        </div>
      )}
      {pbSyncMessage && (
        <div className="no-print mx-auto mt-3 max-w-7xl px-3 md:px-4" role="status">
          <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
            {pbSyncMessage}
          </div>
        </div>
      )}
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
    </>
  );
};
