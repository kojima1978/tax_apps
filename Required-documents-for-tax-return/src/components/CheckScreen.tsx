'use client';

import { ArrowLeft, Briefcase, Calculator, ChevronRight, Check } from 'lucide-react';
import { taxReturnData, OptionItem } from '@/data/taxReturnData';
import YearSelector from './YearSelector';
import CompanyNameInput from './CompanyNameInput';
import InsuranceCompanyInput from './InsuranceCompanyInput';
import BankNameInput from './BankNameInput';

interface CheckScreenProps {
  selectedOptions: Record<string, boolean>;
  selectedDeductions: Record<string, boolean>;
  onToggleOption: (id: string) => void;
  onToggleDeduction: (id: string) => void;
  onBack: () => void;
  onGenerate: () => void;
  year: number;
  onYearChange: (year: number) => void;
  companyNames: string[];
  onCompanyNamesChange: (names: string[]) => void;
  lifeInsuranceCompanies: string[];
  onLifeInsuranceCompaniesChange: (names: string[]) => void;
  earthquakeInsuranceCompanies: string[];
  onEarthquakeInsuranceCompaniesChange: (names: string[]) => void;
  bankNames: string[];
  onBankNamesChange: (names: string[]) => void;
  medicalBankNames: string[];
  onMedicalBankNamesChange: (names: string[]) => void;
  realEstateBankNames: string[];
  onRealEstateBankNamesChange: (names: string[]) => void;
}

interface CheckboxProps {
  item: OptionItem;
  isChecked: boolean;
  onToggle: () => void;
}

function Checkbox({ item, isChecked, onToggle }: CheckboxProps) {
  return (
    <label
      className={`flex items-start p-3 rounded-lg border-2 cursor-pointer transition-all ${
        isChecked ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:border-slate-300'
      }`}
      onClick={(e) => {
        e.preventDefault();
        onToggle();
      }}
    >
      <div
        className={`mt-1 w-5 h-5 flex items-center justify-center border rounded ${
          isChecked ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'
        }`}
      >
        {isChecked && <Check className="w-3 h-3 text-white" />}
      </div>
      <span className="ml-3 text-slate-700 font-medium">{item.label}</span>
    </label>
  );
}

export default function CheckScreen({
  selectedOptions,
  selectedDeductions,
  onToggleOption,
  onToggleDeduction,
  onBack,
  onGenerate,
  year,
  onYearChange,
  companyNames,
  onCompanyNamesChange,
  lifeInsuranceCompanies,
  onLifeInsuranceCompaniesChange,
  earthquakeInsuranceCompanies,
  onEarthquakeInsuranceCompaniesChange,
  bankNames,
  onBankNamesChange,
  medicalBankNames,
  onMedicalBankNamesChange,
  realEstateBankNames,
  onRealEstateBankNamesChange,
}: CheckScreenProps) {
  // 給与・年金・退職金の項目が選択されているかチェック
  const showCompanyInput = selectedOptions['salary_pension'];
  // 保険控除が選択されているかチェック
  const showInsuranceInput = selectedDeductions['insurance'];
  // 事業（通帳が必要な項目）が選択されているかチェック
  const showBankInput = selectedOptions['business_general'];
  // 医業が選択されているかチェック
  const showMedicalBankInput = selectedOptions['business_medical'];
  // 不動産収入が選択されているかチェック
  const showRealEstateBankInput = selectedOptions['real_estate'];

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> TOPに戻る
        </button>
        <YearSelector year={year} onYearChange={onYearChange} />
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-blue-600 p-6 text-white">
          <h2 className="text-2xl font-bold mb-2">確定申告 書類確認シート</h2>
          <p className="opacity-90">{taxReturnData.description}</p>
        </div>

        <div className="p-6 md:p-8 space-y-8">
          <div>
            <h3 className="flex items-center text-lg font-bold text-slate-700 mb-4 pb-2 border-b border-slate-200">
              <Briefcase className="w-5 h-5 mr-2 text-blue-600" />
              1. 収入・所得の種類を選択してください
            </h3>
            <div className="grid gap-3">
              {taxReturnData.options.map((opt) => (
                <div key={opt.id}>
                  <Checkbox
                    item={opt}
                    isChecked={!!selectedOptions[opt.id]}
                    onToggle={() => onToggleOption(opt.id)}
                  />
                  {/* 給与・年金が選択された場合に会社名入力を表示 */}
                  {opt.id === 'salary_pension' && showCompanyInput && (
                    <div className="mt-3 ml-8">
                      <CompanyNameInput
                        companyNames={companyNames}
                        onCompanyNamesChange={onCompanyNamesChange}
                      />
                    </div>
                  )}
                  {/* 一般事業が選択された場合に銀行名入力を表示 */}
                  {opt.id === 'business_general' && showBankInput && (
                    <div className="mt-3 ml-8">
                      <BankNameInput
                        bankNames={bankNames}
                        onBankNamesChange={onBankNamesChange}
                        label="事業用口座の金融機関名"
                      />
                    </div>
                  )}
                  {/* 医業が選択された場合に銀行名入力を表示 */}
                  {opt.id === 'business_medical' && showMedicalBankInput && (
                    <div className="mt-3 ml-8">
                      <BankNameInput
                        bankNames={medicalBankNames}
                        onBankNamesChange={onMedicalBankNamesChange}
                        label="医業用口座の金融機関名"
                      />
                    </div>
                  )}
                  {/* 不動産が選択された場合に銀行名入力を表示 */}
                  {opt.id === 'real_estate' && showRealEstateBankInput && (
                    <div className="mt-3 ml-8">
                      <BankNameInput
                        bankNames={realEstateBankNames}
                        onBankNamesChange={onRealEstateBankNamesChange}
                        label="不動産所得用口座の金融機関名"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="flex items-center text-lg font-bold text-slate-700 mb-4 pb-2 border-b border-slate-200">
              <Calculator className="w-5 h-5 mr-2 text-blue-600" />
              2. 適用する控除を選択してください
            </h3>
            <div className="grid gap-3">
              {taxReturnData.deductions.map((ded) => (
                <div key={ded.id}>
                  <Checkbox
                    item={ded}
                    isChecked={!!selectedDeductions[ded.id]}
                    onToggle={() => onToggleDeduction(ded.id)}
                  />
                  {/* 保険控除が選択された場合に保険会社名入力を表示 */}
                  {ded.id === 'insurance' && showInsuranceInput && (
                    <div className="mt-3 ml-8">
                      <InsuranceCompanyInput
                        lifeInsuranceCompanies={lifeInsuranceCompanies}
                        onLifeInsuranceCompaniesChange={onLifeInsuranceCompaniesChange}
                        earthquakeInsuranceCompanies={earthquakeInsuranceCompanies}
                        onEarthquakeInsuranceCompaniesChange={onEarthquakeInsuranceCompaniesChange}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex flex-col items-center space-y-4">
            <button
              onClick={onGenerate}
              className="flex items-center px-10 py-4 rounded-full text-white text-lg font-bold shadow-lg transform transition hover:-translate-y-1 bg-blue-600 hover:bg-blue-700"
            >
              案内を作成する <ChevronRight className="ml-2 w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
