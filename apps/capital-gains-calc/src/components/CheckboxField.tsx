import { useId } from "react";

type CheckboxFieldProps = {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    hint?: string;
    disabled?: boolean;
};

const CheckboxField = ({ label, checked, onChange, hint, disabled }: CheckboxFieldProps) => {
    const id = useId();

    return (
        <div className="checkbox-item">
            <label className="checkbox-label" htmlFor={id}>
                <input
                    type="checkbox"
                    id={id}
                    checked={checked}
                    disabled={disabled}
                    onChange={(e) => onChange(e.target.checked)}
                />
                <span>{label}</span>
            </label>
            {hint && <small>{hint}</small>}
        </div>
    );
};

export default CheckboxField;
