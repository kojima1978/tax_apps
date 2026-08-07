import { useId } from "react";
import FormField from "./FormField";

type DateFieldProps = {
    label: string;
    value: string;
    onChange: (value: string) => void;
    hint?: string;
};

const DateField = ({ label, value, onChange, hint }: DateFieldProps) => {
    const id = useId();

    return (
        <FormField label={label} htmlFor={id}>
            <input
                type="date"
                id={id}
                className="date-input"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
            {hint && <small>{hint}</small>}
        </FormField>
    );
};

export default DateField;
