import { Plus, X } from 'lucide-react';
import { useInlineStaffCreation } from '@/hooks/useInlineStaffCreation';

type InlineStaffCreation = ReturnType<typeof useInlineStaffCreation>;

interface InlineStaffFormProps {
  staff: InlineStaffCreation;
}

export function InlineStaffToggle({ staff }: InlineStaffFormProps) {
  if (staff.showForm) return null;
  return (
    <button
      type="button"
      onClick={staff.open}
      className="mt-2 inline-flex items-center text-sm text-emerald-600 hover:text-emerald-700 font-medium"
    >
      <Plus className="w-4 h-4 mr-1" />
      担当者を新規作成
    </button>
  );
}

export function InlineStaffForm({ staff }: InlineStaffFormProps) {
  if (!staff.showForm) return null;
  return (
    <div className="mt-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-emerald-800">担当者を新規作成</span>
        <button
          type="button"
          onClick={staff.close}
          className="text-slate-400 hover:text-slate-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <input
        type="text"
        value={staff.name}
        onChange={(e) => staff.setName(e.target.value)}
        placeholder="担当者名（必須）"
        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
        autoFocus
      />
      <input
        type="text"
        inputMode="numeric"
        maxLength={3}
        value={staff.code}
        onChange={(e) => staff.setCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
        placeholder="担当者コード（任意・例：001）"
        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
      />

      <input
        type="text"
        value={staff.mobile}
        onChange={(e) => staff.setMobile(e.target.value)}
        placeholder="携帯電話番号（任意）"
        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
      />
      {staff.error && (
        <p className="text-sm text-red-600">{staff.error}</p>
      )}
      <button
        type="button"
        onClick={staff.submit}
        disabled={staff.isCreating || !staff.name.trim()}
        className="w-full py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
      >
        {staff.isCreating ? '登録中...' : '担当者を登録'}
      </button>
    </div>
  );
}
