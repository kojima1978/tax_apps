import { useRef } from 'react';
import { PageLayout } from '../components/PageLayout';
import { HeirSettings } from '../components/HeirSettings';
import { EstateInput } from '../components/EstateInput';
import { SpouseAcquisitionSettings } from '../components/calculator/SpouseAcquisitionSettings';
import { InsuranceContractList } from '../components/insurance/InsuranceContractList';
import { InsuranceSummaryCard } from '../components/insurance/InsuranceSummaryCard';
import { InsuranceFlowSteps } from '../components/insurance/InsuranceFlowSteps';
import { InsuranceHeirTable } from '../components/insurance/InsuranceHeirTable';
import { PrintHeader } from '../components/PrintHeader';
import { CautionBox } from '../components/CautionBox';
import { StatusCard } from '../components/StatusCard';
import { useInsuranceSimulation } from '../hooks/useInsuranceSimulation';
import { useScrollToResult } from '../hooks/useScrollToResult';
import { useFormValidation } from '../hooks/useFormValidation';
import { INSURANCE_CAUTIONS } from '../constants/cautionMessages';

export const InsurancePage: React.FC = () => {
  const {
    composition, setComposition,
    estateValue, setEstateValue,
    spouseMode, setSpouseMode,
    existingContracts, setExistingContracts,
    newContracts, setNewContracts,
    beneficiaryOptions,
    cleanedExisting, cleanedNew,
    result,
    handleCalculate: executeCalculate,
  } = useInsuranceSimulation();

  const estateRef = useRef<HTMLDivElement>(null);
  const contractsRef = useRef<HTMLDivElement>(null);
  const resultRef = useScrollToResult(!!result);

  const noContracts = cleanedExisting.length === 0 && cleanedNew.length === 0;

  const { validationErrors, hasAttempted, handleCalculate } = useFormValidation([
    { condition: estateValue <= 0, ref: estateRef, message: '遺産総額を入力してください' },
    { condition: noContracts, ref: contractsRef, message: '保険契約を1件以上追加してください' },
  ], executeCalculate);

  return (
    <PageLayout
      printClassName="insurance-print"
      leftSection={
        <HeirSettings composition={composition} onChange={setComposition} />
      }
      rightSection={
        <>
          <div ref={estateRef}>
            <EstateInput
              value={estateValue}
              onChange={setEstateValue}
              label="遺産総額（保険金を含まない元の財産額）"
              placeholder="例: 20000"
              hasError={hasAttempted && estateValue <= 0}
            />
          </div>
          <SpouseAcquisitionSettings
            value={spouseMode}
            onChange={setSpouseMode}
            hasSpouse={composition.hasSpouse}
          />
          <CautionBox items={INSURANCE_CAUTIONS} />
        </>
      }
      middleSection={
        <div
          ref={contractsRef}
          className={`grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8 no-print ${hasAttempted && noContracts ? 'ring-2 ring-red-400 rounded-lg p-1' : ''}`}
        >
          <InsuranceContractList
            contracts={existingContracts}
            category="existing"
            beneficiaryOptions={beneficiaryOptions}
            onChange={setExistingContracts}
          />
          <InsuranceContractList
            contracts={newContracts}
            category="new"
            beneficiaryOptions={beneficiaryOptions}
            onChange={setNewContracts}
          />
        </div>
      }
      validationErrors={validationErrors}
      hasAttempted={hasAttempted}
      onCalculate={handleCalculate}
      belowButton={
        !result && estateValue > 0 && !hasAttempted ? (
          <StatusCard
            variant="success"
            title="保険契約を追加してください"
            description="既存保険契約または新規検討契約を追加すると、シミュレーション結果が表示されます。"
            className="no-print"
          />
        ) : undefined
      }
      resultRef={resultRef}
      resultSection={
        result ? (
          <div className="result-fade-in">
            <PrintHeader title="保険金シミュレーション" />
            <div className="space-y-4 md:space-y-6">
              <InsuranceSummaryCard result={result} />
              <div className="print-page-break">
                <InsuranceFlowSteps result={result} />
              </div>
              <div className="print-page-break">
                <InsuranceHeirTable result={result} />
              </div>
            </div>
          </div>
        ) : null
      }
    />
  );
};
