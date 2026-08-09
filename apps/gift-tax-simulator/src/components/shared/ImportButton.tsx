import { useState, useEffect } from 'react';
import Copy from 'lucide-react/icons/copy';
import Check from 'lucide-react/icons/check';
import {
    hasImportableField,
    loadRealEstateInputs,
    PAGE_LABEL,
    type ImportField,
    type PageKey,
} from '@/lib/real-estate-input-storage';

type Props = {
    sourcePage: PageKey;
    field: ImportField;
    onImport: () => void;
};

const FIELD_LABEL: Record<ImportField, string> = {
    land: '土地',
    building: '建物',
};

const ImportButton = ({ sourcePage, field, onImport }: Props) => {
    const [hasData, setHasData] = useState(false);
    const [imported, setImported] = useState(false);

    useEffect(() => {
        setHasData(hasImportableField(loadRealEstateInputs(sourcePage), field));
    }, [sourcePage, field]);

    if (!hasData) return null;

    const handleClick = () => {
        onImport();
        setImported(true);
        setTimeout(() => setImported(false), 2000);
    };

    return (
        <button className="btn-import" onClick={handleClick} disabled={imported}>
            {imported ? <Check size={16} /> : <Copy size={16} />}
            {imported ? '引用しました' : `${PAGE_LABEL[sourcePage]}の${FIELD_LABEL[field]}の入力を引用`}
        </button>
    );
};

export default ImportButton;
