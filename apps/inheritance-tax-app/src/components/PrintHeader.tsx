import React from 'react';
import { COMPANY_INFO } from '../constants';

interface PrintHeaderProps {
  title: string;
}

export const PrintHeader: React.FC<PrintHeaderProps> = ({ title }) => (
  <div className="print-only justify-between items-start px-4 py-3 border-b-2 border-green-700 mb-4">
    <div>
      <h1 className="text-2xl font-bold text-green-800">{title}</h1>
    </div>
    <address className="text-right text-sm not-italic text-gray-700">
      <p className="font-bold text-base">{COMPANY_INFO.name}</p>
      <p>{COMPANY_INFO.postalCode} {COMPANY_INFO.address}</p>
      <p>TEL: {COMPANY_INFO.phone}</p>
    </address>
  </div>
);
