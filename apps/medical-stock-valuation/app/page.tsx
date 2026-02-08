'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, FilePlus, Calculator } from 'lucide-react';
import Header from '@/components/Header';
import { Investor } from '@/lib/types';
import Step0BasicInfo from '@/components/valuation/Step0BasicInfo';
import Step1CompanySize from '@/components/valuation/Step1CompanySize';
import Step2FinancialData from '@/components/valuation/Step2FinancialData';
import Step3Investors from '@/components/valuation/Step3Investors';
import { useSaveValuation } from '@/hooks/useSaveValuation';
import { validateFormData } from '@/lib/utils';
import { BTN_CLASS, HOVER_CLASS } from '@/lib/button-styles';
import { toWareki } from '@/lib/date-utils';
import { useToast } from '@/components/Toast';

export default function Home() {
  const router = useRouter();
  const { saveAsNew, saveOverwrite, isSaving } = useSaveValuation();
  const toast = useToast();

  const [currentDataId, setCurrentDataId] = useState<string | undefined>(undefined);
  const [fiscalYear, setFiscalYear] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [personInCharge, setPersonInCharge] = useState('');
  const [employees, setEmployees] = useState('');
  const [totalAssets, setTotalAssets] = useState('');
  const [sales, setSales] = useState('');
  const [currentPeriodNetAsset, setCurrentPeriodNetAsset] = useState('');
  const [previousPeriodNetAsset, setPreviousPeriodNetAsset] = useState('');
  const [netAssetTaxValue, setNetAssetTaxValue] = useState('');
  const [currentPeriodProfit, setCurrentPeriodProfit] = useState('');
  const [previousPeriodProfit, setPreviousPeriodProfit] = useState('');
  const [previousPreviousPeriodProfit, setPreviousPreviousPeriodProfit] = useState('');
  const [investors, setInvestors] = useState<Investor[]>([
    { name: '', amount: 0 },
    { name: '', amount: 0 },
    { name: '', amount: 0 },
  ]);

  useEffect(() => {
    const savedData = localStorage.getItem('formData');
    if (savedData) {
      try {
        const data = JSON.parse(savedData);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCurrentDataId(data.id);
        setFiscalYear(data.fiscalYear || '');
        setCompanyName(data.companyName || '');
        setPersonInCharge(data.personInCharge || '');
        setEmployees(data.employees || '');
        setTotalAssets(data.totalAssets || '');
        setSales(data.sales || '');
        setCurrentPeriodNetAsset(data.currentPeriodNetAsset?.toString() || '');
        setPreviousPeriodNetAsset(data.previousPeriodNetAsset?.toString() || '');
        setNetAssetTaxValue(data.netAssetTaxValue?.toString() || '');
        setCurrentPeriodProfit(data.currentPeriodProfit?.toString() || '');
        setPreviousPeriodProfit(data.previousPeriodProfit?.toString() || '');
        setPreviousPreviousPeriodProfit(data.previousPreviousPeriodProfit?.toString() || '');
        if (data.investors && data.investors.length > 0) {
          setInvestors(data.investors);
        }
      } catch (error) {
        console.error('Failed to restore form data:', error);
      }
    }
  }, []);

  const addInvestorRow = () => {
    setInvestors([...investors, { name: '', amount: 0 }]);
  };

  const removeInvestorRow = (index: number) => {
    const newInvestors = investors.filter((_, i) => i !== index);
    setInvestors(newInvestors);
  };

  const updateInvestor = (index: number, field: keyof Investor, value: string | number) => {
    const newInvestors = [...investors];
    newInvestors[index] = { ...newInvestors[index], [field]: value };
    setInvestors(newInvestors);
  };

  const reorderInvestors = (newOrder: Investor[]) => {
    setInvestors(newOrder);
  };

  const totalInvestment = investors.reduce((sum, inv) => sum + (inv.amount || 0), 0);

  const copyToTaxValue = () => {
    if (currentPeriodNetAsset) {
      setNetAssetTaxValue(currentPeriodNetAsset);
    }
  };

  const saveCurrentFormData = () => {
    const formData = {
      ...(currentDataId ? { id: currentDataId } : {}),
      fiscalYear,
      companyName,
      personInCharge,
      employees,
      totalAssets,
      sales,
      currentPeriodNetAsset,
      previousPeriodNetAsset,
      netAssetTaxValue,
      currentPeriodProfit,
      previousPeriodProfit,
      previousPreviousPeriodProfit,
      investors,
    };
    localStorage.setItem('formData', JSON.stringify(formData));
  };

  const validateAllSteps = () => {
    const result = validateFormData({
      fiscalYear,
      companyName,
      personInCharge,
      employees,
      totalAssets,
      sales,
      currentPeriodNetAsset,
      netAssetTaxValue,
      currentPeriodProfit,
      investors,
    });

    if (!result.isValid) {
      toast.warning(result.message!);
      return null;
    }

    return result.validInvestors!;
  };

  const buildFormData = (validInvestors: Array<{ name: string; amount: number }>, includeId = false) => {
    return {
      ...(includeId && currentDataId ? { id: currentDataId } : {}),
      fiscalYear,
      companyName,
      personInCharge,
      employees,
      totalAssets,
      sales,
      currentPeriodNetAsset: parseFloat(currentPeriodNetAsset) || 0,
      previousPeriodNetAsset: parseFloat(previousPeriodNetAsset) || 0,
      netAssetTaxValue: parseFloat(netAssetTaxValue) || 0,
      currentPeriodProfit: parseFloat(currentPeriodProfit) || 0,
      previousPeriodProfit: parseFloat(previousPeriodProfit) || 0,
      previousPreviousPeriodProfit: parseFloat(previousPreviousPeriodProfit) || 0,
      investors: validInvestors,
    };
  };

  const handleSaveAsNew = async () => {
    const validInvestors = validateAllSteps();
    if (!validInvestors) return;

    const formData = buildFormData(validInvestors);
    const result = await saveAsNew(formData);

    if (result.success) {
      setCurrentDataId(result.id);
      toast.success('新規データとして保存しました');
    } else {
      toast.error('データの保存に失敗しました。再度お試しください');
    }
  };

  const handleSaveOverwrite = async () => {
    const validInvestors = validateAllSteps();
    if (!validInvestors) return;

    const formData = buildFormData(validInvestors, true);
    const result = await saveOverwrite(formData);

    if (result.success) {
      setCurrentDataId(result.id);
      toast.success(currentDataId ? 'データを上書き保存しました' : '新規データとして保存しました');
    } else {
      toast.error('データの保存に失敗しました。再度お試しください');
    }
  };

  const goToResults = () => {
    const validInvestors = validateAllSteps();
    if (!validInvestors) return;

    const formData = buildFormData(validInvestors, true);
    localStorage.setItem('formData', JSON.stringify(formData));
    router.push('/results');
  };

  return (
    <div>
      <Header showClearButton={true} />

      <div className="card">
        <p className="text-lg mb-4">医療法人の出資持分の評価額の概算を知りたい方向けのツールです。</p>
      </div>

      <div className="card">
        <h2 className="mt-0">本ツールの目的</h2>
        <ul className="list-disc ml-6 space-y-1 text-gray-700">
          <li>持分あり医療法人を経営しており、相続発生時の概算を知りたい</li>
          <li>正確でなくてもよいので、まずは目安を把握したい</li>
          <li>決算書・出資者名簿が手元にある</li>
        </ul>
      </div>

      <div className="card">
        <h2 className="mt-0">ご用意いただくもの</h2>
        <ul className="list-disc ml-6 space-y-1 text-gray-700">
          <li>直近3期分の決算書</li>
          <li>出資者名簿</li>
        </ul>
        <p className="text-sm text-gray-600 mt-4">
          ※ 正確な評価額を算出するには、税理士等の専門家へご相談ください。
        </p>
      </div>

      <Step0BasicInfo
        fiscalYear={fiscalYear}
        setFiscalYear={setFiscalYear}
        companyName={companyName}
        setCompanyName={setCompanyName}
        personInCharge={personInCharge}
        setPersonInCharge={setPersonInCharge}
        onBeforeNavigate={saveCurrentFormData}
      />

      <Step1CompanySize
        employees={employees}
        setEmployees={setEmployees}
        totalAssets={totalAssets}
        setTotalAssets={setTotalAssets}
        sales={sales}
        setSales={setSales}
      />

      <Step2FinancialData
        currentPeriodNetAsset={currentPeriodNetAsset}
        setCurrentPeriodNetAsset={setCurrentPeriodNetAsset}
        previousPeriodNetAsset={previousPeriodNetAsset}
        setPreviousPeriodNetAsset={setPreviousPeriodNetAsset}
        netAssetTaxValue={netAssetTaxValue}
        setNetAssetTaxValue={setNetAssetTaxValue}
        currentPeriodProfit={currentPeriodProfit}
        setCurrentPeriodProfit={setCurrentPeriodProfit}
        previousPeriodProfit={previousPeriodProfit}
        setPreviousPeriodProfit={setPreviousPeriodProfit}
        previousPreviousPeriodProfit={previousPreviousPeriodProfit}
        setPreviousPreviousPeriodProfit={setPreviousPreviousPeriodProfit}
        copyToTaxValue={copyToTaxValue}
      />

      <Step3Investors
        investors={investors}
        updateInvestor={updateInvestor}
        addInvestorRow={addInvestorRow}
        removeInvestorRow={removeInvestorRow}
        reorderInvestors={reorderInvestors}
        totalInvestment={totalInvestment}
      />

      <div className="mt-8">
        {currentDataId && companyName && fiscalYear && personInCharge && (
          <div className="card mb-4 bg-gray-100">
            <p className="text-sm text-gray-700 m-0">
              読み込み中: <span className="font-semibold">{companyName}</span> / <span className="font-semibold">{toWareki(fiscalYear)}年度</span> / <span className="font-semibold">{personInCharge}</span>
            </p>
          </div>
        )}

        <div className="flex gap-4">
          <button
            onClick={handleSaveAsNew}
            className={`${BTN_CLASS} ${HOVER_CLASS}`}
            disabled={isSaving}
          >
            <FilePlus size={20} />
            新規保存
          </button>
          <button
            onClick={handleSaveOverwrite}
            className={`${BTN_CLASS} ${HOVER_CLASS}`}
            disabled={isSaving}
          >
            <Save size={20} />
            {currentDataId ? '上書保存' : '保存'}
          </button>
          <button onClick={goToResults} className={`${BTN_CLASS} ${HOVER_CLASS}`}>
            <Calculator size={20} />
            計算結果を確認する
          </button>
        </div>
      </div>
    </div>
  );
}
