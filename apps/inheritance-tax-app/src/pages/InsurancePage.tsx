import { Header } from '../components/Header';
import { HeirSettings } from '../components/HeirSettings';
import { EstateInput } from '../components/EstateInput';
import { SpouseAcquisitionSettings } from '../components/calculator/SpouseAcquisitionSettings';
import { InsuranceContractList } from '../components/insurance/InsuranceContractList';
import { InsuranceSummaryCard } from '../components/insurance/InsuranceSummaryCard';
import { InsuranceFlowSteps } from '../components/insurance/InsuranceFlowSteps';
import { InsuranceHeirTable } from '../components/insurance/InsuranceHeirTable';
import { InsuranceExcelExport } from '../components/insurance/InsuranceExcelExport';
import { CalculateButton } from '../components/CalculateButton';
import { PrintHeader } from '../components/PrintHeader';
import { CautionBox } from '../components/CautionBox';
import { StatusCard } from '../components/StatusCard';
import { useInsuranceSimulation } from '../hooks/useInsuranceSimulation';
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
    handleCalculate,
  } = useInsuranceSimulation();

  const excelAction = result
    ? <InsuranceExcelExport result={result} composition={composition} estateValue={estateValue} existingContracts={cleanedExisting} newContracts={cleanedNew} />
    : undefined;

  return (
    <>
      <Header actions={excelAction} />
      <main className="max-w-7xl mx-auto px-4 py-8 insurance-print">
        {/* 入力エリア */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 no-print">
          <div className="space-y-6">
            <HeirSettings composition={composition} onChange={setComposition} />
          </div>
          <div className="space-y-6">
            <EstateInput
              value={estateValue}
              onChange={setEstateValue}
              label="遺産総額（保険金を含まない元の財産額）"
              placeholder="例: 20000"
            />
            <SpouseAcquisitionSettings
              value={spouseMode}
              onChange={setSpouseMode}
              hasSpouse={composition.hasSpouse}
            />
            <CautionBox items={INSURANCE_CAUTIONS} />
          </div>
        </div>

        {/* 保険契約入力 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 no-print">
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

        <div className="mb-8 no-print">
          <CalculateButton onClick={handleCalculate} />
        </div>

        {/* 結果表示 */}
        {result && (
          <>
            <PrintHeader title="保険金シミュレーション" />
            <div className="space-y-6">
              <InsuranceSummaryCard result={result} />
              <div className="print-page-break">
                <InsuranceFlowSteps result={result} />
              </div>
              <div className="print-page-break">
                <InsuranceHeirTable result={result} />
              </div>
            </div>
          </>
        )}

        {/* 未入力ガイド */}
        {!result && estateValue > 0 && (
          <StatusCard
            variant="success"
            title="保険契約を追加してください"
            description="既存保険契約または新規検討契約を追加すると、シミュレーション結果が表示されます。"
            className="no-print"
          />
        )}
      </main>
    </>
  );
};
