import { ERA_NAMES, partsToValue, seirekiYearOf, valueToParts, type WarekiParts } from '../wareki';
import { controlClass } from './ui';

const DATE_PARTS: { key: Exclude<keyof WarekiParts, 'era'>; unit: string }[] = [
  { key: 'year', unit: '年' },
  { key: 'month', unit: '月' },
  { key: 'day', unit: '日' },
];

// 全角の数字も受け、数字以外は捨てる（元号年・月・日とも2桁まで）
const digitsOnly = (raw: string) => raw.normalize('NFKC').replace(/\D/g, '').slice(0, 2);

/**
 * 和暦の日付を元号・年・月・日の4つの欄で入れる。value / onChange は保存用の値
 * （'' / 西暦 `YYYY-MM-DD` / 途中や誤りの下書き）で、変換は wareki.ts が持つ。
 * 元号は空の選択肢を先頭に置く ── 無いと、未選択でも画面には「明治」が出る
 */
export function WarekiDateField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
}) {
  const parts = valueToParts(value);
  const seireki = seirekiYearOf(parts);
  const set = (patch: Partial<WarekiParts>) => onChange(partsToValue({ ...parts, ...patch }));
  const invalid = error ? 'border-red-500' : '';
  return (
    <fieldset>
      <legend className="mb-1 block text-sm font-medium text-slate-700">{label}</legend>
      <div className="flex flex-wrap items-center gap-1 text-sm text-slate-700">
        <select
          aria-label={`${label}の元号`}
          className={`${controlClass} ${invalid}`}
          value={parts.era}
          onChange={(e) => set({ era: e.target.value })}
          aria-invalid={error ? true : undefined}
        >
          <option value="">元号</option>
          {ERA_NAMES.map((era) => (
            <option key={era} value={era}>
              {era}
            </option>
          ))}
        </select>
        {DATE_PARTS.map(({ key, unit }) => (
          <label key={key} className="flex items-center gap-1">
            <input
              aria-label={`${label}の${unit}`}
              inputMode="numeric"
              className={`${controlClass} ${invalid} w-12 text-right tabular-nums`}
              value={parts[key]}
              onChange={(e) => set({ [key]: digitsOnly(e.target.value) })}
              aria-invalid={error ? true : undefined}
            />
            {unit}
          </label>
        ))}
        {seireki !== null && <span className="ml-1 text-xs text-slate-500">（{seireki}年）</span>}
      </div>
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </fieldset>
  );
}
