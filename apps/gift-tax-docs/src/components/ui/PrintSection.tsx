import { Info, AlertCircle } from 'lucide-react';
import { COMPANY_INFO, giftData, type DocumentGroup } from '@/constants';

type PrintSectionProps = {
  results: DocumentGroup[];
  isTwoColumnPrint: boolean;
  currentDate: string;
  staffName: string;
  staffPhone: string;
  customerName: string;
};

export const PrintSection = ({
  results,
  isTwoColumnPrint,
  currentDate,
  staffName,
  staffPhone,
  customerName,
}: PrintSectionProps) => {
  const hasResults = results.length > 0 && results.some((g) => g.documents.length > 0);

  if (!hasResults) return null;

  /** 1列/2列で印刷クラスを切り替えるローカルヘルパー */
  const p = (oneCol: string, twoCol: string) => isTwoColumnPrint ? twoCol : oneCol;

  return (
    <div className="hidden print:block bg-white p-0">
      <div className={`border-b-2 border-slate-800 pb-6 mb-8 flex justify-between items-end ${p('print:pb-4 print:mb-6', 'print:pb-0 print:mb-2 print:border-b')}`}>
        <div>
          <h1 className={`text-3xl font-bold text-slate-900 mb-2 ${p('print:text-2xl print:mb-2', 'print:text-lg print:mb-0')}`}>
            {giftData.title}
          </h1>
          <div className={`text-slate-700 font-medium mb-2 ${p('print:text-base', 'print:text-xs')}`}>
            {customerName && <span className="mr-4">お客様名: {customerName}</span>}
            {staffName && <span>担当者: {staffName}</span>}
          </div>
          <p className={`text-slate-600 ${p('print:text-sm', 'print:text-[10px]')}`}>
            以下の書類をご準備の上、ご来所・ご郵送ください。
          </p>
        </div>
        <div className="text-right text-sm text-slate-500">
          <p>発行日: {currentDate}</p>
          <p>{COMPANY_INFO.name}</p>
        </div>
      </div>

      <div className={`space-y-8 print:block ${p('print:space-y-6', 'print:columns-2 print:gap-4 print:space-y-0')}`}>
        {results.map((group, idx) => (
          <div key={idx} className={`break-inside-avoid ${p('print:mb-6', 'print:mb-1')}`}>
            <h3 className={`font-bold text-lg mb-3 px-3 py-1 bg-emerald-50 border-l-4 border-emerald-500 text-slate-800 flex items-center ${p('print:mb-2 print:text-base print:py-1', 'print:mb-0.5 print:text-xs print:py-0 print:h-5')}`}>
              {group.category}
            </h3>
            <ul className="list-none pl-1 space-y-2 print:space-y-0">
              {group.documents.map((doc, docIdx) => (
                <li key={docIdx}>
                  <div
                    className={`flex items-start text-slate-700 py-1 border-b border-dashed border-slate-100 ${doc.subItems.length > 0 ? 'border-b-0' : ''} ${p('print:py-1', 'print:py-0.5')}`}
                  >
                    {doc.checked ? (
                      <span className={`inline-block w-4 h-4 mr-3 mt-1 border-2 border-slate-400 bg-slate-400 rounded-sm flex-shrink-0 text-white text-center leading-4 text-xs ${p('print:w-3 print:h-3 print:mt-1 print:mr-2 print:leading-3 print:text-[8px]', 'print:w-2 print:h-2 print:mt-0.5 print:mr-1 print:leading-2 print:text-[6px]')}`}>✓</span>
                    ) : (
                      <span className={`inline-block w-4 h-4 mr-3 mt-1 border-2 border-slate-400 rounded-sm flex-shrink-0 ${p('print:w-3 print:h-3 print:mt-1 print:mr-2', 'print:w-2 print:h-2 print:mt-0.5 print:mr-1')}`} />
                    )}
                    <span className={`${doc.checked ? 'line-through text-slate-400' : ''} ${p('print:text-sm', 'print:text-[10px] print:leading-tight')}`}>{doc.text}</span>
                  </div>
                  {doc.subItems.length > 0 && (
                    <ul className={`ml-7 space-y-1 pb-1 border-b border-dashed border-slate-100 ${p('print:ml-5 print:space-y-0', 'print:ml-3 print:space-y-0')}`}>
                      {doc.subItems.map((subItem, subIdx) => (
                        <li
                          key={subIdx}
                          className={`flex items-start text-slate-600 ${p('print:text-xs', 'print:text-[9px] print:leading-tight')}`}
                        >
                          <span className={`text-slate-400 mr-2 ${p('', 'print:mr-1')}`}>└</span>
                          <span>{subItem}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
            {group.note && (
              <p className={`mt-2 text-sm text-slate-500 bg-slate-50 p-2 rounded flex items-start ${p('print:mt-2 print:p-2 print:text-xs', 'print:mt-1 print:p-1 print:text-[10px]')}`}>
                <Info className={`w-4 h-4 mr-1 mt-0.5 flex-shrink-0 ${p('print:w-4 print:h-4', 'print:w-3 print:h-3')}`} aria-hidden="true" />
                {group.note}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className={`mt-12 pt-6 border-t border-slate-300 ${p('print:mt-8 print:pt-6', 'print:mt-2 print:pt-2 print:border-t')}`}>
        <div className={`flex items-start bg-slate-50 p-4 rounded-lg border border-slate-200 ${p('print:p-4', 'print:p-1')}`}>
          <AlertCircle className={`w-5 h-5 text-slate-500 mr-2 mt-0.5 flex-shrink-0 ${p('print:w-5 print:h-5', 'print:w-3 print:h-3')}`} aria-hidden="true" />
          <div className="text-sm text-slate-600 space-y-1">
            <p>
              <strong>ご留意事項</strong>
            </p>
            <p className={`text-red-600 font-bold ${p('print:text-sm', 'print:text-[10px]')}`}>
              ・電子申告を行う場合、原本資料はご返却いたします。
            </p>
          </div>
        </div>
        <div className={`mt-8 text-center text-sm text-slate-400 ${p('print:mt-8 print:text-xs', 'print:mt-2 print:text-[9px] print:leading-tight')}`}>
          {COMPANY_INFO.fullAddress}
          <br />
          {COMPANY_INFO.contactLine}
          {staffPhone && (
            <>
              <br />
              <span className="text-slate-600 font-medium">
                担当: {staffName || '−'} / 携帯: {staffPhone}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
