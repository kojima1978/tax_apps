type FormFieldProps = {
    label: string;
    htmlFor?: string;
    children: React.ReactNode;
};

const FormField = ({ label, htmlFor, children }: FormFieldProps) => (
    <div className="input-item">
        <label htmlFor={htmlFor}>{label}</label>
        {children}
    </div>
);

export default FormField;
