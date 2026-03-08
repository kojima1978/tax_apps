import { formatDate, formatReiwaYear } from '@/utils/date';

interface PrintFooterProps {
  year: number;
}

export function PrintFooter({ year }: PrintFooterProps) {
  const reiwaYearStr = formatReiwaYear(year);
  const currentDate = formatDate();

  return (
    <div className="hidden print:block mt-8 pt-8 border-t border-slate-800 text-center text-xs">
      <div className="flex justify-between items-end">
        <div className="text-left">
          <p>※ このリストは{reiwaYearStr}分の確定申告に必要な書類の目安です。</p>
          <p>※ 個別の事情により、追加の書類が必要になる場合があります。</p>
        </div>
        <div className="text-right">
          <p>作成日: {currentDate}</p>
        </div>
      </div>
    </div>
  );
}
