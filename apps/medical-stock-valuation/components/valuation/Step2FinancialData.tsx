import { useState, type ReactNode } from 'react';
import { NumericFormat } from 'react-number-format';
import { ListChecks, Copy } from 'lucide-react';
import { INLINE_BTN } from '@/lib/button-styles';

const NUMERIC_INPUT_CLASS = 'w-full px-3 py-2 text-right border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';

function InfoPopup({ id, activePopup, setActivePopup, children }: {
    id: 1 | 2;
    activePopup: 1 | 2 | null;
    setActivePopup: (v: 1 | 2 | null) => void;
    children: ReactNode;
}) {
    return (
        <>
            <button
                className={INLINE_BTN}
                onClick={() => setActivePopup(activePopup === id ? null : id)}
            >
                <ListChecks size={14} />
                正確な評価
            </button>
            {activePopup === id && (
                <div className="absolute bg-white border border-gray-300 p-4 rounded-lg mt-2 text-sm max-w-md shadow-lg z-10">
                    <button
                        type="button"
                        className="absolute top-2 right-3 text-gray-500 hover:text-gray-700 font-bold text-xl"
                        onClick={() => setActivePopup(null)}
                    >
                        ×
                    </button>
                    {children}
                </div>
            )}
        </>
    );
}

function DisabledCell() {
    return (
        <td className="text-right bg-gray-100">
            <input type="number" className="w-full px-3 py-2 bg-gray-100 text-gray-400 cursor-not-allowed rounded-lg" disabled />
        </td>
    );
}

type Props = {
    currentPeriodNetAsset: string;
    setCurrentPeriodNetAsset: (value: string) => void;
    previousPeriodNetAsset: string;
    setPreviousPeriodNetAsset: (value: string) => void;
    netAssetTaxValue: string;
    setNetAssetTaxValue: (value: string) => void;
    currentPeriodProfit: string;
    setCurrentPeriodProfit: (value: string) => void;
    previousPeriodProfit: string;
    setPreviousPeriodProfit: (value: string) => void;
    previousPreviousPeriodProfit: string;
    setPreviousPreviousPeriodProfit: (value: string) => void;
    copyToTaxValue: () => void;
};

export default function Step2FinancialData({
    currentPeriodNetAsset,
    setCurrentPeriodNetAsset,
    previousPeriodNetAsset,
    setPreviousPeriodNetAsset,
    netAssetTaxValue,
    setNetAssetTaxValue,
    currentPeriodProfit,
    setCurrentPeriodProfit,
    previousPeriodProfit,
    setPreviousPeriodProfit,
    previousPreviousPeriodProfit,
    setPreviousPreviousPeriodProfit,
    copyToTaxValue,
}: Props) {
    const [activePopup, setActivePopup] = useState<1 | 2 | null>(null);

    return (
        <div className="card">
            <h2 className="mt-0">STEP2．決算書より医療法人の財務データを入力【単位:円】</h2>
            <table>
                <thead>
                    <tr>
                        <th className="text-left">項目</th>
                        <th className="text-center">直前期</th>
                        <th className="text-center">直前々期</th>
                        <th className="text-center">直前々々期</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            「貸借対照表」の「純資産の部（又は資本の部）合計」の金額（注１）
                            <InfoPopup id={1} activePopup={activePopup} setActivePopup={setActivePopup}>
                                <p className="text-gray-700">
                                    もしくは法人税申告書の別表五(一)上、「Ⅰ利益積立金額」及び「Ⅱ資本金等の額」の各「差引翌期首現在」列「差引合計額」行の合計額
                                </p>
                            </InfoPopup>
                        </td>
                        <td className="text-right">
                            <NumericFormat
                                className={NUMERIC_INPUT_CLASS}
                                value={currentPeriodNetAsset}
                                onValueChange={(values) => setCurrentPeriodNetAsset(values.value)}
                                thousandSeparator={true}
                                allowNegative={true}
                            />
                        </td>
                        <td className="text-right">
                            <NumericFormat
                                className={NUMERIC_INPUT_CLASS}
                                value={previousPeriodNetAsset}
                                onValueChange={(values) => setPreviousPeriodNetAsset(values.value)}
                                thousandSeparator={true}
                                allowNegative={true}
                            />
                        </td>
                        <DisabledCell />
                    </tr>
                    <tr>
                        <td>
                            貸借対照表の各勘定科目の金額について、相続税評価額とした金額を基に計算した「純資産」の金額を上書き入力してください。
                            <button
                                className={INLINE_BTN}
                                onClick={copyToTaxValue}
                            >
                                <Copy size={14} />
                                複写
                            </button>
                        </td>
                        <td className="text-right">
                            <NumericFormat
                                className={NUMERIC_INPUT_CLASS}
                                value={netAssetTaxValue}
                                onValueChange={(values) => setNetAssetTaxValue(values.value)}
                                thousandSeparator={true}
                                allowNegative={true}
                            />
                        </td>
                        <DisabledCell />
                        <DisabledCell />
                    </tr>
                    <tr>
                        <td>
                            「損益計算書」の「税引前当期純利益」の金額
                            <InfoPopup id={2} activePopup={activePopup} setActivePopup={setActivePopup}>
                                <p className="text-gray-700 mb-2">
                                    もしくは法人税申告書上の「所得金額」に下記の金額を加減算した金額を入力してください。
                                </p>
                                <ul className="list-disc ml-5 text-gray-700 space-y-1">
                                    <li>受取配当等の益金不算入の金額は加算</li>
                                    <li>繰越欠損金のうち損金算入した金額は加算</li>
                                    <li>非経常的な利益の金額は減算</li>
                                </ul>
                            </InfoPopup>
                        </td>
                        <td className="text-right">
                            <NumericFormat
                                className={NUMERIC_INPUT_CLASS}
                                value={currentPeriodProfit}
                                onValueChange={(values) => setCurrentPeriodProfit(values.value)}
                                thousandSeparator={true}
                                allowNegative={true}
                            />
                        </td>
                        <td className="text-right">
                            <NumericFormat
                                className={NUMERIC_INPUT_CLASS}
                                value={previousPeriodProfit}
                                onValueChange={(values) => setPreviousPeriodProfit(values.value)}
                                thousandSeparator={true}
                                allowNegative={true}
                            />
                        </td>
                        <td className="text-right">
                            <NumericFormat
                                className={NUMERIC_INPUT_CLASS}
                                value={previousPreviousPeriodProfit}
                                onValueChange={(values) => setPreviousPreviousPeriodProfit(values.value)}
                                thousandSeparator={true}
                                allowNegative={true}
                            />
                        </td>
                    </tr>
                </tbody>
            </table>

            <p className="text-sm text-gray-600 mt-4">
                （注１）「貸借対照表」の「純資産の部（又は資本の部）合計」の金額に、賞与引当金、退職給付引当金等の税務上損金にならない金額を加算、圧縮積立金、圧縮引当金等の金額を減算した金額を使用するとより正確な試算が可能となります。
            </p>
        </div>
    );
}
