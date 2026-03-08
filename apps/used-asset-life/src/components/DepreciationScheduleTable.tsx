import { useRef, useEffect, useCallback, useState } from "react";
import { type DepreciationYearRow } from "@/lib/depreciation";
import { formatCurrency } from "@/lib/utils";

type DepreciationScheduleTableProps = {
    rows: DepreciationYearRow[];
};

const getRowMemo = (memo: string, endingBookValue: number): string => {
    if (memo.includes('改定')) return '改定償却率切替';
    if (memo.includes('限度額')) return '95%限度額到達';
    if (endingBookValue === 1) return '備忘価額1円';
    return '';
};

const getRowClassName = (memo: string, endingBookValue: number): string => {
    if (memo.includes('改定')) return 'bg-blue-50';
    if (memo.includes('限度額')) return 'bg-orange-50';
    if (endingBookValue === 1) return 'bg-green-50';
    return '';
};

const DepreciationScheduleTable = ({ rows }: DepreciationScheduleTableProps) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [hasScroll, setHasScroll] = useState(false);

    const checkScroll = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        setHasScroll(el.scrollWidth > el.clientWidth + 1);
    }, []);

    useEffect(() => {
        checkScroll();
        window.addEventListener('resize', checkScroll);
        return () => window.removeEventListener('resize', checkScroll);
    }, [checkScroll, rows]);

    return (
        <>
            <div
                ref={scrollRef}
                className={`table-scroll-wrapper overflow-x-auto mb-4${hasScroll ? ' has-scroll' : ''}`}
                onScroll={checkScroll}
            >
                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr className="bg-green-800 text-white">
                            <th className="px-2 py-2 text-center whitespace-nowrap">期</th>
                            <th className="px-2 py-2 text-center whitespace-nowrap">会計期間</th>
                            <th className="px-2 py-2 text-right whitespace-nowrap">期首帳簿価額</th>
                            <th className="px-2 py-2 text-right whitespace-nowrap">償却額</th>
                            <th className="px-2 py-2 text-right whitespace-nowrap">期末帳簿価額</th>
                            <th className="px-2 py-2 text-left whitespace-nowrap hidden sm:table-cell">備考</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => {
                            const tooltip = getRowMemo(row.memo, row.endingBookValue);
                            return (
                                <tr
                                    key={row.year}
                                    className={`border-b border-gray-100 ${getRowClassName(row.memo, row.endingBookValue)}`}
                                    title={tooltip || undefined}
                                >
                                    <td className="px-2 py-1.5 text-center font-mono-num">{row.year}</td>
                                    <td className="px-2 py-1.5 text-center text-xs whitespace-nowrap">{row.periodLabel}</td>
                                    <td className="px-2 py-1.5 text-right font-mono-num">{formatCurrency(row.beginningBookValue)}</td>
                                    <td className="px-2 py-1.5 text-right font-mono-num">{formatCurrency(row.depreciation)}</td>
                                    <td className="px-2 py-1.5 text-right font-mono-num font-bold">{formatCurrency(row.endingBookValue)}</td>
                                    <td className="px-2 py-1.5 text-xs text-gray-500 hidden sm:table-cell">{row.memo}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* モバイル: 備考が非表示の場合の凡例 */}
            <div className="flex flex-wrap gap-2 mb-4 sm:hidden text-xs">
                <span className="px-2 py-0.5 bg-blue-50 border border-blue-200 rounded">改定償却率切替</span>
                <span className="px-2 py-0.5 bg-orange-50 border border-orange-200 rounded">95%限度額到達</span>
                <span className="px-2 py-0.5 bg-green-50 border border-green-200 rounded">備忘価額1円</span>
            </div>
        </>
    );
};

export default DepreciationScheduleTable;
