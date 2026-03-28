import { useRef } from 'react';
import { PageLayout } from '../components/PageLayout';
import { HeirSettings } from '../components/HeirSettings';
import { EstateInput } from '../components/EstateInput';
import { SpouseAcquisitionSettings } from '../components/calculator/SpouseAcquisitionSettings';
import { CashGiftRecipientList } from '../components/gift/CashGiftRecipientList';
import { CashGiftSummaryCard } from '../components/gift/CashGiftSummaryCard';
import { CashGiftFlowSteps } from '../components/gift/CashGiftFlowSteps';
import { CashGiftHeirTable } from '../components/gift/CashGiftHeirTable';
import { CashGiftYearComparison } from '../components/gift/CashGiftYearComparison';
import { PrintHeader } from '../components/PrintHeader';
import { CautionBox } from '../components/CautionBox';
import { StatusCard } from '../components/StatusCard';
import { useCashGiftSimulation } from '../hooks/useCashGiftSimulation';
import { useScrollToResult } from '../hooks/useScrollToResult';
import { useFormValidation } from '../hooks/useFormValidation';
import { formatCurrency } from '../utils';
import { CASH_GIFT_CAUTIONS } from '../constants/cautionMessages';

export const CashGiftPage: React.FC = () => {
  const {
    composition, setComposition,
    estateValue, setEstateValue,
    spouseMode, setSpouseMode,
    recipients, setRecipients,
    recipientOptions,
    cleanedRecipients,
    result,
    calcInputs,
    handleCalculate: executeCalculate,
    totalGiftsInput,
    noEligibleRecipients,
  } = useCashGiftSimulation();

  const estateRef = useRef<HTMLDivElement>(null);
  const recipientsRef = useRef<HTMLDivElement>(null);
  const resultRef = useScrollToResult(!!result);

  const recipientsInvalid = !noEligibleRecipients && (
    cleanedRecipients.length === 0 ||
    cleanedRecipients.every(r => r.annualAmount <= 0 || r.years <= 0)
  );

  const { validationErrors, hasAttempted, handleCalculate } = useFormValidation([
    { condition: estateValue <= 0, ref: estateRef, message: '遺産総額を入力してください' },
    { condition: recipientsInvalid, ref: recipientsRef, message: '受取人を追加し、贈与額・年数を入力してください' },
  ], executeCalculate);

  return (
    <PageLayout
      printClassName="cash-gift-print"
      leftSection={
        <HeirSettings composition={composition} onChange={setComposition} />
      }
      rightSection={
        <>
          <div ref={estateRef}>
            <EstateInput
              value={estateValue}
              onChange={setEstateValue}
              label="遺産総額（贈与前の相続財産額）"
              placeholder="例: 20000"
              hasError={hasAttempted && estateValue <= 0}
            />
          </div>
          <SpouseAcquisitionSettings
            value={spouseMode}
            onChange={setSpouseMode}
            hasSpouse={composition.hasSpouse}
          />
          <CautionBox items={CASH_GIFT_CAUTIONS} />
        </>
      }
      middleSection={
        !noEligibleRecipients ? (
          <div
            ref={recipientsRef}
            className={`mb-8 no-print ${hasAttempted && recipientsInvalid ? 'ring-2 ring-red-400 rounded-lg p-1' : ''}`}
          >
            <CashGiftRecipientList
              recipients={recipients}
              recipientOptions={recipientOptions}
              onChange={setRecipients}
            />
          </div>
        ) : undefined
      }
      validationErrors={validationErrors}
      hasAttempted={hasAttempted}
      onCalculate={handleCalculate}
      belowButton={
        <>
          {estateValue > 0 && totalGiftsInput > estateValue && (
            <StatusCard
              variant="error"
              title={`贈与総額（${formatCurrency(totalGiftsInput)}）が遺産総額（${formatCurrency(estateValue)}）を超えています`}
              description="贈与額を見直してください"
              compact
              className="mb-8 no-print"
            />
          )}
          {noEligibleRecipients && (
            <StatusCard
              variant="warning"
              title="特例贈与の対象者がいません"
              description="特例贈与税率は直系尊属（親・祖父母）から18歳以上の子・孫への贈与に適用されます。第1順位（子）を選択してください。"
              className="mb-8 no-print"
            />
          )}
        </>
      }
      resultRef={resultRef}
      resultSection={
        <>
          {result && (
            <div className="result-fade-in">
              <PrintHeader title="現金贈与シミュレーション" />
              <div className="space-y-4 md:space-y-6">
                <CashGiftSummaryCard result={result} />
                <CashGiftFlowSteps result={result} />
                <CashGiftHeirTable result={result} />
                {calcInputs && (
                  <CashGiftYearComparison
                    estateValue={calcInputs.estateValue}
                    composition={calcInputs.composition}
                    recipients={calcInputs.recipients}
                    spouseMode={calcInputs.spouseMode}
                  />
                )}
              </div>
            </div>
          )}
          {!result && estateValue > 0 && !noEligibleRecipients && !hasAttempted && (
            <StatusCard
              variant="success"
              title="贈与受取人を追加してください"
              description="受取人と年間贈与額・贈与年数を入力すると、シミュレーション結果が表示されます。"
              className="no-print"
            />
          )}
        </>
      }
    />
  );
};
