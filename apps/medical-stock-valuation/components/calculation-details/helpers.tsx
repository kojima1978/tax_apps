import { ReactNode } from 'react';

export function DetailTable({ children }: { children: ReactNode }) {
  return (
    <table className="w-full text-sm">
      <tbody>{children}</tbody>
    </table>
  );
}

export function DetailRow({ label, value, highlight, sub, border }: {
  label: string;
  value: string;
  highlight?: boolean;
  sub?: boolean;
  border?: boolean;
}) {
  const showBorder = border ?? !sub;
  return (
    <tr className={`${showBorder ? 'border-b' : ''} ${highlight ? 'bg-gray-100' : ''} ${sub ? 'text-xs text-gray-600' : ''}`}>
      <td className={`${sub ? 'py-1 pl-4' : 'py-2'} ${highlight ? 'font-bold' : ''}`}>{label}</td>
      <td className={`text-right font-mono ${highlight ? 'font-bold' : ''}`}>{value}</td>
    </tr>
  );
}

export function ResultBox({ children }: { children: ReactNode }) {
  return (
    <div className="p-4 border-2 border-gray-400 rounded bg-gray-50">
      <h4 className="font-bold mb-2">【計算結果】</h4>
      {children}
    </div>
  );
}
