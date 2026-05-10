import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';
import PageContainer from '@/components/PageContainer';
import PrintButton from '@/components/PrintButton';
import { FEE_SECTIONS, type FeeRow } from '@/lib/fee-data';

export const metadata: Metadata = {
  title: '報酬表（税抜き） - 業務支援ポータル',
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
      <header className="w-full bg-gradient-to-r from-emerald-800 to-green-900 shadow-lg">
        <PageContainer className="py-5 flex items-center justify-between">
          <div>
            <a
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-emerald-300 hover:text-white transition-colors no-print"
            >
              <ArrowLeft className="w-4 h-4" />
              ポータルに戻る
            </a>
            <h1 className="text-2xl font-bold text-white mt-1 print-title">
              報酬表（税抜き）
            </h1>
          </div>
          <PrintButton />
        </PageContainer>
      </header>

      <main className="py-8">
        <PageContainer>
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              {FEE_SECTIONS.map((section) => (
                <tbody key={section.title}>
                  <tr className="bg-gradient-to-r from-emerald-700 to-green-700">
                    <td colSpan={2} className="py-2.5 px-4 text-white font-semibold text-sm tracking-wide">
                      {section.title}
                      {section.subtitle && (
                        <span className="ml-2 font-normal text-emerald-200">
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
