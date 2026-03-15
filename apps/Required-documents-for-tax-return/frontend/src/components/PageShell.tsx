import { ReactNode } from 'react';

interface PageShellProps {
  children: ReactNode;
}

export default function PageShell({ children }: PageShellProps) {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {children}
      </div>
    </main>
  );
}
