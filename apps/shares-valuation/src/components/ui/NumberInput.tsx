"use client";

import * as React from "react";
import { NumericFormat } from "react-number-format";
import { cn } from "@/lib/utils";

interface NumberInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "type"
> {
  onChange: (e: { target: { name: string; value: string } }) => void;
}

export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  (
    { value, onChange, name, className, disabled, placeholder, required, id },
    ref,
  ) => (
    <NumericFormat
      getInputRef={ref}
      id={id}
      name={name}
      value={value as string}
      onValueChange={(values) => {
        onChange({
          target: {
            name: name || "",
            value: values.value,
          },
        });
      }}
      thousandSeparator=","
      allowNegative={true}
      decimalScale={0}
      disabled={disabled}
      placeholder={placeholder}
      required={required}
      className={cn(
        "flex h-11 w-full rounded-xl border-2 border-input bg-background px-3 py-2 text-sm ring-offset-background",
        "placeholder:text-muted-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "text-right",
        className,
      )}
    />
  ),
);

NumberInput.displayName = "NumberInput";
