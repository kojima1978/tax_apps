// 取込の手順1:「取込できる形式」（依頼24）。列の表・決まり・ひな形・AI に渡す指示文。
// 中身は server/lib/import の columns.ts（列）と format.ts（決まり・ひな形・指示文）から作り、
// 分類名・キーワード・贈与の閾値は案件のいまの設定をサーバから取る（画面で分類名を持たない）

import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, ClipboardCopy, ClipboardPaste, Download, History, Save, Sparkles } from 'lucide-react';
import { IMPORT_COLUMNS } from '../../../server/lib/import/columns';
import { ERA_CHOICES, type EraChoice } from '../../../server/lib/import/eralessDates';
import { aiInstruction, extractGeminiResponse, IMPORT_RULES, promptImprovementRequest, templateCsv, type ImportFormat } from '../../../server/lib/import/format';
import { exportFileName } from '../../../server/lib/exportFileName';
import { Dialog } from '../../components/Dialog';
import { api, errorMessage, saveBlob } from '../../lib/api';

export const FORMAT_GUIDE_ID = 'import-format-guide';

function downloadTemplate() {
  // BOM を付ける（Excel で開いたときに文字化けしない）
  saveBlob(new Blob(['﻿', templateCsv()], { type: 'text/csv;charset=utf-8' }), exportFileName('取込のひな形', 'csv'));
}

type Props = { caseId: string; open: boolean; onToggle: (open: boolean) => void; variant: 'gemini' | 'file'; onPaste?: (csv: string) => void };

export function FormatGuide({ caseId, open, onToggle, variant, onPaste }: Props) {
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
  const [improveOpen, setImproveOpen] = useState(false);
  const [showInstruction, setShowInstruction] = useState(false);
  const [geminiResponse, setGeminiResponse] = useState('');

  const loadFormat = async () => {
    const next = await api.get<ImportFormat>(`/cases/${caseId}/import/format`);
    setFormat(next);
    return next;
  };
  useEffect(() => {
    setFormat(null);
    void loadFormat().catch((e) => setStatus({ ok: false, text: errorMessage(e) }));
  }, [caseId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fullInstruction = (f: ImportFormat) =>
    aiInstruction(f, { era: era || null, period }, { output: 'csv', extraRules: f.ocrPrompt?.currentRules, ocrOnly: true, includeImprovement: true });

  const copyInstruction = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const text = fullInstruction(format ?? (await loadFormat()));
      setInstruction(text);
      try {
        await navigator.clipboard.writeText(text);
        setShowInstruction(false);
        setStatus({ ok: true, text: '依頼文をコピーしました。Geminiへ通帳PDFと一緒に貼り付けてください。' });
      } catch {
        setShowInstruction(true);
        setStatus({ ok: false, text: 'コピーできませんでした。下の欄から選んでコピーしてください。' });
      }
    } catch (e) {
      setStatus({ ok: false, text: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  const useGeminiResponse = () => {
    setStatus(null);
    const parts = extractGeminiResponse(geminiResponse);
    if (!parts.csv) {
      setStatus({ ok: false, text: '取引データを見つけられませんでした。Geminiの回答全体、またはExcelでコピーした表を見出し行ごと貼り付けてください。' });
      return;
    }
    onPaste?.(parts.csv);
    if (parts.improvementDraft) setGeminiDraft(parts.improvementDraft);
    setStatus({
      ok: true,
      text: `貼り付け内容から取引データを取り出しました${parts.improvementDraft ? '。次回依頼文案も保存候補へ入れました' : ''}。「次へ」で内容を確認できます。`,
    });
  };

  const saveForExcel = () => {
    const parts = extractGeminiResponse(geminiResponse);
    if (!parts.csv) {
      setStatus({ ok: false, text: '保存できる取引データが見つかりませんでした。' });
      return;
    }
    saveBlob(new Blob(['\ufeff', parts.csv, '\r\n'], { type: 'text/csv;charset=utf-8' }), exportFileName('Gemini文字認識_修正用', 'csv'));
    setStatus({ ok: true, text: 'Excelで修正するためのCSVを保存しました。修正後は表全体をコピーして、同じ欄へ貼り付けられます。' });
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
      setImproveOpen(false);
    } catch (e) { setStatus({ ok: false, text: errorMessage(e) }); }
    finally { setBusy(false); }
  };

  const chooseHistory = (value: string) => {
    setHistoryVersion(value);
    const row = format?.ocrPrompt?.versions.find((v) => String(v.version) === value);
    if (row) { setNewRules(row.rules); setIssue(`Ver.${row.version} の内容へ戻す`); }
  };

  return (
    <div id={FORMAT_GUIDE_ID} className="mt-4 space-y-3">
      {variant === 'gemini' && <section className="rounded-lg border border-blue-200 bg-blue-50 p-4" aria-labelledby="ocrGeminiTitle">
        <div className="flex flex-wrap items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-700 text-white">
            <Sparkles size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 id="ocrGeminiTitle" className="font-semibold text-blue-950">Geminiで通帳PDFを読み取る</h3>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-blue-800">依頼文 Ver.{format?.ocrPrompt?.currentVersion ?? '－'}</span>
            </div>
            <p className="mt-0.5 text-sm text-blue-900">依頼文をGeminiへ貼り付け、返ってきた回答をこの画面へ貼り戻します。</p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center">
          <ol className="flex min-w-0 flex-1 flex-col gap-2 text-sm text-blue-950 sm:flex-row sm:items-center">
            <li className="flex items-center gap-2"><StepNumber n={1} /><span><strong>依頼文をコピー</strong></span></li>
            <ArrowRight size={15} className="hidden shrink-0 text-blue-400 sm:block" aria-hidden="true" />
            <li className="flex items-center gap-2"><StepNumber n={2} /><span><strong>PDFと一緒にGeminiへ</strong></span></li>
            <ArrowRight size={15} className="hidden shrink-0 text-blue-400 sm:block" aria-hidden="true" />
            <li className="flex items-center gap-2"><StepNumber n={3} /><span><strong>回答を貼り付け</strong></span></li>
          </ol>
          <button type="button" className="btn btn-primary" onClick={copyInstruction} disabled={busy}><ClipboardCopy size={16} />依頼文をコピー</button>
        </div>

        <div className="mt-4 rounded-md border border-blue-200 bg-white p-3">
          <label htmlFor="geminiResponse" className="font-medium text-slate-800">Geminiの回答・Excelの表を貼り付け</label>
          <p className="mt-0.5 text-xs text-slate-500">Geminiの回答全体、またはExcelで修正してコピーした表を貼れます。CSVと次回依頼文案は自動で分けます。</p>
          <textarea id="geminiResponse" className="input mt-2 min-h-32 w-full font-mono text-xs" value={geminiResponse} onChange={(e) => setGeminiResponse(e.target.value)} placeholder={'# 取引CSV\n```csv\n銀行名,支店名,…\n```\n# 次回依頼文案\n- …'} />
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className="btn btn-secondary" disabled={!geminiResponse.trim()} onClick={useGeminiResponse}><ClipboardPaste size={16} />取込データに追加</button>
            <button type="button" className="btn btn-secondary" disabled={!geminiResponse.trim()} onClick={saveForExcel}><Download size={16} />CSVを保存してExcelで修正</button>
          </div>
          <p className="mt-2 text-xs text-slate-500">追加後もすぐには保存されません。「次へ」から、口座情報と各取引を修正してから確定できます。</p>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-blue-200 pt-3 text-xs">
          <span className="inline-flex items-center gap-1 text-blue-900"><CheckCircle2 size={14} aria-hidden="true" />CSVの切り出しやファイル保存は不要</span>
          <button type="button" className="font-medium text-blue-800 underline underline-offset-2 hover:text-blue-950" onClick={() => { setStatus(null); setImproveOpen(true); }}>
            <History size={14} className="mr-1 inline" aria-hidden="true" />読み取り精度を改善
          </button>
          {instruction && <button type="button" className="text-blue-800 underline underline-offset-2 hover:text-blue-950" onClick={() => setShowInstruction((v) => !v)}>{showInstruction ? '依頼文を閉じる' : 'コピーした依頼文を確認'}</button>}
        </div>
        {status && <p role="status" className={`mt-3 rounded px-3 py-2 text-sm ${status.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>{status.text}</p>}
        {instruction && showInstruction && <textarea className="input mt-3 h-48 w-full font-mono text-xs" readOnly aria-label="Geminiに渡す指示文" value={instruction} onFocus={(e) => e.currentTarget.select()} />}
      </section>}

      {variant === 'file' && <details className="rounded border border-slate-200" open={open} onToggle={(e) => onToggle(e.currentTarget.open)}>
        <summary className="cursor-pointer px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">取込できるファイル形式・列を確認</summary>
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
          <p className="text-xs text-slate-500">元号が分からなければ、通帳の数字のまま読み取り、取込の手順3でまとめて指定できます。</p>
        </div>
      </details>}

      {variant === 'gemini' && <Dialog open={improveOpen} onClose={() => setImproveOpen(false)} title="Geminiの読み取り精度を改善" size="lg" footer={<button type="button" className="btn btn-secondary" onClick={() => setImproveOpen(false)}>閉じる</button>}>
        <div className="space-y-5 text-sm">
          <p className="rounded bg-blue-50 px-3 py-2 text-blue-900">誤読を見つけたときだけ行います。改善内容は次回以降の依頼文へ追加され、過去の版も残ります。</p>

          <section aria-labelledby="improveStep1">
            <h3 id="improveStep1" className="mb-2 flex items-center gap-2 font-semibold"><StepNumber n={1} />間違いを入力</h3>
            <label className="block text-sm text-slate-700">今回見つかった間違い・改善点
              <textarea data-autofocus className="input mt-1 min-h-24 w-full" value={issue} onChange={(e) => setIssue(e.target.value)} placeholder="例: 02年を平成2年と読んだが、表紙と前後ページから令和2年だった" />
            </label>
            <label className="mt-3 block text-sm text-slate-700">Geminiの「次回依頼文案」 <span className="text-xs text-slate-500">（回答貼り付け時に自動入力）</span>
              <textarea className="input mt-1 min-h-20 w-full" value={geminiDraft} onChange={(e) => setGeminiDraft(e.target.value)} placeholder="Geminiの回答に含まれた追加ルール案" />
            </label>
          </section>

          <section className="border-t border-slate-200 pt-4" aria-labelledby="improveStep2">
            <h3 id="improveStep2" className="mb-2 flex items-center gap-2 font-semibold"><StepNumber n={2} />Geminiへ改善を依頼</h3>
            <button type="button" className="btn btn-secondary" disabled={busy || !issue.trim()} onClick={() => void copyImprovement()}><ClipboardCopy size={16} />改善依頼をコピー</button>
            <p className="mt-1 text-xs text-slate-500">コピーした文章をGeminiへ貼り付け、返された追加ルールを次の欄へ貼り付けます。</p>
            {improvementRequest && status?.ok === false && <textarea className="input mt-2 h-32 w-full font-mono text-xs" readOnly value={improvementRequest} onFocus={(e) => e.currentTarget.select()} aria-label="Geminiへの改善依頼" />}
          </section>

          <section className="border-t border-slate-200 pt-4" aria-labelledby="improveStep3">
            <h3 id="improveStep3" className="mb-2 flex items-center gap-2 font-semibold"><StepNumber n={3} />確認して保存</h3>
            <label className="block text-sm text-slate-700">Geminiが返した追加ルール
              <textarea className="input mt-1 min-h-32 w-full" value={newRules} onChange={(e) => setNewRules(e.target.value)} placeholder="箇条書きの追加ルールを貼り付け、内容を確認してください" />
            </label>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <button type="button" className="btn btn-primary" disabled={busy || !newRules.trim()} onClick={() => void saveRules()}><Save size={16} />次回用として保存</button>
              {(format?.ocrPrompt?.versions.length ?? 0) > 1 && <label className="text-xs text-slate-600">過去の版を再利用
                <select className="input mt-1 block w-auto text-sm" value={historyVersion} onChange={(e) => chooseHistory(e.target.value)}><option value="">選択してください</option>{format!.ocrPrompt!.versions.map((v) => <option key={v.version} value={v.version}>Ver.{v.version}{v.note ? `・${v.note.slice(0, 24)}` : ''}</option>)}</select>
              </label>}
            </div>
          </section>
          {status && <p role="status" className={`rounded px-3 py-2 ${status.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>{status.text}</p>}
        </div>
      </Dialog>}
    </div>
  );
}

function StepNumber({ n }: { n: number }) {
  return <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-700 text-xs font-bold text-white" aria-hidden="true">{n}</span>;
}
