import { useRef, useEffect, useCallback, useState } from "react";
import { type DepreciationYearRow } from "@/lib/depreciation";
import { formatCurrency } from "@/lib/utils";

type DepreciationScheduleTableProps = {
    rows: DepreciationYearRow[];
};

const ROW_HIGHLIGHTS = [
    { match: (memo: string) => memo.includes('改定'), bg: 'bg-blue-50', border: 'border-blue-200', barColor: 'bg-blue-500', label: '改定償却率切替' },
    { match: (memo: string) => memo.includes('限度額'), bg: 'bg-orange-50', border: 'border-orange-200', barColor: 'bg-orange-500', label: '95%限度額到達' },
    { match: (_memo: string, bv: number) => bv === 1, bg: 'bg-green-50', border: 'border-green-200', barColor: 'bg-green-600', label: '備忘価額1円' },
] as const;

const getRowHighlight = (memo: string, endingBookValue: number) =>
    ROW_HIGHLIGHTS.find(h => h.match(memo, endingBookValue));

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
                            const highlight = getRowHighlight(row.memo, row.endingBookValue);
                            return (
                                <tr
                                    key={row.year}
                                    className={`border-b border-gray-100 ${highlight?.bg ?? ''}`}
                                    title={highlight?.label}
                                >
                                    <td className={`px-2 py-1.5 text-center font-mono-num ${highlight ? `border-l-3 ${highlight.barColor.replace('bg-', 'border-')}` : ''}`}>{row.year}</td>
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
                {ROW_HIGHLIGHTS.map(({ bg, border, barColor, label }) => (
                    <span key={label} className={`px-2 py-0.5 ${bg} border ${border} rounded flex items-center gap-1.5`}>
                        <span className={`w-1 h-3 rounded-full ${barColor}`} />
                        {label}
                    </span>
                ))}
            </div>
        </>
    );
};

export default DepreciationScheduleTable;
