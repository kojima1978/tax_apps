import { Label } from "./Label";
import { NumberInputWithUnit } from "./NumberInputWithUnit";

interface PeriodField {
  name: string;
  label: string;
  value: string;
}

interface PeriodInputPairProps {
  periodLabel: string;
  left: PeriodField;
  right: PeriodField;
  onChange: (e: { target: { name: string; value: string } }) => void;
  unit?: string;
  required?: boolean;
  disabled?: boolean;
}

/** 期間ラベル + 2列NumberInputWithUnit（利益/欠損金、資本金/剰余金）共通パターン */
export function PeriodInputPair({
  periodLabel,
  left,
  right,
  onChange,
  unit = "千円",
  required,
  disabled,
}: PeriodInputPairProps) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-bold">{periodLabel}</Label>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor={left.name} className="text-[10px] text-muted-foreground">
            {left.label}
          </Label>
          <NumberInputWithUnit
            id={left.name}
            name={left.name}
            value={left.value}
            onChange={onChange}
            unit={unit}
            required={required}
            disabled={disabled}
            className="bg-white"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={right.name} className="text-[10px] text-muted-foreground">
            {right.label}
          </Label>
          <NumberInputWithUnit
            id={right.name}
            name={right.name}
            value={right.value}
            onChange={onChange}
            unit={unit}
            required={required}
            disabled={disabled}
            className="bg-white"
          />
        </div>
      </div>
    </div>
  );
}
