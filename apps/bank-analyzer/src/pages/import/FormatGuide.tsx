// 取込の手順1:「取込できる形式」（依頼24）。列の表・決まり・ひな形・AI に渡す指示文。
// 中身は server/lib/import の columns.ts（列）と format.ts（決まり・ひな形・指示文）から作り、
// 分類名・キーワード・贈与の閾値は案件のいまの設定をサーバから取る（画面で分類名を持たない）

import { useEffect, useState } from 'react';
import { ClipboardCopy, Download, FileSpreadsheet, History, Save, Sparkles } from 'lucide-react';
import { IMPORT_COLUMNS } from '../../../server/lib/import/columns';
import { ERA_CHOICES, type EraChoice } from '../../../server/lib/import/eralessDates';
import { aiInstruction, IMPORT_RULES, promptImprovementRequest, templateCsv, type ImportFormat } from '../../../server/lib/import/format';
import { exportFileName } from '../../../server/lib/exportFileName';
import { api, download, errorMessage, saveBlob } from '../../lib/api';

export const FORMAT_GUIDE_ID = 'import-format-guide';

function downloadTemplate() {
  // BOM を付ける（Excel で開いたときに文字化けしない）
  saveBlob(new Blob(['﻿', templateCsv()], { type: 'text/csv;charset=utf-8' }), exportFileName('取込のひな形', 'csv'));
}

type Props = { caseId: string; open: boolean; onToggle: (open: boolean) => void };

export function FormatGuide({ caseId, open, onToggle }: Props) {
  const [instruction, setInstruction] = useState<string | null>(null);
  const [format, setFormat] = useState<ImportFormat | null>(null);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  // 指示文に足す、分かっていること（任意。依頼27）
  const [era, setEra] = useState<EraChoice | ''>('');
  const [period, setPeriod] = useState('');
  const [issue, setIssue] = useState('');
  const [geminiDraft, setGeminiDraft] = useState('');
  const [newRules, setNewRules] = useState('');
  const [improvementRequest, setImprovementRequest] = useState('');
  const [historyVersion, setHistoryVersion] = useState('');

  const loadFormat = async () => {
    const next = await api.get<ImportFormat>(`/cases/${caseId}/import/format`);
    setFormat(next);
    return next;
  };
  useEffect(() => {
    if (open && !format) void loadFormat().catch((e) => setStatus({ ok: false, text: errorMessage(e) }));
  }, [open, caseId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fullInstruction = (f: ImportFormat) => aiInstruction(f, { era: era || null, period }, { output: 'xlsx', extraRules: f.ocrPrompt?.currentRules });

  const copyInstruction = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const text = fullInstruction(format ?? (await loadFormat()));
      setInstruction(text);
      try {
        await navigator.clipboard.writeText(text);
        setStatus({ ok: true, text: 'Gemini用の依頼文をコピーしました。通帳PDFとExcelひな形と一緒に渡してください。' });
      } catch {
        setStatus({ ok: false, text: 'コピーできませんでした。下の欄から選んでコピーしてください。' });
      }
    } catch (e) {
      setStatus({ ok: false, text: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  const copyImprovement = async () => {
    setBusy(true); setStatus(null);
    try {
      const f = format ?? (await loadFormat());
      const current = instruction ?? fullInstruction(f);
      setInstruction(current);
      const text = promptImprovementRequest(current, issue, geminiDraft);
      setImprovementRequest(text);
      await navigator.clipboard.writeText(text);
      setStatus({ ok: true, text: '改善依頼をコピーしました。Geminiへ貼り付け、返された追加ルールを下の欄へ貼り付けてください。' });
    } catch (e) {
      setStatus({ ok: false, text: errorMessage(e) });
    } finally { setBusy(false); }
  };

  const saveRules = async () => {
    setBusy(true); setStatus(null);
    try {
      const res = await api.post<{ version: number; message: string }>(`/cases/${caseId}/import/ocr-prompt`, { rules: newRules, note: issue });
      setStatus({ ok: true, text: res.message });
      const next = await loadFormat();
      setInstruction(fullInstruction(next));
      setNewRules(''); setIssue(''); setGeminiDraft(''); setImprovementRequest('');
    } catch (e) { setStatus({ ok: false, text: errorMessage(e) }); }
    finally { setBusy(false); }
  };

  const chooseHistory = (value: string) => {
    setHistoryVersion(value);
    const row = format?.ocrPrompt?.versions.find((v) => String(v.version) === value);
    if (row) { setNewRules(row.rules); setIssue(`Ver.${row.version} の内容へ戻す`); }
  };

  return (
    <details id={FORMAT_GUIDE_ID} className="mt-4 rounded border border-slate-200" open={open} onToggle={(e) => onToggle(e.currentTarget.open)}>
      <summary className="cursor-pointer px-4 py-2 text-sm font-semibold text-slate-700">通帳PDFをGeminiで文字認識・取込できる形式</summary>
      <div className="space-y-3 border-t border-slate-200 px-4 py-3 text-sm">
        <section className="rounded-lg border border-blue-200 bg-blue-50 p-4" aria-labelledby="ocrGeminiTitle">
          <div className="mb-3 flex flex-wrap items-start gap-2">
            <Sparkles size={20} className="mt-0.5 text-blue-700" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <h3 id="ocrGeminiTitle" className="font-semibold text-blue-950">Geminiで通帳PDFをExcel化</h3>
              <p className="text-xs text-blue-900">文字認識、残高検算、検査結果、次回依頼文案を1つのExcelで受け取ります。</p>
            </div>
            <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-blue-800">標準依頼文 Ver.{format?.ocrPrompt?.currentVersion ?? '－'}</span>
          </div>
          <ol className="mb-3 grid gap-2 text-xs text-blue-950 md:grid-cols-3">
            <li className="rounded bg-white p-2"><strong>1. ひな形を保存</strong><br />Geminiへ渡すExcelです。</li>
            <li className="rounded bg-white p-2"><strong>2. 依頼文をコピー</strong><br />通帳PDF・ひな形と一緒に渡します。</li>
            <li className="rounded bg-white p-2"><strong>3. Excelを戻す</strong><br />Geminiが返した.xlsxを上の枠へ入れます。</li>
          </ol>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => void download(`/cases/${caseId}/import/ocr-template`).catch((e) => setStatus({ ok: false, text: errorMessage(e) }))}>
              <FileSpreadsheet size={14} />Gemini用Excelひな形
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={copyInstruction} disabled={busy}>
              <ClipboardCopy size={14} />Gemini用の依頼文をコピー
            </button>
          </div>
        </section>
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
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-slate-600">
            通帳の日付の元号（任意）
            <select className="input mt-0.5 block w-40" value={era} onChange={(e) => setEra(e.target.value as EraChoice | '')}>
              <option value="">分からない</option>
              {ERA_CHOICES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-600">
            通帳の期間（任意）
            <input
              className="input mt-0.5 block w-56"
              value={period}
              placeholder="例: 令和6年8月〜令和7年1月"
              onChange={(e) => setPeriod(e.target.value)}
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-secondary btn-sm" onClick={downloadTemplate}>
            <Download size={14} />
            ひな形をダウンロード（CSV）
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Gemini用の依頼文の分類名・キーワードの例・贈与の金額は、この案件のいまの設定から作ります。元号・期間は入れたときだけ指示文に入ります
          （元号が分からなければ、AI には通帳の数字のまま書かせ、取込の手順3でまとめて当てます）。
        </p>
        {status && (
          <p role="status" className={status.ok ? 'text-emerald-800' : 'text-amber-800'}>
            {status.text}
          </p>
        )}
        {instruction && (
          <textarea className="input h-48 w-full font-mono text-xs" readOnly aria-label="Geminiに渡す指示文" value={instruction} onFocus={(e) => e.currentTarget.select()} />
        )}
        <details className="rounded border border-slate-200">
          <summary className="cursor-pointer px-3 py-2 font-semibold text-slate-700"><span className="inline-flex items-center gap-2"><History size={15} />文字認識の精度を次回から改善する</span></summary>
          <div className="space-y-3 border-t border-slate-200 p-3">
            <p className="text-xs text-slate-600">毎回繰り返す必要はありません。誤読を見つけたときだけ、その内容とGeminiの「次回依頼文案」を使って標準依頼文を更新します。</p>
            <label className="block text-xs font-medium text-slate-700">今回見つかった間違い・改善点
              <textarea className="input mt-1 min-h-20 w-full text-sm" value={issue} onChange={(e) => setIssue(e.target.value)} placeholder="例: 02年を平成2年と読んだが、表紙と前後ページから令和2年だった" />
            </label>
            <label className="block text-xs font-medium text-slate-700">Excel「次回依頼文案」の追加ルール案（任意）
              <textarea className="input mt-1 min-h-20 w-full text-sm" value={geminiDraft} onChange={(e) => setGeminiDraft(e.target.value)} placeholder="GeminiがExcelに書いた案を貼り付け" />
            </label>
            <button type="button" className="btn btn-secondary btn-sm" disabled={busy || !issue.trim()} onClick={() => void copyImprovement()}><ClipboardCopy size={14} />Geminiへの改善依頼をコピー</button>
            {improvementRequest && <textarea className="input h-36 w-full font-mono text-xs" readOnly value={improvementRequest} onFocus={(e) => e.currentTarget.select()} aria-label="Geminiへの改善依頼" />}
            <label className="block text-xs font-medium text-slate-700">Geminiが返した「次回から追加するルール」
              <textarea className="input mt-1 min-h-32 w-full text-sm" value={newRules} onChange={(e) => setNewRules(e.target.value)} placeholder="箇条書きの追加ルールを貼り付け、人が内容を確認してから保存" />
            </label>
            <div className="flex flex-wrap items-end gap-2">
              <button type="button" className="btn btn-primary btn-sm" disabled={busy || !newRules.trim()} onClick={() => void saveRules()}><Save size={14} />新しい版として保存</button>
              {(format?.ocrPrompt?.versions.length ?? 0) > 1 && <label className="text-xs text-slate-600">過去の版を再利用
                <select className="input ml-2 w-auto text-xs" value={historyVersion} onChange={(e) => chooseHistory(e.target.value)}><option value="">選択</option>{format!.ocrPrompt!.versions.map((v) => <option key={v.version} value={v.version}>Ver.{v.version}{v.note ? `・${v.note.slice(0, 24)}` : ''}</option>)}</select>
              </label>}
            </div>
          </div>
        </details>
      </div>
    </details>
  );
}
