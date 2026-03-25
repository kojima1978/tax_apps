import { useState } from 'react';
import { Banknote, Gift } from 'lucide-react';
import { SalaryForm } from '@/components/SalaryForm';
import { BonusForm } from '@/components/BonusForm';
import { SharedFields } from '@/components/SharedFields';
import { ResultSection } from '@/components/ResultSection';
import type { ResultItem } from '@/components/ResultSection';

type Tab = 'salary' | 'bonus';

const TABS: { key: Tab; label: string; icon: typeof Banknote }[] = [
  { key: 'salary', label: '月額給与', icon: Banknote },
  { key: 'bonus', label: '賞与', icon: Gift },
];

export interface SharedState {
  prefectureCode: string;
  dependents: string;
  isNursingCare: boolean;
}

export interface CalcResult {
  type: Tab;
  items: ResultItem[];
  takeHomePay: number;
  grossAmount: number;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('salary');
  const [shared, setShared] = useState<SharedState>({
    prefectureCode: '13',
    dependents: '0',
    isNursingCare: false,
  });
  const [salaryResult, setSalaryResult] = useState<CalcResult | null>(null);
  const [bonusResult, setBonusResult] = useState<CalcResult | null>(null);

  const currentResult = activeTab === 'salary' ? salaryResult : bonusResult;

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <header className="bg-gradient-to-r from-[var(--color-primary-dark)] to-[var(--color-primary)] text-white shadow-md print:shadow-none">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold tracking-tight">
            給与・賞与 手取り計算
          </h1>
          <p className="text-blue-200 text-sm mt-1">
            令和8年分（2026年）源泉徴収税額表・社会保険料率対応
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Form */}
          <div className="print:hidden">
            {/* Tab Selector */}
            <div className="flex bg-white rounded-xl shadow-sm border border-gray-200 p-1 mb-4">
              {TABS.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition cursor-pointer ${
                      isActive
                        ? 'bg-[var(--color-primary)] text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={18} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Shared Fields */}
            <SharedFields shared={shared} onChange={setShared} />

            {/* Form */}
            {activeTab === 'salary'
              ? <SalaryForm shared={shared} onResult={setSalaryResult} />
              : <BonusForm shared={shared} onResult={setBonusResult} />
            }

            {/* Footer Notes */}
            <div className="mt-6 bg-[var(--color-primary-50)] rounded-xl p-5 border border-blue-100">
              <h4 className="text-sm font-bold text-[var(--color-primary-dark)] mb-2">計算に使用しているデータ</h4>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>・所得税: 令和8年分 源泉徴収税額表（電子計算機の特例）</li>
                <li>・健康保険: 令和8年度 協会けんぽ 都道府県別保険料率</li>
                <li>・厚生年金: 18.3%（労使折半 9.15%）</li>
                <li>・雇用保険: 一般の事業 被保険者負担 0.55%</li>
                <li>・介護保険: 1.62%（40歳以上65歳未満、労使折半 0.81%）</li>
              </ul>
            </div>
          </div>

          {/* Right Column: Result */}
          <div className="lg:sticky lg:top-6 lg:self-start">
            {currentResult ? (
              <ResultSection
                type={currentResult.type}
                items={currentResult.items}
                takeHomePay={currentResult.takeHomePay}
                grossAmount={currentResult.grossAmount}
              />
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10 text-center print:hidden">
                <div className="text-gray-300 mb-3">
                  <Banknote size={48} className="mx-auto" />
                </div>
                <p className="text-gray-400 text-sm">
                  金額を入力して「計算する」を押すと<br />ここに結果が表示されます
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
