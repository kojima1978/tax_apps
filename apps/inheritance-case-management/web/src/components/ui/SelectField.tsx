import * as React from "react";
import { cn } from "@/lib/utils";

type SelectFieldProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
    wrapperClassName?: string;
};

const SelectField = React.forwardRef<HTMLSelectElement, SelectFieldProps>(
    ({ className, wrapperClassName, children, ...props }, ref) => {
        return (
            <div className={cn(
                "flex h-11 w-full rounded-xl border-2 border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
                wrapperClassName,
            )}>
                <select
                    ref={ref}
                    className={cn("w-full bg-transparent outline-none", className)}
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
