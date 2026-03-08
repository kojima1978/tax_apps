import { taxReturnData } from '@/data/taxReturnData';
import { formatReiwaYear } from '@/utils/date';

interface PrintHeaderProps {
  year: number;
  customerName: string;
  staffName: string;
  staffMobile?: string | null;
}

export function PrintHeader({ year, customerName, staffName, staffMobile }: PrintHeaderProps) {
  const reiwaYearStr = formatReiwaYear(year);

  return (
    <div className="hidden print:block border-b-2 border-slate-800 pb-2 mb-6 pt-8">
      <div className="flex justify-between items-end">
        <div className="flex flex-col">
          <div className="text-left mb-0.5">
            <p className="text-xs">対象年度: <span className="font-bold text-sm">{reiwaYearStr}分</span></p>
          </div>
          <h1 className="text-2xl font-bold mb-1">確定申告 必要書類確認リスト</h1>
          <div className="flex items-end gap-2 mb-1">
            <p className="text-sm pb-1">お客様名:</p>
            <p className="text-xl font-bold underline decoration-slate-400 underline-offset-4">{customerName} 様</p>
          </div>
        </div>

        <div className="text-right text-xs text-slate-600 mb-1">
          <p className="font-bold text-sm text-slate-800">{taxReturnData.contactInfo.office}</p>
          <p>{taxReturnData.contactInfo.address}</p>
          <p>TEL: {taxReturnData.contactInfo.tel}</p>
          {staffMobile && (
            <p>携帯: {staffMobile}</p>
          )}
          <p className="mt-1 text-sm text-slate-800">担当者: <span className="font-bold">{staffName}</span></p>
        </div>
      </div>
    </div>
  );
}
