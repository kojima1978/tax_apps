import { useState } from 'react';
import { NumericFormat } from 'react-number-format';
import { UserPlus, Trash2, ArrowUpDown, Check } from 'lucide-react';
import { Investor } from '@/lib/types';
import { smallButtonStyle, buttonHoverClass } from '@/lib/button-styles';

type Props = {
    investors: Investor[];
    updateInvestor: (index: number, field: keyof Investor, value: string | number) => void;
    addInvestorRow: () => void;
    removeInvestorRow: (index: number) => void;
    reorderInvestors: (newOrder: Investor[]) => void;
    totalInvestment: number;
};

export default function Step3Investors({
    investors,
    updateInvestor,
    addInvestorRow,
    removeInvestorRow,
    reorderInvestors,
    totalInvestment,
}: Props) {
    const [isReorderMode, setIsReorderMode] = useState(false);
    const [tempInvestors, setTempInvestors] = useState<Investor[]>([]);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    const handleStartReorder = () => {
        setTempInvestors([...investors]);
        setIsReorderMode(true);
    };

    const handleConfirmReorder = () => {
        reorderInvestors(tempInvestors);
        setIsReorderMode(false);
        setTempInvestors([]);
    };

    const handleCancelReorder = () => {
        setIsReorderMode(false);
        setTempInvestors([]);
    };

    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;

        const newInvestors = [...tempInvestors];
        const draggedItem = newInvestors[draggedIndex];
        newInvestors.splice(draggedIndex, 1);
        newInvestors.splice(index, 0, draggedItem);

        setTempInvestors(newInvestors);
        setDraggedIndex(index);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    const displayInvestors = isReorderMode ? tempInvestors : investors;

    return (
        <div className="card">
            <div className="flex items-center justify-between mb-4">
                <h2 className="mt-0 mb-0">STEP3．出資者名簿より出資者情報を入力【単位:円】</h2>
                <div className="flex gap-2">
                    {isReorderMode ? (
                        <>
                            <button
                                className={buttonHoverClass}
                                style={smallButtonStyle}
                                onClick={handleCancelReorder}
                            >
                                キャンセル
                            </button>
                            <button
                                className={buttonHoverClass}
                                style={smallButtonStyle}
                                onClick={handleConfirmReorder}
                            >
                                <Check size={16} />
                                確定
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                className={buttonHoverClass}
                                style={smallButtonStyle}
                                onClick={handleStartReorder}
                            >
                                <ArrowUpDown size={16} />
                                並び替え
                            </button>
                            <button
                                className={buttonHoverClass}
                                style={smallButtonStyle}
                                onClick={addInvestorRow}
                            >
                                <UserPlus size={16} />
                                出資者を追加
                            </button>
                        </>
                    )}
                </div>
            </div>
            <table>
                <thead>
                    <tr>
                        <th className="text-center w-16">№</th>
                        <th className="text-left">出資者名</th>
                        <th className="text-right">出資金額</th>
                        <th className="text-center w-24">操作</th>
                    </tr>
                </thead>
                <tbody>
                    {displayInvestors.map((investor, index) => (
                        <tr
                            key={index}
                            draggable={isReorderMode}
                            onDragStart={() => handleDragStart(index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDragEnd={handleDragEnd}
                            className={isReorderMode ? 'cursor-move hover:bg-blue-50' : ''}
                            style={{
                                opacity: draggedIndex === index ? 0.5 : 1,
                                backgroundColor: isReorderMode ? '#f9fafb' : 'transparent',
                            }}
                        >
                            <td className="text-center">{index + 1}</td>
                            <td>
                                {isReorderMode ? (
                                    <div className="px-3 py-2">{investor.name || '（未入力）'}</div>
                                ) : (
                                    <input
                                        type="text"
                                        value={investor.name}
                                        onChange={(e) => updateInvestor(index, 'name', e.target.value)}
                                    />
                                )}
                            </td>
                            <td className="text-right">
                                {isReorderMode ? (
                                    <div className="px-3 py-2">{(investor.amount || 0).toLocaleString('ja-JP')}</div>
                                ) : (
                                    <NumericFormat
                                        className="w-full px-3 py-2 text-right border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        value={investor.amount || ''}
                                        onValueChange={(values) =>
                                            updateInvestor(index, 'amount', values.floatValue || 0)
                                        }
                                        thousandSeparator={true}
                                    />
                                )}
                            </td>
                            <td className="text-center">
                                {isReorderMode ? (
                                    <div className="text-gray-400 text-sm">ドラッグして移動</div>
                                ) : (
                                    <button
                                        className={buttonHoverClass}
                                        style={{
                                            ...smallButtonStyle,
                                            padding: '0.5rem 1rem',
                                            fontSize: '0.875rem',
                                        }}
                                        onClick={() => removeInvestorRow(index)}
                                    >
                                        <Trash2 size={16} />
                                        削除
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr className="bg-gray-100 font-bold">
                        <td className="text-center">合計</td>
                        <td></td>
                        <td className="text-right">{totalInvestment.toLocaleString('ja-JP')}</td>
                        <td></td>
                    </tr>
                </tfoot>
            </table>

            <p className="text-sm text-gray-600 mt-4">
                ※ 出資金額の合計は、貸借対照表の出資金（資本金）と一致させてください。
            </p>
        </div>
    );
}
