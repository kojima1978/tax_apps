import { useState, useMemo, useCallback } from 'react';
import Landmark from 'lucide-react/icons/landmark';
import { Header } from '../components/Header';
import { HeirSettings } from '../components/HeirSettings';
import { SectionHeader } from '../components/SectionHeader';
import { CurrencyInput } from '../components/CurrencyInput';
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
import { useCleanOptions } from '../hooks/useCleanOptions';
import type { HeirComposition, SpouseAcquisitionMode, InsuranceContract, InsuranceSimulationResult } from '../types';
import { createDefaultComposition } from '../constants';
import { calculateInsuranceSimulation, getBeneficiaryOptions } from '../utils';

export const InsurancePage: React.FC = () => {
  const [composition, setComposition] = useState<HeirComposition>(createDefaultComposition);
  const [estateValue, setEstateValue] = useState<number>(0);
  const [spouseMode, setSpouseMode] = useState<SpouseAcquisitionMode>({ mode: 'legal' });
  const [existingContracts, setExistingContracts] = useState<InsuranceContract[]>([]);
  const [newContracts, setNewContracts] = useState<InsuranceContract[]>([]);

  const beneficiaryOptions = useMemo(
    () => getBeneficiaryOptions(composition),
    [composition],
  );

  // 相続人構成が変わったら、無効な受取人を持つ契約をクリーンアップ
  const getContractId = useCallback((c: InsuranceContract) => c.beneficiaryId, []);
  const setContractId = useCallback((c: InsuranceContract, id: string, label: string) => ({ ...c, beneficiaryId: id, beneficiaryLabel: label }), []);
  const cleanedExisting = useCleanOptions(existingContracts, beneficiaryOptions, getContractId, setContractId);
  const cleanedNew = useCleanOptions(newContracts, beneficiaryOptions, getContractId, setContractId);

  const [result, setResult] = useState<InsuranceSimulationResult | null>(null);

  const handleCalculate = useCallback(() => {
    if (estateValue <= 0 || [...cleanedExisting, ...cleanedNew].length === 0) {
      setResult(null);
      return;
    }
    setResult(calculateInsuranceSimulation(estateValue, composition, cleanedExisting, cleanedNew, spouseMode));
  }, [estateValue, composition, cleanedExisting, cleanedNew, spouseMode]);

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
            <div className="bg-white rounded-lg shadow-md p-6">
              <SectionHeader icon={Landmark} title="遺産総額" />
              <CurrencyInput
                id="estate-value"
                label="遺産総額（保険金を含まない元の財産額）"
                value={estateValue}
                onChange={setEstateValue}
                placeholder="例: 20000"
              />
            </div>
            <SpouseAcquisitionSettings
              value={spouseMode}
              onChange={setSpouseMode}
              hasSpouse={composition.hasSpouse}
            />
            <CautionBox
              items={[
                '死亡保険金の非課税限度額 = 500万円 × 法定相続人数（相続人が受け取る保険金のみ対象）',
                '「現状」は既存保険契約のみ、「提案」は既存＋新規検討契約を含めた場合のシミュレーションです。',
                '新規契約の保険料は遺産（現金）から差し引かれるものと仮定しています。',
                '実際の税額は個別の事情により異なります。詳細は税理士にご相談ください。',
              ]}
            />
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
            <PrintHeader title="死亡保険金シミュレーション" />
            <div className="space-y-6">
              <InsuranceSummaryCard result={result} />
              <InsuranceFlowSteps result={result} />
              <InsuranceHeirTable result={result} />
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
