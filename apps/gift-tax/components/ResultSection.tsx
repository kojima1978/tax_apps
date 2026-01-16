"use client";

import React from 'react';
import TaxTable from './TaxTable';
import TaxChart from './TaxChart';
import { CalculationResult } from '@/lib/tax-calculation';

type Props = {
    results: CalculationResult[] | null;
};

const ResultSection: React.FC<Props> = ({ results }) => {
    if (!results) {
        return null;
    }

    return (
        <div className="result-section">
            <TaxTable results={results} />
            <TaxChart results={results} />

            <p style={{ textAlign: 'right', fontSize: '0.8rem', color: '#666', marginTop: '1rem' }}>
                ※基礎控除110万円を含んで計算しています。<br />
                ※税額は国税庁の速算表に基づきます。実際の納税額と端数処理等で異なる場合があります。
            </p>
        </div>
    );
};

export default ResultSection;
