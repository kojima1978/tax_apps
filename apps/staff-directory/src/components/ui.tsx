import { useEffect, type ButtonHTMLAttributes, type ReactNode, type RefObject } from 'react';

export const btn = {
  primary:
    'rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50',
  secondary:
    'rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50',
  danger: 'rounded-md px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50',
} as const;

// 幅を持たない見た目だけの指定。w-full と w-48 などを並べると、どちらが勝つかは
// クラスの並びではなく CSS の出力順で決まる（実際に w-full が勝ち、絞り込み欄が全幅で縦に積まれていた）
export const controlClass =
  'rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-500 disabled:bg-slate-50';
export const inputClass = `w-full ${controlClass}`;

export function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: ReactNode;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-1 text-xs font-normal text-red-600">必須</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {message}
    </p>
  );
}

// <dialog> の showModal() がフォーカスの閉じ込めと Escape を受け持つ。
// 閉じるのは ref.close() → onClose の一方向（キャンセルも Escape も同じ経路を通る）。
// canClose を渡すと、Escape で閉じる前にそれを聞く（false なら閉じない）
export function Modal({
  title,
  aside,
  onClose,
  canClose,
  dialogRef,
  wide,
  children,
}: {
  title: string;
  aside?: ReactNode;
  onClose: () => void;
  canClose?: () => boolean;
  dialogRef: RefObject<HTMLDialogElement | null>;
  wide?: boolean;
  children: ReactNode;
}) {
  useEffect(() => {
    dialogRef.current?.showModal();
  }, [dialogRef]);
  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onCancel={(e) => {
        if (canClose && !canClose()) e.preventDefault();
      }}
      className={`m-auto w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} rounded-lg p-0 shadow-xl`}
      aria-label={title}
    >
      <div className="space-y-4 p-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold text-slate-800">{title}</h2>
          {aside && <span className="flex items-center gap-2 text-sm text-slate-500">{aside}</span>}
        </div>
        {children}
      </div>
    </dialog>
  );
}

// ダイアログの中の見出しつきのまとまり。先頭以外は上に区切り線を引く
export function Section({ title, first, children }: { title: string; first?: boolean; children: ReactNode }) {
  return (
    <fieldset className={first ? '' : 'border-t border-slate-200 pt-3'}>
      <legend className="float-left mb-2 w-full text-sm font-bold text-slate-800">{title}</legend>
      <div className="clear-both space-y-2">{children}</div>
    </fieldset>
  );
}

// ダイアログの下端のボタンの並び。縦に長いダイアログでもスクロールせずに保存を押せるよう、
// 下端に貼り付ける（Modal の p-6 の余白ぶんを負のマージンで打ち消して端まで広げる）
export function DialogFooter({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 -mx-6 -mb-6 flex items-center gap-2 border-t border-slate-200 bg-white px-6 py-3">
      {children}
    </div>
  );
}

// 並べ替えのつまみ。ここを掴んで行をドラッグし、フォーカス中は ↑↓ でも動く（useReorder）
export function DragHandle(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      title="ドラッグして並べ替え（↑↓キーでも動かせます）"
      className="cursor-grab select-none rounded px-1 text-lg leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-600 active:cursor-grabbing"
      {...props}
    >
      ⠿
    </button>
  );
}

// 並びを動かした後だけ出る確定の帯。保存するまではサーバに何も送らない
export function ReorderBar({
  dirty,
  saving,
  onSave,
  onReset,
}: {
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onReset: () => void;
}) {
  if (!dirty) return null;
  return (
    <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
      <span>並び順を変えました。保存するまで反映されません。</span>
      <button type="button" className={`${btn.secondary} ml-auto`} onClick={onReset} disabled={saving}>
        元に戻す
      </button>
      <button type="button" className={btn.primary} onClick={onSave} disabled={saving}>
        並び順を保存
      </button>
    </div>
  );
}
