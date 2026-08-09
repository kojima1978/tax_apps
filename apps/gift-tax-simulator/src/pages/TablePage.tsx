import { useState, useMemo } from 'react';
import { calcTaxOneTime, type GiftType } from '@/lib/tax-calculation';
import QuickRefTable, { type QuickRefRow } from '@/components/QuickRefTable';
import PageLayout from '@/components/PageLayout';

const UNIT = 1_000_000; // 100万円

// 3,000万円（1表30行）はA4横1枚に等倍で収まらないため上限は2,000万円まで
const LIMIT_OPTIONS = [
    { value: 10_000_000, label: '1,000万円' },
    { value: 20_000_000, label: '2,000万円' },
] as const;

const TAX_NOTES = {
    special: '贈与により財産を取得した者（贈与を受けた年の1月1日において18歳以上の者に限ります。）が、直系尊属（父母や祖父母など）から贈与により取得した財産に係る贈与税の計算に使用します。',
    general: '特例贈与以外の贈与（兄弟間、夫婦間、親から未成年の子への贈与など）に使用します。',
} as const;

// 相談で使う頻度が高い金額。早見表で行ごと強調する
const KEY_AMOUNTS = new Set([3_000_000, 5_000_000, 10_000_000]);

const generateTableData = (maxAmount: number, type: GiftType): QuickRefRow[] => {
    const rows: QuickRefRow[] = [];
    for (let amount = UNIT; amount <= maxAmount; amount += UNIT) {
        const tax = calcTaxOneTime(amount, type);
        rows.push({
            amount,
            tax,
            rate: amount > 0 ? tax / amount : 0,
            keyAmount: KEY_AMOUNTS.has(amount),
        });
    }
    return rows;
};

export default function TablePage() {
    const [maxAmount, setMaxAmount] = useState<number>(10_000_000);

    const specialData = useMemo(() => generateTableData(maxAmount, 'special'), [maxAmount]);
    const generalData = useMemo(() => generateTableData(maxAmount, 'general'), [maxAmount]);

    return (
        <PageLayout className="table-page">
            <div className="input-section">
                <div className="input-group-row">
                    <div className="input-item">
                        <label htmlFor="maxAmount">表示上限</label>
                        <select
                            id="maxAmount"
                            value={maxAmount}
                            onChange={(e) => setMaxAmount(Number(e.target.value))}
                        >
                            {LIMIT_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="result-section">
                <p className="table-common-note">
                    ※基礎控除110万円を含んで計算しています。税額は国税庁の速算表に基づきます。
                </p>

                <QuickRefTable
                    title="特例贈与"
                    data={specialData}
                    note={TAX_NOTES.special}
                />

                <QuickRefTable
                    title="一般贈与"
                    data={generalData}
                    note={TAX_NOTES.general}
                />
            </div>
        </PageLayout>
    );
}
