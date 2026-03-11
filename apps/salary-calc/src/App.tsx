import { useState } from 'react';
import { Banknote, Gift } from 'lucide-react';
import { SalaryForm } from '@/components/SalaryForm';
import { BonusForm } from '@/components/BonusForm';
import { SharedFields } from '@/components/SharedFields';

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

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('salary');
  const [shared, setShared] = useState<SharedState>({
    prefectureCode: '13',
    dependents: '0',
    isNursingCare: false,
  });

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <header className="bg-gradient-to-r from-[var(--color-primary-dark)] to-[var(--color-primary)] text-white shadow-md print:shadow-none">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold tracking-tight">
            給与・賞与 手取り計算
          </h1>
          <p className="text-blue-200 text-sm mt-1">
            令和8年分（2026年）源泉徴収税額表・社会保険料率対応
          </p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Tab Selector */}
        <div className="flex bg-white rounded-xl shadow-sm border border-gray-200 p-1 mb-6 print:hidden">
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
          ? <SalaryForm shared={shared} />
          : <BonusForm shared={shared} />
        }

        {/* Footer Notes */}
        <div className="mt-8 bg-blue-50 rounded-xl p-5 border border-blue-100 print:hidden">
          <h4 className="text-sm font-bold text-[var(--color-primary-dark)] mb-2">計算に使用しているデータ</h4>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>・所得税: 令和8年分 源泉徴収税額表（電子計算機の特例）</li>
            <li>・健康保険: 令和8年度 協会けんぽ 都道府県別保険料率</li>
            <li>・厚生年金: 18.3%（労使折半 9.15%）</li>
            <li>・雇用保険: 一般の事業 被保険者負担 0.55%</li>
            <li>・介護保険: 1.62%（40歳以上65歳未満、労使折半 0.81%）</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
