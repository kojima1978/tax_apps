'use client';

import { Calendar } from 'lucide-react';

interface YearSelectorProps {
  year: number;
  onYearChange: (year: number) => void;
}

export default function YearSelector({ year, onYearChange }: YearSelectorProps) {
  const currentYear = new Date().getFullYear();
  // 令和元年(2019)から現在年までの選択肢を生成
  const startYear = 2019; // 令和元年
  const years: number[] = [];

  for (let y = currentYear; y >= startYear; y--) {
    years.push(y - 2018); // 西暦から令和に変換 (2019 -> 1, 2020 -> 2, ...)
  }

  return (
    <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200">
      <Calendar className="w-5 h-5 text-blue-600" />
      <label className="text-sm font-medium text-slate-600">申告年度:</label>
      <select
        value={year}
        onChange={(e) => onYearChange(Number(e.target.value))}
        className="px-3 py-1 border border-slate-300 rounded-md text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        {years.map((reiwaYear) => (
          <option key={reiwaYear} value={reiwaYear}>
            令和{reiwaYear}年
          </option>
        ))}
      </select>
    </div>
  );
}
