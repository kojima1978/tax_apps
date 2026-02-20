export function PrintStyles() {
  return (
    <style dangerouslySetInnerHTML={{ __html: `
      @media print {
        body {
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
          font-size: 9px;
          line-height: 1.3;
          color: #000 !important;
          background-color: #fff !important;
        }
        .no-print {
          display: none !important;
        }
        .print-content {
          max-width: 100%;
        }
        @page {
          margin: 0.5cm;
          size: A4;
        }
        /* フォントサイズを統一 */
        h1 { font-size: 11px !important; line-height: 1.2 !important; font-weight: bold !important; color: #000 !important; }
        h2 { font-size: 10px !important; line-height: 1.2 !important; font-weight: bold !important; color: #000 !important; }
        h3 { font-size: 9px !important; line-height: 1.2 !important; font-weight: bold !important; color: #000 !important; }
        h4 { font-size: 9px !important; line-height: 1.2 !important; font-weight: 600 !important; color: #000 !important; }
        .text-xs { font-size: 8px !important; }
        .text-sm { font-size: 9px !important; }
        .text-base { font-size: 9px !important; }
        .text-lg { font-size: 9px !important; }
        .text-xl { font-size: 9px !important; }
        .text-2xl { font-size: 11px !important; }
        .text-3xl { font-size: 11px !important; }
        .text-4xl { font-size: 11px !important; }
        /* 全ての文字を黒に統一 */
        * {
          color: #000 !important;
        }
        .text-primary, .text-secondary, .text-green-700, .text-blue-700, .text-amber-700,
        .text-red-600, .text-blue-600,
        .font-black, .font-bold, .font-semibold,
        .text-black, .text-gray-600 {
          color: #000 !important;
        }
        /* スペーシングを削減 */
        .space-y-8 > * + *, .space-y-6 > * + *, .space-y-4 > * + * { margin-top: 4px !important; }
        .space-y-3 > * + * { margin-top: 3px !important; }
        .space-y-2 > * + * { margin-top: 2px !important; }
        .space-y-1 > * + * { margin-top: 1px !important; }
        .gap-6, .gap-4 { gap: 4px !important; }
        .gap-3 { gap: 3px !important; }
        .gap-2 { gap: 2px !important; }
        /* パディングを削減 */
        .p-8, .p-6, .p-4 { padding: 4px !important; }
        .p-3 { padding: 3px !important; }
        .p-2 { padding: 2px !important; }
        .px-4, .py-4 { padding-left: 3px !important; padding-right: 3px !important; }
        .py-3 { padding-top: 2px !important; padding-bottom: 2px !important; }
        /* マージンを削減 */
        .mb-4, .mb-3 { margin-bottom: 3px !important; }
        .mb-2 { margin-bottom: 2px !important; }
        .mb-1 { margin-bottom: 1px !important; }
        .mt-4, .mt-3 { margin-top: 3px !important; }
        .mt-2 { margin-top: 2px !important; }
        .mt-1 { margin-top: 1px !important; }
        .pb-4, .pb-3, .pb-2 { padding-bottom: 2px !important; }
        .pt-4, .pt-3, .pt-2 { padding-top: 2px !important; }
        /* 全てのボーダーを黒に統一 */
        .border-2, .border-4 { border-width: 1px !important; border-color: #000 !important; }
        .border { border-width: 1px !important; border-color: #000 !important; }
        .border-t { border-top-width: 1px !important; border-top-style: solid !important; border-top-color: #000 !important; }
        .border-b { border-bottom-width: 1px !important; border-bottom-style: solid !important; border-bottom-color: #000 !important; }
        .border-gray-300, .border-gray-400,
        .border-primary, .border-green-300, .border-blue-300, .border-amber-300, .border-blue-200, .border-amber-200 {
          border-color: #000 !important;
        }
        .border-b-2 { border-bottom-width: 1px !important; border-bottom-color: #000 !important; }
        .border-t-2 { border-top-width: 1px !important; border-top-color: #000 !important; }
        /* 背景色を全て白に */
        .bg-blue-50, .bg-green-50, .bg-amber-50, .bg-primary\\/10, .bg-primary\\/5,
        .bg-white, .bg-gray-50, .bg-white\\/50,
        .bg-green-300, .bg-blue-300, .bg-amber-300 {
          background-color: #fff !important;
        }
        /* 全ての要素の背景を白に */
        div[class*="bg-"] {
          background-color: #fff !important;
        }
        * {
          background-color: #fff !important;
        }
        /* 角丸を削除 */
        .rounded-xl, .rounded-lg, .rounded { border-radius: 0 !important; }
        /* テーブルのスタイル */
        table { border-collapse: collapse !important; }
        th, td {
          padding: 2px 3px !important;
          border: 1px solid #000 !important;
        }
        th { font-weight: bold !important; color: #000 !important; }
      }
    ` }} />
  );
}
