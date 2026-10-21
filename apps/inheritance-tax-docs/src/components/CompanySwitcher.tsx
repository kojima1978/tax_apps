import { useCompanyInfo } from '@/lib/company';

const CompanySwitcher = ({ className = '' }: { className?: string }) => {
  const { company, companies, status, selectCompany } = useCompanyInfo();

  if (status === 'fallback') {
    return (
      <span
        className={`print:hidden text-[11px] text-amber-700 ${className}`}
        title="社員台帳（/staff-directory/）に接続できないため、アプリ内の控えの事務所情報を使っています"
      >
        台帳に未接続（控えの事務所情報）
      </span>
    );
  }
  if (companies.length <= 1) return null;

  return (
    <select
      aria-label="帳票に載せる会社"
      value={company.id ?? ''}
      onChange={(event) => selectCompany(Number(event.target.value))}
      className={`print:hidden max-w-full rounded border border-slate-300 bg-white px-1 py-0.5 text-xs text-slate-700 ${className}`}
    >
      {companies.map((item) => <option key={item.id} value={item.id ?? ''}>{item.name}</option>)}
    </select>
  );
};

export default CompanySwitcher;

