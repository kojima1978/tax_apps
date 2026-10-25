import { useId } from 'react';
import { useCompanyInfo, type CompanyInfo } from '@/shared/staff-directory/company';

/** 会社を足したり直したりする場所（社員台帳の会社一覧）。 */
const COMPANY_DIRECTORY_URL = '/staff-directory/companies';
/** プルダウン末尾の「会社を追加・編集…」の値。会社ID と重ならない文字列にする。 */
const MANAGE_OPTION = 'manage';

type CompanyFieldProps = {
  /** 切り替えた直後に呼ぶ（書類リストが会社ごとに入れ替わったことを知らせるため）。 */
  onSwitched?: (company: CompanyInfo) => void;
};

/**
 * 見出し行の「会社」欄。どの会社の書類リストを開いているかを常に見せる。
 *
 * 共有の CompanySwitcher は会社が1つなら何も出さないが、ここでは書類リストと参考資料が
 * 会社ごとに別物なので、1社でもプルダウンにして「ここで切り替える」ことを見せる。
 * 1社だと選ぶものが無いので、末尾の「会社を追加・編集…」から社員台帳を別タブで開く
 * （編集中の書類リストを置いていかないため別タブ。台帳を直したら再読み込みで反映）。
 * 共有部品を直すと8アプリの写しに波及するため、このアプリの中だけに置いている。
 */
export const CompanyField = ({ onSwitched }: CompanyFieldProps) => {
  const { company, companies, status, selectCompany } = useCompanyInfo();
  const labelId = useId();

  const handleChange = (value: string) => {
    // 選択値は company.id に縛ってあるので、管理を選んでも表示は今の会社のまま戻る
    if (value === MANAGE_OPTION) {
      window.open(COMPANY_DIRECTORY_URL, '_blank', 'noopener');
      return;
    }
    const id = Number(value);
    if (id === company.id) return;
    selectCompany(id);
    const next = companies.find((c) => c.id === id);
    if (next) onSwitched?.(next);
  };

  return (
    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
      <span id={labelId}>会社</span>
      {status === 'ok' ? (
        <select
          value={company.id ?? ''}
          onChange={(e) => handleChange(e.target.value)}
          className="px-2.5 py-1.5 text-sm font-bold border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer max-w-[220px] truncate"
          aria-labelledby={labelId}
        >
          {companies.map((c) => (
            <option key={c.id} value={c.id ?? ''}>{c.name}</option>
          ))}
          <option disabled>──────────</option>
          <option value={MANAGE_OPTION}>会社を追加・編集…</option>
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
