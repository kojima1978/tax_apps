import { Info, AlertCircle } from 'lucide-react';
import { COMPANY_INFO, getFullAddress, getContactLine, giftData, type DocumentGroup } from '@/constants';

const PRINT_LAYOUTS = {
  oneColumn: {
    headerBorder: 'print:pb-4 print:mb-6',
    title: 'print:text-2xl print:mb-2',
    meta: 'print:text-base',
    subtitle: 'print:text-sm',
    section: 'print:space-y-6',
    sectionItem: 'print:mb-6',
    categoryHeader: 'print:mb-2 print:text-base print:py-1',
    docRow: 'print:py-1',
    checkboxChecked: 'print:w-3 print:h-3 print:mt-1 print:mr-2 print:leading-3 print:text-[8px]',
    checkboxUnchecked: 'print:w-3 print:h-3 print:mt-1 print:mr-2',
    docText: 'print:text-sm',
    subList: 'print:ml-5 print:space-y-0',
    subText: 'print:text-xs',
    subArrow: '',
    noteBox: 'print:mt-2 print:p-2 print:text-xs',
    noteIcon: 'print:w-4 print:h-4',
    footer: 'print:mt-8 print:pt-6',
    footerBox: 'print:p-4',
    footerIcon: 'print:w-5 print:h-5',
    caution: 'print:text-sm',
    contact: 'print:mt-8 print:text-xs',
  },
  twoColumn: {
    headerBorder: 'print:pb-0 print:mb-2 print:border-b',
    title: 'print:text-lg print:mb-0',
    meta: 'print:text-xs',
    subtitle: 'print:text-[10px]',
    section: 'print:columns-2 print:gap-4 print:space-y-0',
    sectionItem: 'print:mb-1',
    categoryHeader: 'print:mb-0.5 print:text-xs print:py-0 print:h-5',
    docRow: 'print:py-0.5',
    checkboxChecked: 'print:w-2 print:h-2 print:mt-0.5 print:mr-1 print:leading-2 print:text-[6px]',
    checkboxUnchecked: 'print:w-2 print:h-2 print:mt-0.5 print:mr-1',
    docText: 'print:text-[10px] print:leading-tight',
    subList: 'print:ml-3 print:space-y-0',
    subText: 'print:text-[9px] print:leading-tight',
    subArrow: 'print:mr-1',
    noteBox: 'print:mt-1 print:p-1 print:text-[10px]',
    noteIcon: 'print:w-3 print:h-3',
    footer: 'print:mt-2 print:pt-2 print:border-t',
    footerBox: 'print:p-1',
    footerIcon: 'print:w-3 print:h-3',
    caution: 'print:text-[10px]',
    contact: 'print:mt-2 print:text-[9px] print:leading-tight',
  },
} as const;

type PrintSectionProps = {
  results: DocumentGroup[];
  isTwoColumnPrint: boolean;
  currentDate: string;
  staffName: string;
  staffPhone: string;
  customerName: string;
  deadline: string;
};

export const PrintSection = ({
  results,
  isTwoColumnPrint,
  currentDate,
  staffName,
  staffPhone,
  customerName,
  deadline,
}: PrintSectionProps) => {
  const hasResults = results.length > 0 && results.some((g) => g.documents.length > 0);

  if (!hasResults) return null;

  const l = PRINT_LAYOUTS[isTwoColumnPrint ? 'twoColumn' : 'oneColumn'];

  return (
    <div className="hidden print:block bg-white p-0">
      <div className={`border-b-2 border-slate-800 pb-6 mb-8 flex justify-between items-end ${l.headerBorder}`}>
        <div>
          <h1 className={`text-3xl font-bold text-slate-900 mb-2 ${l.title}`}>
            {giftData.title}
          </h1>
          <div className={`text-slate-700 font-medium mb-2 ${l.meta}`}>
            {customerName && <span className="mr-4">お客様名: {customerName}</span>}
            {deadline && <span className="mr-4">資料収集期限: {deadline}</span>}
            {staffName && <span>担当者: {staffName}</span>}
          </div>
          <p className={`text-slate-600 ${l.subtitle}`}>
            以下の書類をご準備の上、ご来所・ご郵送ください。
          </p>
        </div>
        <div className="text-right text-sm text-slate-500">
          <p>発行日: {currentDate}</p>
          <p>{COMPANY_INFO.name}</p>
        </div>
      </div>

      <div className={`space-y-8 print:block ${l.section}`}>
        {results.map((group, idx) => (
          <div key={idx} className={`break-inside-avoid ${l.sectionItem}`}>
            <h3 className={`font-bold text-lg mb-3 px-3 py-1 bg-emerald-50 border-l-4 border-emerald-500 text-slate-800 flex items-center ${l.categoryHeader}`}>
              {group.category}
            </h3>
            <ul className="list-none pl-1 space-y-2 print:space-y-0">
              {group.documents.map((doc, docIdx) => (
                <li key={docIdx}>
                  <div
                    className={`flex items-start text-slate-700 py-1 border-b border-dashed border-slate-100 ${doc.subItems.length > 0 ? 'border-b-0' : ''} ${l.docRow}`}
                  >
                    {doc.checked ? (
                      <span className={`inline-block w-4 h-4 mr-3 mt-1 border-2 border-slate-400 bg-slate-400 rounded-sm flex-shrink-0 text-white text-center leading-4 text-xs ${l.checkboxChecked}`}>✓</span>
                    ) : (
                      <span className={`inline-block w-4 h-4 mr-3 mt-1 border-2 border-slate-400 rounded-sm flex-shrink-0 ${l.checkboxUnchecked}`} />
                    )}
                    <span className={`${doc.checked ? 'line-through text-slate-400' : ''} ${l.docText}`}>{doc.text}</span>
                  </div>
                  {doc.subItems.length > 0 && (
                    <ul className={`ml-7 space-y-1 pb-1 border-b border-dashed border-slate-100 ${l.subList}`}>
                      {doc.subItems.map((subItem, subIdx) => (
                        <li
                          key={subIdx}
                          className={`flex items-start text-slate-600 ${l.subText}`}
                        >
                          <span className={`text-slate-400 mr-2 ${l.subArrow}`}>└</span>
                          <span>{subItem}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
            {group.note && (
              <p className={`mt-2 text-sm text-slate-500 bg-slate-50 p-2 rounded flex items-start ${l.noteBox}`}>
                <Info className={`w-4 h-4 mr-1 mt-0.5 flex-shrink-0 ${l.noteIcon}`} aria-hidden="true" />
                {group.note}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className={`mt-12 pt-6 border-t border-slate-300 ${l.footer}`}>
        <div className={`flex items-start bg-slate-50 p-4 rounded-lg border border-slate-200 ${l.footerBox}`}>
          <AlertCircle className={`w-5 h-5 text-slate-500 mr-2 mt-0.5 flex-shrink-0 ${l.footerIcon}`} aria-hidden="true" />
          <div className="text-sm text-slate-600 space-y-1">
            <p>
              <strong>ご留意事項</strong>
            </p>
            <p className={`text-red-600 font-bold ${l.caution}`}>
              ・電子申告を行う場合、原本資料はご返却いたします。
            </p>
          </div>
        </div>
        <div className={`mt-8 text-center text-sm text-slate-400 ${l.contact}`}>
          {getFullAddress()}
          <br />
          {getContactLine()}
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
