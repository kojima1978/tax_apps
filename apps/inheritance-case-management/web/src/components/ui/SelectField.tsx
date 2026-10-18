import * as React from "react";
import { cn } from "@/lib/utils";

type SelectFieldProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
    wrapperClassName?: string;
};

const SelectField = React.forwardRef<HTMLSelectElement, SelectFieldProps>(
    ({ className, wrapperClassName, children, ...props }, ref) => {
        return (
            <div className={cn(
                "select-field flex h-11 w-full items-center rounded-lg border-2 border-input bg-background px-3 py-0 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 sm:h-10",
                wrapperClassName,
            )}>
                <select
                    ref={ref}
                    className={cn("h-full min-h-0 min-w-0 w-full bg-transparent py-0 outline-none", className)}
                    {...props}
                >
                    {children}
                </select>
            </div>
        );
    },
);
SelectField.displayName = "SelectField";

export { SelectField };
