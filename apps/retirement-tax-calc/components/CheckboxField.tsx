type CheckboxFieldProps = {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label: string;
    description: string;
};

const CheckboxField = ({ checked, onChange, label, description }: CheckboxFieldProps) => (
    <div className="input-item checkbox-item">
        <label className="checkbox-label">
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
            />
            <span>{label}</span>
        </label>
        <small>{description}</small>
    </div>
);

export default CheckboxField;
