type ProfitMethod = "auto" | "c1" | "c2";

interface ProfitMethodSelectorProps {
  label: string;
  value: ProfitMethod;
  onChange: (v: ProfitMethod) => void;
  /** c1ボタンのテキスト（デフォルト: "直前"） */
  c1Label?: string;
  /** c2ボタンのテキスト（デフォルト: "2年平均"） */
  c2Label?: string;
  /** 右端の説明テキスト（デフォルト: "(自動: 低いほう)"） */
  hint?: string;
  /** アクティブ色 — "primary" | "green"（デフォルト: "primary"） */
  color?: "primary" | "green";
}

const COLOR_CLASSES = {
  primary: { active: "bg-primary text-white", hover: "hover:bg-primary/10" },
  green: { active: "bg-green-600 text-white", hover: "hover:bg-green-100" },
} as const;

const OPTIONS: { key: ProfitMethod; defaultLabel: string }[] = [
  { key: "auto", defaultLabel: "自動" },
  { key: "c1", defaultLabel: "直前" },
  { key: "c2", defaultLabel: "2年平均" },
];

/** 利益計算方法の3択ボタン（c / c1 / c2） */
export function ProfitMethodSelector({
  label,
  value,
  onChange,
  c1Label,
  c2Label,
  hint = "(自動: 低いほう)",
  color = "primary",
}: ProfitMethodSelectorProps) {
  const cls = COLOR_CLASSES[color];

  const labels: Record<ProfitMethod, string> = {
    auto: "自動",
    c1: c1Label ?? "直前",
    c2: c2Label ?? "2年平均",
  };

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground w-[80px]">{label}</span>
      <div className="flex gap-2 flex-1" role="radiogroup" aria-label={label}>
        {OPTIONS.map(({ key }) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={value === key}
            onClick={() => onChange(key)}
            className={`px-3 py-1 text-xs rounded transition-colors min-w-[60px] ${
              value === key
                ? cls.active
                : `bg-white text-muted-foreground ${cls.hover}`
            }`}
          >
            {labels[key]}
          </button>
        ))}
      </div>
      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
        {hint}
      </span>
    </div>
  );
}
