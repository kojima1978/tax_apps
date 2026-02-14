import { COMPANY_INFO } from '@/lib/excel-styles';

interface Props {
  title: string;
  personInCharge: string;
  companyName: string;
  reiwa: string;
}

export default function PrintHeader({ title, personInCharge, companyName, reiwa }: Props) {
  return (
    <div className="print-only flex-col items-center mb-4 text-center">
      <h1 className="text-2xl font-bold mb-1">{title}</h1>
      <p className="text-sm text-gray-500">
        {COMPANY_INFO.name}　担当: {personInCharge}
      </p>
      <p className="text-sm text-gray-500">
        {COMPANY_INFO.postalCode} {COMPANY_INFO.address}　TEL: {COMPANY_INFO.phone}
      </p>
      <p className="text-sm text-gray-700 font-semibold mt-1">
        {companyName}　{reiwa}
      </p>
    </div>
  );
}
