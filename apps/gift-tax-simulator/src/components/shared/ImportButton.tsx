import { useState, useEffect } from 'react';
import Copy from 'lucide-react/icons/copy';
import Check from 'lucide-react/icons/check';
import { loadValuations } from '@/lib/valuation-storage';

type Props = {
    sourceLabel: string;
    sourcePage: 'acquisition-tax' | 'registration-tax';
    field: 'land' | 'building';
    onImport: () => void;
};

const FIELD_LABEL: Record<Props['field'], string> = {
    land: '土地',
    building: '建物',
};

const ImportButton = ({ sourceLabel, sourcePage, field, onImport }: Props) => {
    const [hasData, setHasData] = useState(false);
    const [imported, setImported] = useState(false);

    useEffect(() => {
        const data = loadValuations(sourcePage);
        const key = field === 'land' ? 'landValuation' : 'buildingValuation';
        setHasData(!!data && !!data[key]);
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
            {imported ? '引用しました' : `${sourceLabel}の${FIELD_LABEL[field]}評価額を引用`}
        </button>
    );
};

export default ImportButton;
