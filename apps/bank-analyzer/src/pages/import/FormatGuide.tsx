// 取込の手順1:「取込できる形式」（依頼24）。列の表・決まり・ひな形・AI に渡す指示文。
// 中身は server/lib/import の columns.ts（列）と format.ts（決まり・ひな形・指示文）から作り、
// 分類名・キーワード・贈与の閾値は案件のいまの設定をサーバから取る（画面で分類名を持たない）

import { useState } from 'react';
import { ClipboardCopy, Download } from 'lucide-react';
import { IMPORT_COLUMNS } from '../../../server/lib/import/columns';
import { aiInstruction, IMPORT_RULES, templateCsv, type ImportFormat } from '../../../server/lib/import/format';
import { exportFileName } from '../../../server/lib/exportFileName';
import { api, errorMessage, saveBlob } from '../../lib/api';

export const FORMAT_GUIDE_ID = 'import-format-guide';

function downloadTemplate() {
  // BOM を付ける（Excel で開いたときに文字化けしない）
  saveBlob(new Blob(['﻿', templateCsv()], { type: 'text/csv;charset=utf-8' }), exportFileName('取込のひな形', 'csv'));
}

type Props = { caseId: string; open: boolean; onToggle: (open: boolean) => void };

export function FormatGuide({ caseId, open, onToggle }: Props) {
  const [instruction, setInstruction] = useState<string | null>(null);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const copyInstruction = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const text = aiInstruction(await api.get<ImportFormat>(`/cases/${caseId}/import/format`));
      setInstruction(text);
      try {
        await navigator.clipboard.writeText(text);
        setStatus({ ok: true, text: '指示文をコピーしました。OCR をする AI にそのまま貼り付けてください。' });
      } catch {
        setStatus({ ok: false, text: 'コピーできませんでした。下の欄から選んでコピーしてください。' });
      }
    } catch (e) {
      setStatus({ ok: false, text: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <details id={FORMAT_GUIDE_ID} className="mt-4 rounded border border-slate-200" open={open} onToggle={(e) => onToggle(e.currentTarget.open)}>
      <summary className="cursor-pointer px-4 py-2 text-sm font-semibold text-slate-700">取込できる形式</summary>
      <div className="space-y-3 border-t border-slate-200 px-4 py-3 text-sm">
        <ul className="list-disc space-y-0.5 pl-5 text-slate-700">
          {IMPORT_RULES.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        <div className="overflow-x-auto">
          <table className="table-base text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="whitespace-nowrap">列の名前</th>
                <th className="whitespace-nowrap">必須</th>
                <th>書き方</th>
              </tr>
            </thead>
            <tbody>
              {IMPORT_COLUMNS.map((c) => (
                <tr key={c.key}>
                  <td className="whitespace-nowrap font-medium">
                    {c.name}
                    {c.aliases.length > 0 && <span className="block text-xs font-normal text-slate-500">（{c.aliases.join('・')} も可）</span>}
                  </td>
                  <td className={`whitespace-nowrap ${c.required ? 'font-semibold text-red-700' : 'text-slate-500'}`}>{c.required ? '必須' : '任意'}</td>
                  <td>{c.format}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-secondary btn-sm" onClick={downloadTemplate}>
            <Download size={14} />
            ひな形をダウンロード（CSV）
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={copyInstruction} disabled={busy}>
            <ClipboardCopy size={14} />
            AI に渡す指示文をコピー
          </button>
        </div>
        <p className="text-xs text-slate-500">指示文の分類名・キーワードの例・贈与の金額は、この案件のいまの設定から作ります。</p>
        {status && (
          <p role="status" className={status.ok ? 'text-emerald-800' : 'text-amber-800'}>
            {status.text}
          </p>
        )}
        {instruction && (
          <textarea className="input h-48 w-full font-mono text-xs" readOnly aria-label="AI に渡す指示文" value={instruction} onFocus={(e) => e.currentTarget.select()} />
        )}
      </div>
    </details>
  );
}
