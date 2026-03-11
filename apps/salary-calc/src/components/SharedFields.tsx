import { PREFECTURES } from '@/data/prefectureRates';
import type { SharedState } from '@/App';

interface SharedFieldsProps {
  shared: SharedState;
  onChange: (state: SharedState) => void;
}

export function SharedFields({ shared, onChange }: SharedFieldsProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-4 print:hidden">
      <p className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider">共通設定</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">
            都道府県（健康保険）
          </label>
          <select
            value={shared.prefectureCode}
            onChange={e => onChange({ ...shared, prefectureCode: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white text-sm"
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white text-sm"
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
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              介護保険該当<span className="text-xs text-gray-400 ml-1">(40〜64歳)</span>
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
