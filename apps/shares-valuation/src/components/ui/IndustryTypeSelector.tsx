"use client";

import { type IndustryType } from "@/lib/valuation-logic";

interface IndustryTypeSelectorProps {
  value: IndustryType;
  onChange: (type: IndustryType) => void;
}

const INDUSTRY_OPTIONS: { type: IndustryType; label: string }[] = [
  { type: "Wholesale", label: "卸売業" },
  { type: "RetailService", label: "小売・サービス業" },
  { type: "MedicalCorporation", label: "医療法人" },
  { type: "Other", label: "それ以外" },
];

/** 業種区分4択ボタン（卸売/小売サービス/医療法人/その他） */
export function IndustryTypeSelector({ value, onChange }: IndustryTypeSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="業種区分">
      {INDUSTRY_OPTIONS.map(({ type, label }) => (
        <button
          key={type}
          type="button"
          role="radio"
          aria-checked={value === type}
          onClick={() => onChange(type)}
          className={`p-3 rounded-lg border-2 transition-colors font-bold ${
            value === type
              ? "border-primary bg-white text-primary shadow-sm"
              : "border-transparent bg-white/50 text-muted-foreground hover:bg-white hover:text-primary"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
