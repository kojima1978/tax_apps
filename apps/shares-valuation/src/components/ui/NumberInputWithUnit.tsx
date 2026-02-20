import { NumberInput } from "./NumberInput";

interface NumberInputWithUnitProps {
  id?: string;
  name: string;
  value: string;
  onChange: (e: { target: { name: string; value: string } }) => void;
  unit: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

/** NumberInput + 右端の単位ラベル（千円・円・株・人 等）をまとめたコンポーネント */
export function NumberInputWithUnit({
  id,
  name,
  value,
  onChange,
  unit,
  placeholder = "0",
  required,
  disabled,
  className,
}: NumberInputWithUnitProps) {
  const unitWidth = unit.length <= 1 ? "pr-8" : "pr-12";
  const unitRight = unit.length <= 1 ? "right-2" : "right-3";

  return (
    <div className="relative">
      <NumberInput
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={`${unitWidth} text-right ${disabled ? "bg-gray-100 cursor-not-allowed" : ""} ${className ?? ""}`}
      />
      <span className={`absolute ${unitRight} top-2.5 text-xs text-muted-foreground`}>
        {unit}
      </span>
    </div>
  );
}
