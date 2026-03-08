type FormFieldProps = {
    label: string;
    htmlFor?: string;
    children: React.ReactNode;
};

const FormField = ({ label, htmlFor, children }: FormFieldProps) => (
    <div className="flex flex-col">
        <label htmlFor={htmlFor} className="font-bold mb-1.5 text-green-800 text-sm">{label}</label>
        {children}
    </div>
);

export default FormField;
