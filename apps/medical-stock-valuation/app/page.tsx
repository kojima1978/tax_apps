'use client';

import { useRouter } from 'next/navigation';
import { Save, FilePlus, Calculator } from 'lucide-react';
import Header from '@/components/Header';
import Step0BasicInfo from '@/components/valuation/Step0BasicInfo';
import Step1CompanySize from '@/components/valuation/Step1CompanySize';
import Step2FinancialData from '@/components/valuation/Step2FinancialData';
import Step3Investors from '@/components/valuation/Step3Investors';
import { useSaveValuation } from '@/hooks/useSaveValuation';
import { useFormData } from '@/hooks/useFormData';
import { BTN_CLASS, HOVER_CLASS } from '@/lib/button-styles';
import { toWareki } from '@/lib/date-utils';

export default function Home() {
  const router = useRouter();
  const { saveAsNew, saveOverwrite, isSaving } = useSaveValuation();
  const f = useFormData();

  const handleSaveAsNew = async () => {
    const formData = f.getValidFormData();
    if (!formData) return;
    const result = await saveAsNew(formData);
    if (result.success) {
      f.setCurrentDataId(result.id);
      f.toast.success('新規データとして保存しました');
    } else {
      f.toast.error('データの保存に失敗しました。再度お試しください');
    }
  };

  const handleSaveOverwrite = async () => {
    const formData = f.getValidFormData(true);
    if (!formData) return;
    const result = await saveOverwrite(formData);
    if (result.success) {
      f.setCurrentDataId(result.id);
      f.toast.success(f.currentDataId ? 'データを上書き保存しました' : '新規データとして保存しました');
    } else {
      f.toast.error('データの保存に失敗しました。再度お試しください');
    }
  };

  const goToResults = () => {
    const formData = f.getValidFormData(true);
    if (!formData) return;
    try {
      localStorage.setItem('formData', JSON.stringify(formData));
    } catch (error) {
      console.error('localStorage書き込みに失敗:', error);
    }
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
        <p className="text-sm text-gray-600 mt-2">
          ※ 参考: <a href="https://www.nta.go.jp/law/tsutatsu/kobetsu/hyoka/zaisan.htm" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">財産評価基本通達（国税庁）</a>
        </p>
      </div>

      <Step0BasicInfo
        fiscalYear={f.fiscalYear}
        setFiscalYear={f.setFiscalYear}
        companyName={f.companyName}
        setCompanyName={f.setCompanyName}
        personInCharge={f.personInCharge}
        setPersonInCharge={f.setPersonInCharge}
        onBeforeNavigate={f.saveCurrentFormData}
      />

      <Step1CompanySize
        employees={f.employees}
        setEmployees={f.setEmployees}
        totalAssets={f.totalAssets}
        setTotalAssets={f.setTotalAssets}
        sales={f.sales}
        setSales={f.setSales}
      />

      <Step2FinancialData
        currentPeriodNetAsset={f.currentPeriodNetAsset}
        setCurrentPeriodNetAsset={f.setCurrentPeriodNetAsset}
        previousPeriodNetAsset={f.previousPeriodNetAsset}
        setPreviousPeriodNetAsset={f.setPreviousPeriodNetAsset}
        netAssetTaxValue={f.netAssetTaxValue}
        setNetAssetTaxValue={f.setNetAssetTaxValue}
        currentPeriodProfit={f.currentPeriodProfit}
        setCurrentPeriodProfit={f.setCurrentPeriodProfit}
        previousPeriodProfit={f.previousPeriodProfit}
        setPreviousPeriodProfit={f.setPreviousPeriodProfit}
        previousPreviousPeriodProfit={f.previousPreviousPeriodProfit}
        setPreviousPreviousPeriodProfit={f.setPreviousPreviousPeriodProfit}
        copyToTaxValue={f.copyToTaxValue}
      />

      <Step3Investors
        investors={f.investors}
        updateInvestor={f.updateInvestor}
        addInvestorRow={f.addInvestorRow}
        removeInvestorRow={f.removeInvestorRow}
        reorderInvestors={f.reorderInvestors}
        totalInvestment={f.totalInvestment}
      />

      <div className="mt-8">
        {f.currentDataId && f.companyName && f.fiscalYear && f.personInCharge && (
          <div className="card mb-4 bg-gray-100">
            <p className="text-sm text-gray-700 m-0">
              読み込み中: <span className="font-semibold">{f.companyName}</span> / <span className="font-semibold">{toWareki(f.fiscalYear)}年度</span> / <span className="font-semibold">{f.personInCharge}</span>
            </p>
          </div>
        )}

        <div className="flex gap-4">
          <button onClick={handleSaveAsNew} className={`${BTN_CLASS} ${HOVER_CLASS}`} disabled={isSaving}>
            <FilePlus size={20} />
            新規保存
          </button>
          <button onClick={handleSaveOverwrite} className={`${BTN_CLASS} ${HOVER_CLASS}`} disabled={isSaving}>
            <Save size={20} />
            {f.currentDataId ? '上書保存' : '保存'}
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
