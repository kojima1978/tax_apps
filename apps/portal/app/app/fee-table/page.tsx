import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';
import PageContainer from '@/components/PageContainer';
import PrintButton from '@/components/PrintButton';
import { FEE_SECTIONS, type FeeRow } from '@/lib/fee-data';

export const metadata: Metadata = {
  title: '報酬表（税抜き） - ポータルランチャー',
};

function renderRow(row: FeeRow, i: number) {
  switch (row.type) {
    case 'item':
      return (
        <tr key={i} className="border-b border-gray-100">
          <td className="py-2.5 px-4 text-gray-800">{row.label}</td>
          <td className="py-2.5 px-4 text-right text-gray-900 whitespace-nowrap">{row.fee}</td>
        </tr>
      );
    case 'sub':
      return (
        <tr key={i} className="border-b border-gray-50">
          <td className="py-2 px-4 pl-8 text-gray-600 text-sm">{row.label}</td>
          <td className="py-2 px-4 text-right text-gray-800 text-sm whitespace-nowrap">{row.fee}</td>
        </tr>
      );
    case 'desc':
      return (
        <tr key={i} className="border-b border-gray-100">
          <td colSpan={2} className="py-2.5 px-4 text-gray-800">{row.text}</td>
        </tr>
      );
    case 'note':
      return (
        <tr key={i} className="border-b border-gray-50">
          <td colSpan={2} className="py-1.5 px-4 text-xs text-gray-500">
            ※{row.text}
          </td>
        </tr>
      );
  }
}

export default function FeeTablePage() {
  return (
    <>
      <header className="w-full bg-white/80 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <PageContainer className="py-6 flex items-center justify-between">
          <div>
            <a
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-green-600 hover:text-green-800 transition-colors no-print"
            >
              <ArrowLeft className="w-4 h-4" />
              ポータルに戻る
            </a>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mt-1 print-title">
              報酬表（税抜き）
            </h1>
          </div>
          <PrintButton />
        </PageContainer>
      </header>

      <main className="py-8">
        <PageContainer>
          <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-md overflow-hidden">
            <table className="w-full">
              {FEE_SECTIONS.map((section) => (
                <tbody key={section.title}>
                  <tr className="bg-gradient-to-r from-green-600 to-emerald-600">
                    <td colSpan={2} className="py-2.5 px-4 text-white font-semibold text-sm tracking-wide">
                      {section.title}
                      {section.subtitle && (
                        <span className="ml-2 font-normal text-green-100">
                          {section.subtitle}
                        </span>
                      )}
                    </td>
                  </tr>
                  {section.rows.map(renderRow)}
                </tbody>
              ))}
            </table>
          </div>

          <p className="mt-6 text-center text-xs text-gray-400 no-print">
            金額はすべて税抜表示です。
          </p>
        </PageContainer>
      </main>
    </>
  );
}
