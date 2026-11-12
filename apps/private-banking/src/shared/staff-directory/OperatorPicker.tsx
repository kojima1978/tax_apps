// 原本は tax_apps/shared/staff-directory/。写しを直さず原本を直して `bash shared/sync.sh` で配る
import { useState } from 'react';
import { useOperator } from './operator';
import { StaffPickerDialog } from './StaffPickerDialog';

type Props = {
  /** このアプリで操作者の名前が何に使われるか（例: 「分類の変更履歴に名前が残ります」） */
  usage: string;
  /** 暗いヘッダーの上に置くときは 'dark' */
  variant?: 'light' | 'dark';
  className?: string;
};

const BUTTON_TONE = {
  light: {
    base: 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
    empty: 'border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100',
    fallback: 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100',
  },
  dark: {
    base: 'border-white/20 bg-white/5 text-slate-100 hover:bg-white/15',
    empty: 'border-amber-300/70 bg-amber-300/15 text-amber-100 hover:bg-amber-300/25',
    fallback: 'border-amber-300/50 bg-transparent text-amber-200 hover:bg-white/10',
  },
} as const;

/**
 * 画面右上の操作者（いま画面を使っている人）。全アプリで同じ見た目・同じ選び方にする。
 * 選んだ人は全アプリ共通（同じブラウザの他のアプリでも同じ人になる）。
 *
 * 未選択のときは「選ぶ」を目立たせ、記録には名前を送らない（先頭の人に化けさせない）。
 * 社員台帳に届かないときも隠さず「未接続」と出す ── 消えると、選べないのか選ばなくてよいのか分からない。
 */
export function OperatorPicker({ usage, variant = 'light', className = '' }: Props) {
  const { selected, status, selectOperator, clearOperator } = useOperator();
  const [open, setOpen] = useState(false);
  const tone = BUTTON_TONE[variant];

  const state = status === 'fallback' ? 'fallback' : selected || status === 'loading' ? 'base' : 'empty';
  const label =
    status === 'fallback' ? '社員台帳に未接続' : selected ? selected.fullName : status === 'loading' ? '読み込み中…' : '操作者を選ぶ';
  const hint =
    status === 'fallback'
      ? '社員台帳に接続できないため、操作者を選べません（名前は記録されません）'
      : `操作者: ${selected ? `${selected.fullName}${selected.departmentName ? `（${selected.departmentName}）` : ''}` : '未選択'} ── ${usage}`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={hint}
        className={`print:hidden inline-flex h-7 max-w-[14rem] shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium whitespace-nowrap ${tone[state]} ${className}`}
      >
        <PersonIcon />
        {selected && <span className="hidden opacity-70 lg:inline">操作者</span>}
        <span className="truncate">{label}</span>
      </button>
      <StaffPickerDialog
        open={open}
        onClose={() => setOpen(false)}
        title="操作者を選ぶ"
        currentId={selected?.id ?? null}
        onPick={(person) => {
          if (person?.id) selectOperator(person.id);
          else clearOperator();
          setOpen(false);
        }}
        clearLabel="選択を外す"
        fallbackMessage="社員台帳に接続できないため、いまは操作者を選べません。選ばないまま使えますが、記録に名前は残りません。台帳が動いているか確かめてから、この画面へ戻ってください。"
        searchLabel="操作者を名前・よみ・部署で探す"
        summary={
          <>
            <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <span className="font-semibold">このアプリでは：</span>
              {usage}
            </p>
            <p className="text-sm">
              いまの操作者：
              {selected ? (
                <span className="font-semibold">
                  {selected.fullName}
                  {selected.departmentName && <span className="ml-1 text-xs font-normal text-slate-500">{selected.departmentName}</span>}
                </span>
              ) : (
                <span className="text-amber-800">未選択（記録に名前が残りません）</span>
              )}
            </p>
            <p className="text-xs text-slate-500">選んだ人は、同じブラウザの他のアプリでも操作者になります。</p>
          </>
        }
      />
    </>
  );
}

function PersonIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}
