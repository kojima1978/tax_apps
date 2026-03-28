import { useState } from 'react';
import { Banknote, Gift, Home } from 'lucide-react';
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
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 print:hidden">
        <div className="max-w-6xl mx-auto flex items-center h-14 px-4 gap-2">
          <a
            href="/"
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm font-medium text-slate-400 hover:text-emerald-600 transition-colors flex-shrink-0"
            title="ポータルに戻る"
          >
            <Home className="h-5 w-5" />
            <span className="hidden sm:inline">ポータル</span>
          </a>
          <nav className="flex items-center gap-0.5 flex-1 min-w-0">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Form */}
          <div className="print:hidden">
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
