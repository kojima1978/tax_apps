import React from 'react';
import { COMPANY_INFO } from '../constants';

interface PrintHeaderProps {
  title: string;
}

export const PrintHeader: React.FC<PrintHeaderProps> = ({ title }) => (
  <div className="print-only justify-between items-start px-4 py-4 border-b-2 border-green-700 mb-6">
    <div>
      <h1 className="text-3xl font-bold text-green-800">{title}</h1>
    </div>
    <address className="text-right text-base not-italic text-gray-700">
      <p className="font-bold text-lg">{COMPANY_INFO.name}</p>
      <p>{COMPANY_INFO.postalCode} {COMPANY_INFO.address}</p>
      <p>TEL: {COMPANY_INFO.phone}</p>
    </address>
  </div>
);
