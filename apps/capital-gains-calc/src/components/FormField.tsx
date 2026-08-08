import { useId } from "react";

type FormFieldProps = {
    label: string;
    htmlFor?: string;
    /** ラベルの隣に並べる要素（自動計算ボタンなど）。無い場合はラベルをそのまま置く */
    labelAction?: React.ReactNode;
    children: React.ReactNode;
};

const FormField = ({ label, htmlFor, labelAction, children }: FormFieldProps) => {
    const autoId = useId();
    const labelId = htmlFor ? undefined : `${autoId}-label`;

    const labelNode = htmlFor ? (
        <label htmlFor={htmlFor}>{label}</label>
    ) : (
        <label id={labelId}>{label}</label>
    );

    const head = labelAction ? (
        <div className="field-label-row">
            {labelNode}
            {labelAction}
        </div>
    ) : (
        labelNode
    );

    return htmlFor ? (
        <div className="input-item">
            {head}
            {children}
        </div>
    ) : (
        <div className="input-item" role="group" aria-labelledby={labelId}>
            {head}
            {children}
        </div>
    );
};

export default FormField;
