import { formatReiwaYear, formatDateTime } from '@/utils/date';
import { CustomerWithYears } from '@/utils/api';

interface CustomerCardProps {
  customer: CustomerWithYears;
  onClick: () => void;
}

export function CustomerCard({ customer, onClick }: CustomerCardProps) {
  return (
    <button
      onClick={onClick}
      className="text-left bg-white border border-slate-200 rounded-xl p-5 hover:border-emerald-300 hover:shadow-md transition-all group"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-lg font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">
          {customer.customer_name}
        </h3>
      </div>
      <p className="text-sm text-slate-500 mb-3">
        担当: {customer.staff_name || <span className="text-slate-400">未設定</span>}
      </p>
      {customer.years.length > 0 ? (
        <>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {customer.years.map(year => (
              <span
                key={year}
                className="px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full"
              >
                {formatReiwaYear(year)}
              </span>
            ))}
          </div>
          {customer.latest_updated_at && (
            <p className="text-xs text-slate-400">
              最終更新: {formatDateTime(customer.latest_updated_at)}
            </p>
          )}
        </>
      ) : (
        <p className="text-xs text-slate-400">書類データなし</p>
      )}
    </button>
  );
}
