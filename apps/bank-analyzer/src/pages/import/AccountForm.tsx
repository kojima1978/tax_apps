// 口座の4項目（銀行・支店・種別・口座番号）と「既存の口座から選ぶ」。
// Django 版の既存口座ボタンはカードの :hover の中にしか出ず、押せたためしが無かったので、
// 各カードに常に見える選択欄として置く

import type { AccountFields } from './wizardRows';

const ACCOUNT_TYPES = ['普通', '当座', '定期', '貯蓄', '総合'];

const FIELDS = [
  { key: 'bankName', label: '銀行名', placeholder: '例: 架空銀行' },
  { key: 'branchName', label: '支店名', placeholder: '例: 本店' },
  { key: 'accountType', label: '種別', placeholder: '例: 普通' },
  { key: 'accountNumber', label: '口座番号', placeholder: '例: 1234567' },
] as const;

export const accountLabel = (a: AccountFields) => [a.bankName, a.branchName, a.accountType, a.accountNumber].filter(Boolean).join(' ');

type Props = {
  idPrefix: string;
  account: AccountFields;
  existing: AccountFields[];
  onChange: (patch: Partial<AccountFields>) => void;
  // 口座番号が空のまま「次へ」を押したとき
  showRequired: boolean;
};

export function AccountForm({ idPrefix, account, existing, onChange, showRequired }: Props) {
  const missingNumber = showRequired && account.accountNumber.trim() === '';
  return (
    <div>
      {existing.length > 0 && (
        <div className="mb-3">
          <label className="label" htmlFor={`${idPrefix}-existing`}>
            既存の口座から選ぶ
          </label>
          <select
            id={`${idPrefix}-existing`}
            className="input"
            value=""
            onChange={(e) => {
              const picked = existing[Number(e.target.value)];
              if (picked) onChange(picked);
            }}
          >
            <option value="">（選ぶと下の4項目に入ります）</option>
            {existing.map((a, i) => (
              <option key={`${a.accountNumber}-${i}`} value={i}>
                {accountLabel(a)}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {FIELDS.map((f) => {
          const id = `${idPrefix}-${f.key}`;
          const invalid = f.key === 'accountNumber' && missingNumber;
          return (
            <div key={f.key}>
              <label className="label" htmlFor={id}>
                {f.label}
                {f.key === 'accountNumber' && <span className="ml-1 text-red-600">*</span>}
              </label>
              <input
                id={id}
                className={`input ${invalid ? 'border-red-500' : ''}`}
                value={account[f.key]}
                placeholder={f.placeholder}
                list={f.key === 'accountType' ? 'account-types' : undefined}
                aria-invalid={invalid || undefined}
                aria-describedby={invalid ? `${id}-error` : undefined}
                onChange={(e) => onChange({ [f.key]: e.target.value })}
              />
              {invalid && (
                <p id={`${id}-error`} className="mt-1 text-xs text-red-700">
                  口座番号を入力してください
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 種別の候補（ページに1つ置く）
export function AccountTypeOptions() {
  return (
    <datalist id="account-types">
      {ACCOUNT_TYPES.map((t) => (
        <option key={t} value={t} />
      ))}
    </datalist>
  );
}
