import { User, Calendar, Phone, UserCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const INPUT_CLASS = 'pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 bg-slate-50 dark:bg-slate-800/50 transition-all w-full';

type InfoBarField = {
  id: 'customerName' | 'staffName' | 'staffPhone' | 'deadline';
  label: string;
  type: string;
  placeholder: string;
  icon: LucideIcon;
};

const INFO_BAR_FIELDS: InfoBarField[] = [
  { id: 'customerName', label: 'お客様名', type: 'text', placeholder: '例：山田 太郎 様', icon: User },
  { id: 'deadline', label: '資料収集期限', type: 'text', placeholder: '例：3月末まで', icon: Calendar },
  { id: 'staffName', label: '担当者名', type: 'text', placeholder: '例：鈴木 一郎', icon: UserCheck },
  { id: 'staffPhone', label: '担当者携帯', type: 'tel', placeholder: '例：090-1234-5678', icon: Phone },
];

type InfoBarProps = {
  values: Record<InfoBarField['id'], string>;
  setters: Record<InfoBarField['id'], (v: string) => void>;
};

export const InfoBar = ({ values, setters }: InfoBarProps) => (
  <div className="no-print bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl shadow dark:shadow-slate-900/50 p-4 mb-6 transition-colors border border-white/50 dark:border-slate-700/50">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {INFO_BAR_FIELDS.map((field) => {
        const Icon = field.icon;
        return (
          <div key={field.id}>
            <label htmlFor={field.id} className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{field.label}</label>
            <div className="relative">
              <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" aria-hidden="true" />
              <input
                type={field.type}
                id={field.id}
                className={INPUT_CLASS}
                placeholder={field.placeholder}
                value={values[field.id]}
                onChange={(e) => setters[field.id](e.target.value)}
              />
            </div>
          </div>
        );
      })}
    </div>
  </div>
);
