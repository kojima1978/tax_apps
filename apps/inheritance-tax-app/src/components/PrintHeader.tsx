import React from 'react';
import { COMPANY_INFO } from '../constants';
import { useStaffInfo } from '../contexts/useStaffInfo';
import { formatPrintDate } from '../utils';

interface PrintHeaderProps {
  title: string;
  /**
   * 作成日。計算時点を保持しているページはその日付を渡す。
   * 省略時は表示時点の日付（＝印刷日）を使う。
   */
  date?: string;
}

export const PrintHeader: React.FC<PrintHeaderProps> = ({ title, date }) => {
  const { staffName, staffPhone } = useStaffInfo();
  const hasStaff = staffName || staffPhone;
  const printDate = date ?? formatPrintDate(new Date());

  return (
    <div className="print-only justify-between items-end px-4 py-3 border-b-2 border-green-700 mb-6">
      <div>
        <h1 className="text-3xl font-bold text-green-800">{title}</h1>
        <p className="text-base text-gray-600 mt-1">作成日: {printDate}</p>
      </div>
      <address className="text-right text-base not-italic text-gray-700">
        <p className="font-bold text-lg">{COMPANY_INFO.name}</p>
        <p>{COMPANY_INFO.postalCode} {COMPANY_INFO.address}{'　'}TEL: {COMPANY_INFO.phone}</p>
        {hasStaff && (
          <p>
            {staffName && <>担当: {staffName}</>}
            {staffName && staffPhone && '　'}
            {staffPhone && <>TEL: {staffPhone}</>}
          </p>
        )}
      </address>
    </div>
  );
};
