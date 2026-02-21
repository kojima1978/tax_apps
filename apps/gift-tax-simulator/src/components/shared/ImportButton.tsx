import { useState, useEffect } from 'react';
import Copy from 'lucide-react/icons/copy';
import Check from 'lucide-react/icons/check';
import { loadValuations } from '@/lib/valuation-storage';

type Props = {
    sourceLabel: string;
    sourcePage: 'acquisition-tax' | 'registration-tax';
    onImport: () => void;
};

const ImportButton = ({ sourceLabel, sourcePage, onImport }: Props) => {
    const [hasData, setHasData] = useState(false);
    const [imported, setImported] = useState(false);

    useEffect(() => {
        const data = loadValuations(sourcePage);
        setHasData(!!data && !!(data.landValuation || data.buildingValuation));
    }, [sourcePage]);

    if (!hasData) return null;

    const handleClick = () => {
        onImport();
        setImported(true);
        setTimeout(() => setImported(false), 2000);
    };

    return (
        <div className="import-bar no-print">
            <button className="btn-import" onClick={handleClick} disabled={imported}>
                {imported ? <Check size={16} /> : <Copy size={16} />}
                {imported ? '引用しました' : `${sourceLabel}の評価額を引用`}
            </button>
        </div>
    );
};

export default ImportButton;
