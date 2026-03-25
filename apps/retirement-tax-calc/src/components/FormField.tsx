import { useId } from "react";

type FormFieldProps = {
    label: string;
    htmlFor?: string;
    children: React.ReactNode;
};

const FormField = ({ label, htmlFor, children }: FormFieldProps) => {
    const autoId = useId();
    const labelId = htmlFor ? undefined : `${autoId}-label`;

    return htmlFor ? (
        <div className="input-item">
            <label htmlFor={htmlFor}>{label}</label>
            {children}
        </div>
    ) : (
        <div className="input-item" role="group" aria-labelledby={labelId}>
            <label id={labelId}>{label}</label>
            {children}
        </div>
    );
};

export default FormField;
