import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { PREFECTURES } from '@/data/prefectureRates';
import type { SharedState } from '@/App';

interface SharedFieldsProps {
  shared: SharedState;
  onChange: (state: SharedState) => void;
}

function getSummary(shared: SharedState): string {
  const pref = PREFECTURES.find(p => p.code === shared.prefectureCode);
  const parts = [
    pref?.name ?? '東京都',
    `扶養${shared.dependents}人`,
  ];
  if (shared.isNursingCare) parts.push('介護保険あり');
  return parts.join(' / ');
}

export function SharedFields({ shared, onChange }: SharedFieldsProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-4">
      <button
        type="button"
        onClick={() => setIsOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3 cursor-pointer"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">共通設定</p>
          {!isOpen && (
            <span className="text-xs text-gray-400">{getSummary(shared)}</span>
          )}
        </div>
        <ChevronDown
          size={16}
          className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="px-5 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                都道府県（健康保険）
              </label>
              <select
                value={shared.prefectureCode}
                onChange={e => onChange({ ...shared, prefectureCode: e.target.value })}
                aria-label="都道府県を選択"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg transition bg-white text-sm cursor-pointer"
              >
                {PREFECTURES.map(p => (
                  <option key={p.code} value={p.code}>
                    {p.name}（{p.healthRate}%）
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                扶養親族等の数
              </label>
              <select
                value={shared.dependents}
                onChange={e => onChange({ ...shared, dependents: e.target.value })}
                aria-label="扶養親族等の数を選択"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg transition bg-white text-sm cursor-pointer"
              >
                {Array.from({ length: 8 }, (_, i) => (
                  <option key={i} value={i}>{i}人</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer py-2">
                <input
                  type="checkbox"
                  checked={shared.isNursingCare}
                  onChange={e => onChange({ ...shared, isNursingCare: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">
                  介護保険該当<span className="text-xs text-gray-400 ml-1">(40〜64歳)</span>
                </span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
