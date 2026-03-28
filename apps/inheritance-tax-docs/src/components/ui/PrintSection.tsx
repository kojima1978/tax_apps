import { Info, AlertCircle } from 'lucide-react';
import { COMPANY_INFO, getFullAddress, getContactLine, DOC_LIST_TYPE_LABELS, type DocListType, type EditableDocumentList } from '@/constants';
import { toCircledNumber } from '@/utils/helpers';

const PRINT_LAYOUTS = {
  oneColumn: {
    headerBorder: 'print:pb-4 print:mb-6',
    title: 'print:text-2xl print:mb-2',
    meta: 'print:text-base',
    subtitle: 'print:text-sm',
    section: 'print:space-y-0',
    sectionItem: 'print:mb-0',
    categoryHeader: 'print:mb-1 print:text-base print:py-0.5',
    docRow: 'print:py-1.5',
    docText: 'print:text-sm',
    descText: 'print:text-xs',
    subList: 'print:ml-5 print:space-y-0',
    subText: 'print:text-xs',
    subArrow: '',
    footer: 'print:mt-8 print:pt-6',
    footerBox: 'print:p-4',
    footerIcon: 'print:w-5 print:h-5',
    caution: 'print:text-sm',
    contact: 'print:mt-8 print:text-xs',
    checkBox: 'print:w-5 print:h-5',
    badge: 'print:text-[10px] print:px-1.5 print:py-0.5',
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
    docText: 'print:text-[10px] print:leading-tight',
    descText: 'print:text-[9px] print:leading-tight',
    subList: 'print:ml-3 print:space-y-0',
    subText: 'print:text-[9px] print:leading-tight',
    subArrow: 'print:mr-1',
    footer: 'print:mt-2 print:pt-2 print:border-t',
    footerBox: 'print:p-1',
    footerIcon: 'print:w-3 print:h-3',
    caution: 'print:text-[10px]',
    contact: 'print:mt-2 print:text-[9px] print:leading-tight',
    checkBox: 'print:w-3.5 print:h-3.5',
    badge: 'print:text-[8px] print:px-1 print:py-0',
  },
} as const;

type PrintSectionProps = {
  documentList: EditableDocumentList;
  isTwoColumnPrint: boolean;
  hideSubmittedInPrint: boolean;
  currentDate: string;
  personInCharge: string;
  personInChargeContact: string;
  clientName: string;
  deceasedName: string;
  docListType: DocListType;
};

export const PrintSection = ({
  documentList,
  isTwoColumnPrint,
  hideSubmittedInPrint,
  currentDate,
  personInCharge,
  personInChargeContact,
  clientName,
  deceasedName,
  docListType,
}: PrintSectionProps) => {
  const printCategories = documentList
    .filter(cat => !cat.isDisabled)
    .map(cat => ({
      ...cat,
      documents: cat.documents.filter(doc => {
        if (doc.excluded) return false;
        if (hideSubmittedInPrint && doc.checked) return false;
        return true;
      }),
    }))
    .filter(cat => cat.documents.length > 0);

  if (printCategories.length === 0) return null;

  const l = PRINT_LAYOUTS[isTwoColumnPrint ? 'twoColumn' : 'oneColumn'];

  return (
    <div className="hidden print:block bg-white p-0">
      {/* ─── ヘッダー ─── */}
      <div className={`border-b-2 border-slate-800 pb-6 mb-8 flex justify-between items-end ${l.headerBorder}`}>
        <div>
          <h1 className={`text-3xl font-bold text-slate-900 mb-2 ${l.title}`}>
            {DOC_LIST_TYPE_LABELS[docListType]} 必要書類リスト
          </h1>
          <div className={`text-slate-700 font-medium mb-2 ${l.meta}`}>
            {clientName && <span className="mr-4">依頼者名: {clientName} 様</span>}
            {deceasedName && <span className="mr-4">被相続人名: {deceasedName} 様</span>}
            {personInCharge && <span>担当者: {personInCharge}</span>}
          </div>
          <p className={`text-slate-600 ${l.subtitle}`}>
            以下の書類をご準備の上、ご来所・ご郵送ください。「取得代行可」は弊社で代理取得が可能です。
          </p>
        </div>
        <div className="text-right text-sm text-slate-500">
          <p>発行日: {currentDate}</p>
          <p>{COMPANY_INFO.name}</p>
        </div>
      </div>

      {/* ─── 注意事項 ─── */}
      <div className={`flex items-start bg-slate-50 p-3 rounded border border-slate-200 mb-6 ${isTwoColumnPrint ? 'print:p-1 print:mb-2' : 'print:mb-4'}`}>
        <Info className={`w-4 h-4 text-slate-500 mr-2 mt-0.5 flex-shrink-0 ${isTwoColumnPrint ? 'print:w-3 print:h-3' : ''}`} aria-hidden="true" />
        <div className={`text-sm text-slate-600 ${isTwoColumnPrint ? 'print:text-[9px] print:leading-tight' : 'print:text-xs'}`}>
          資料は原本、コピー、データなどどのような形でお送りいただいても結構です。原本はスキャン後すべてお返しいたします。
        </div>
      </div>

      {/* ─── カテゴリ・書類リスト ─── */}
      <div className={`space-y-8 print:space-y-0 print:block ${l.section}`}>
        {printCategories.map((cat, catIdx) => (
          <div key={cat.id} className={l.sectionItem}>
            {/* カテゴリヘッダー */}
            <h3 className={`font-bold text-lg mb-3 print:mb-0.5 px-3 py-1 bg-emerald-50 border-l-4 border-emerald-500 text-slate-800 flex items-center ${l.categoryHeader}`}>
              <span className="mr-1">{toCircledNumber(catIdx + 1)}</span>
              {cat.name}
              <span className="ml-2 font-normal text-slate-500 text-sm">
                （{cat.documents.length}件）
              </span>
            </h3>

            {/* 書類リスト */}
            <ul className="list-none pl-1 space-y-2 print:space-y-0">
              {cat.documents.map((doc, docIdx) => {
                const docNumber = docIdx + 1;
                return (
                  <li key={doc.id}>
                    {/* 書類メイン行 */}
                    <div
                      className={`flex items-start py-2 print:py-0.5 border-b border-dashed border-slate-200 ${
                        doc.urgent ? 'bg-red-50 border-red-200 px-2 rounded' : ''
                      } ${doc.specificNames.length > 0 ? 'border-b-0' : ''} ${l.docRow}`}
                    >
                      {/* チェックボックス */}
                      <div className={`flex-shrink-0 mr-2 mt-0.5 w-5 h-5 border-2 rounded flex items-center justify-center ${
                        doc.checked
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                          : 'border-slate-400'
                      } ${l.checkBox}`}>
                        {doc.checked && <span className="text-xs font-bold">✓</span>}
                      </div>

                      {/* 番号 */}
                      <span className={`flex-shrink-0 mr-2 mt-0.5 font-semibold text-slate-500 min-w-[1.5rem] text-right ${l.docText}`}>
                        {docNumber}.
                      </span>

                      {/* 書類情報 */}
                      <div className="flex-grow min-w-0">
                        {/* 1行目: 書類名 + バッジ */}
                        <div className="flex items-center flex-wrap gap-1">
                          <span className={`font-medium ${doc.checked ? 'line-through text-slate-400' : 'text-slate-800'} ${l.docText}`}>
                            {doc.name}
                          </span>
                          {doc.urgent && (
                            <span className={`inline-block bg-red-100 text-red-700 border border-red-300 rounded font-bold px-1.5 py-0.5 text-[10px] leading-none ${l.badge}`}>
                              急
                            </span>
                          )}
                          {doc.canDelegate && (
                            <span className={`inline-block bg-blue-100 text-blue-700 border border-blue-300 rounded px-1.5 py-0.5 text-[10px] leading-none ${l.badge}`}>
                              取得代行可
                            </span>
                          )}
                          {doc.isCustom && (
                            <span className={`inline-block bg-amber-100 text-amber-700 border border-amber-300 rounded px-1.5 py-0.5 text-[10px] leading-none ${l.badge}`}>
                              追加
                            </span>
                          )}
                        </div>

                        {/* 2行目: 説明 */}
                        {doc.description && (
                          <p className={`text-slate-500 mt-0.5 ${l.descText}`}>
                            {doc.description}
                          </p>
                        )}

                        {/* 3行目: 入手方法 */}
                        {doc.howToGet && (
                          <p className={`text-slate-400 mt-0.5 ${l.descText}`}>
                            <span className="text-slate-500 font-medium">入手: </span>
                            {doc.howToGet}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* 個別名サブ行 */}
                    {doc.specificNames.length > 0 && (
                      <ul className={`ml-7 space-y-1 pb-1.5 border-b border-dashed border-slate-200 ${l.subList}`}>
                        {doc.specificNames.map((sn, snIdx) => (
                          <li
                            key={sn.id}
                            className={`flex items-start text-slate-600 ${l.subText}`}
                          >
                            <span className={`text-slate-400 mr-1 min-w-[2rem] text-right ${l.subText}`}>
                              {docNumber}-{snIdx + 1}
                            </span>
                            <span className={`text-slate-400 mr-2 ${l.subArrow}`}>└</span>
                            <span>{sn.text}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* ─── フッター ─── */}
      <div className={`mt-12 pt-6 border-t border-slate-300 ${l.footer}`}>
        <div className={`flex items-start bg-slate-50 p-4 rounded-lg border border-slate-200 ${l.footerBox}`}>
          <AlertCircle className={`w-5 h-5 text-slate-500 mr-2 mt-0.5 flex-shrink-0 ${l.footerIcon}`} aria-hidden="true" />
          <div className="text-sm text-slate-600 space-y-1">
            <p><strong>ご留意事項</strong></p>
            <p className={l.caution}>・原本が必要な書類と、コピーで対応可能な書類がございます。ご不明な点は担当者にご確認ください。</p>
            <p className={`text-red-600 font-bold ${l.caution}`}>・電子申告を行う場合、原本資料はご返却いたします。</p>
            <p className={l.caution}>・公的機関（市役所等）で取得する証明書は、原則として発行後3ヶ月以内のものをご用意ください。</p>
          </div>
        </div>
        <div className={`mt-8 text-center text-sm text-slate-400 ${l.contact}`}>
          {getFullAddress()}
          <br />
          {getContactLine()}
          {personInChargeContact && (
            <>
              <br />
              <span className="text-slate-600 font-medium">
                担当: {personInCharge || '−'} / 連絡先: {personInChargeContact}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
