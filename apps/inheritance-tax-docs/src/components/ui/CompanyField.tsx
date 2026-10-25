import { useId } from 'react';
import { useCompanyInfo, type CompanyInfo } from '@/shared/staff-directory/company';

type CompanyFieldProps = {
  /** 切り替えた直後に呼ぶ（書類リストが会社ごとに入れ替わったことを知らせるため）。 */
  onSwitched?: (company: CompanyInfo) => void;
};

/**
 * 見出し行の「会社」欄。どの会社の書類リストを開いているかを常に見せる。
 *
 * 共有の CompanySwitcher は会社が1つなら何も出さないが、ここでは書類リストと参考資料が
 * 会社ごとに別物なので、1社でも名前を出す（2社以上ならプルダウン）。
 * 共有部品を直すと8アプリの写しに波及するため、このアプリの中だけに置いている。
 */
export const CompanyField = ({ onSwitched }: CompanyFieldProps) => {
  const { company, companies, status, selectCompany } = useCompanyInfo();
  const labelId = useId();

  const handleChange = (id: number) => {
    selectCompany(id);
    const next = companies.find((c) => c.id === id);
    if (next) onSwitched?.(next);
  };

  return (
    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
      <span id={labelId}>会社</span>
      {status === 'ok' && companies.length > 1 ? (
        <select
          value={company.id ?? ''}
          onChange={(e) => handleChange(Number(e.target.value))}
          className="px-2.5 py-1.5 text-sm font-bold border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer max-w-[220px] truncate"
          aria-labelledby={labelId}
        >
          {companies.map((c) => (
            <option key={c.id} value={c.id ?? ''}>{c.name}</option>
          ))}
        </select>
      ) : (
        <span className="text-sm font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
          {status === 'loading' ? '…' : company.name}
        </span>
      )}
      {status === 'fallback' && (
        <span
          className="text-[11px] text-amber-700 dark:text-amber-400 whitespace-nowrap"
          title="社員台帳（/staff-directory/）に接続できないため、アプリ内の控えの事務所情報を使っています"
        >
          台帳に未接続
        </span>
      )}
    </div>
  );
};
