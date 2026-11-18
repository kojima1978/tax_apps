// 取込の手順1:「取込できる形式」（依頼24）。列の表・決まり・ひな形・AI に渡す指示文。
// 中身は server/lib/import の columns.ts（列）と format.ts（決まり・ひな形・指示文）から作り、
// 分類名・キーワード・贈与の閾値は案件のいまの設定をサーバから取る（画面で分類名を持たない）

import { useEffect, useState, type ReactNode } from 'react';
import { ArrowRight, ClipboardCopy, ClipboardPaste, Download, History, Save, Sparkles, Tags } from 'lucide-react';
import { IMPORT_COLUMNS } from '../../../server/lib/import/columns';
import { ERA_CHOICES, type EraChoice } from '../../../server/lib/import/eralessDates';
import { aiInstruction, classificationInstruction, extractGeminiResponse, extractImprovementResponse, IMPORT_RULES, templateCsv, type ImportFormat } from '../../../server/lib/import/format';
import { exportFileName } from '../../../server/lib/exportFileName';
import { Dialog } from '../../components/Dialog';
import { api, errorMessage, saveBlob } from '../../lib/api';

export const FORMAT_GUIDE_ID = 'import-format-guide';

function downloadTemplate() {
  // BOM を付ける（Excel で開いたときに文字化けしない）
  saveBlob(new Blob(['﻿', templateCsv()], { type: 'text/csv;charset=utf-8' }), exportFileName('取込のひな形', 'csv'));
}

type Props = { caseId: string; open: boolean; onToggle: (open: boolean) => void; variant: 'ai' | 'file'; onPaste?: (csv: string) => void };
type ImproveKind = 'ocr' | 'classification';

export function FormatGuide({ caseId, open, onToggle, variant, onPaste }: Props) {
  const [instruction, setInstruction] = useState<string | null>(null);
  const [format, setFormat] = useState<ImportFormat | null>(null);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  // 指示文に足す、分かっていること（任意。依頼27）
  const [era, setEra] = useState<EraChoice | ''>('');
  const [period, setPeriod] = useState('');
  const [newRules, setNewRules] = useState('');
  const [historyVersion, setHistoryVersion] = useState('');
  const [improveOpen, setImproveOpen] = useState(false);
  const [showInstruction, setShowInstruction] = useState(false);
  const [geminiResponse, setGeminiResponse] = useState('');
  const [classificationResponse, setClassificationResponse] = useState('');
  const [improveKind, setImproveKind] = useState<ImproveKind>('ocr');

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
  const fullClassificationInstruction = (f: ImportFormat) => classificationInstruction(f, f.classificationPrompt?.currentRules);

  const copyInstruction = async (kind: ImproveKind) => {
    setBusy(true);
    setStatus(null);
    try {
      const f = format ?? (await loadFormat());
      const text = kind === 'ocr' ? fullInstruction(f) : fullClassificationInstruction(f);
      setInstruction(text);
      try {
        await navigator.clipboard.writeText(text);
        setShowInstruction(false);
        setStatus({ ok: true, text: kind === 'ocr' ? '文字認識用の依頼文をコピーしました。利用するAIへ通帳PDFと一緒に貼り付けてください。' : '分類用の依頼文をコピーしました。利用するAIへ、修正済みの表と一緒に貼り付けてください。' });
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

  const useAiResponse = (kind: ImproveKind) => {
    setStatus(null);
    const raw = kind === 'ocr' ? geminiResponse : classificationResponse;
    const parts = extractGeminiResponse(raw);
    if (!parts.csv) {
      setStatus({ ok: false, text: '取引データを見つけられませんでした。AIの回答全体、またはスプレッドシートでコピーした表を見出し行ごと貼り付けてください。' });
      return;
    }
    if (kind === 'classification') onPaste?.(parts.csv);
    setStatus({
      ok: true,
      text: kind === 'ocr'
        ? '文字認識データを確認しました。スプレッドシートへコピーして内容を修正し、次の分類工程へ進んでください。'
        : '分類済みデータを取り込みました。「次へ」で内容を確認できます。',
    });
  };

  const saveForExcel = () => {
    const parts = extractGeminiResponse(geminiResponse);
    if (!parts.csv) {
      setStatus({ ok: false, text: '保存できる取引データが見つかりませんでした。' });
      return;
    }
    saveBlob(new Blob(['\ufeff', parts.csv, '\r\n'], { type: 'text/csv;charset=utf-8' }), exportFileName('AI文字認識_修正用', 'csv'));
    setStatus({ ok: true, text: 'Excelで列ごとに開けるCSVを保存しました。内容を確認・修正してから分類工程へ進んでください。' });
  };

  const saveRules = async () => {
    setBusy(true); setStatus(null);
    try {
      const improved = extractImprovementResponse(newRules);
      if (!improved.rules) throw new Error('改善後のルール全文を貼り付けてください。');
      const endpoint = improveKind === 'ocr' ? 'ocr-prompt' : 'classification-prompt';
      const note = (improved.changes || 'AIが生成した改善後のルール全文').slice(0, 1000);
      const res = await api.post<{ version: number; message: string }>(`/cases/${caseId}/import/${endpoint}`, { rules: improved.rules, note });
      setStatus({ ok: true, text: res.message });
      const next = await loadFormat();
      setInstruction(improveKind === 'ocr' ? fullInstruction(next) : fullClassificationInstruction(next));
      setNewRules('');
      setImproveOpen(false);
    } catch (e) { setStatus({ ok: false, text: errorMessage(e) }); }
    finally { setBusy(false); }
  };

  const chooseHistory = (value: string) => {
    setHistoryVersion(value);
    const history = improveKind === 'ocr' ? format?.ocrPrompt : format?.classificationPrompt;
    const row = history?.versions.find((v) => String(v.version) === value);
    if (row) setNewRules(row.rules);
  };

  const openImprovement = (kind: ImproveKind) => {
    const raw = kind === 'ocr' ? geminiResponse : classificationResponse;
    const hasImprovedRules = /^#{1,6}\s*改善後のルール全文\s*$/m.test(raw);
    setImproveKind(kind); setNewRules(hasImprovedRules ? raw : ''); setHistoryVersion(''); setStatus(null); setImproveOpen(true);
  };

  const currentImprovementRules = improveKind === 'ocr' ? format?.ocrPrompt?.currentRules ?? '' : format?.classificationPrompt?.currentRules ?? '';
  const parsedImprovement = extractImprovementResponse(newRules);
  const improvementDiff = ruleLineDiff(currentImprovementRules, parsedImprovement.rules);

  return (
    <div id={FORMAT_GUIDE_ID} className="mt-4 space-y-3">
      {variant === 'ai' && <section className="space-y-3" aria-labelledby="aiImportTitle">
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <h3 id="aiImportTitle" className="font-semibold text-blue-950">AIで2段階処理</h3>
          <p className="mt-1 text-sm text-blue-900">文字認識と分類を分けることで、結果を確認しながら精度を改善できます。Gemini・ChatGPT・Claudeなどで利用できます。</p>
          <ol className="mt-3 flex flex-col gap-2 text-sm text-blue-950 sm:flex-row sm:items-center">
            <li className="flex items-center gap-2"><StepNumber n={1} /><strong>PDFを文字認識</strong></li>
            <ArrowRight size={15} className="hidden text-blue-400 sm:block" aria-hidden="true" />
            <li className="flex items-center gap-2"><StepNumber n={2} /><strong>表を確認・修正</strong></li>
            <ArrowRight size={15} className="hidden text-blue-400 sm:block" aria-hidden="true" />
            <li className="flex items-center gap-2"><StepNumber n={3} /><strong>項目分類</strong></li>
          </ol>
        </div>

        <AiStageCard icon={<Sparkles size={18} />} number="1" title="PDFを文字認識" version={format?.ocrPrompt?.currentVersion} tone="blue">
          <p className="text-sm text-slate-600">文字認識用の依頼文と通帳PDFをAIへ渡し、返されたCSVを貼り付けます。この工程では分類しません。</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary" onClick={() => void copyInstruction('ocr')} disabled={busy}><ClipboardCopy size={16} />文字認識の依頼文をコピー</button>
            <button type="button" className="btn btn-secondary" onClick={() => openImprovement('ocr')}><History size={16} />文字認識の精度を改善</button>
          </div>
          <label htmlFor="ocrResponse" className="mt-4 block font-medium text-slate-800">AIの文字認識結果を貼り付け</label>
          <textarea id="ocrResponse" className="input mt-2 min-h-28 w-full font-mono text-xs" value={geminiResponse} onChange={(e) => setGeminiResponse(e.target.value)} placeholder={'# 取引CSV\n```csv\n日付,摘要,払戻額,お預り額,…\n```'} />
          <button type="button" className="btn btn-secondary mt-2" disabled={!geminiResponse.trim()} onClick={saveForExcel}><Download size={16} />Excelで開けるCSVを保存</button>
          <p className="mt-2 text-xs text-slate-500">説明文やMarkdownを除いてCSV部分だけを保存します。ExcelでPDFと照合し、間違いがあれば同じAIの会話で直接指摘してください。</p>
        </AiStageCard>

        <AiStageCard icon={<Tags size={18} />} number="2" title="取引を項目別に分類" version={format?.classificationPrompt?.currentVersion} tone="indigo">
          <p className="text-sm text-slate-600">分類用の依頼文と、修正済みの表をAIへ渡します。案件の分類項目・キーワード・基準は依頼文へ自動で入ります。</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary" onClick={() => void copyInstruction('classification')} disabled={busy}><ClipboardCopy size={16} />分類の依頼文をコピー</button>
            <button type="button" className="btn btn-secondary" onClick={() => openImprovement('classification')}><History size={16} />分類精度を改善</button>
          </div>
          <label htmlFor="classificationResponse" className="mt-4 block font-medium text-slate-800">AIの分類結果を貼り付け</label>
          <textarea id="classificationResponse" className="input mt-2 min-h-28 w-full font-mono text-xs" value={classificationResponse} onChange={(e) => setClassificationResponse(e.target.value)} placeholder={'# 分類済みCSV\n```csv\n日付,摘要,払戻額,お預り額,…,分類\n```'} />
          <button type="button" className="btn btn-primary mt-2" disabled={!classificationResponse.trim()} onClick={() => useAiResponse('classification')}><ClipboardPaste size={16} />分類済みデータを取り込む</button>
          <p className="mt-2 text-xs text-slate-500">分類間違いも同じAIの会話で直接指摘します。AIには分類列だけを変更し、日付・摘要・金額・行順を変えないよう指示します。</p>
        </AiStageCard>

        {status && <p role="status" className={`rounded px-3 py-2 text-sm ${status.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>{status.text}</p>}
        {instruction && showInstruction && <textarea className="input h-48 w-full font-mono text-xs" readOnly aria-label="AIに渡す依頼文" value={instruction} onFocus={(e) => e.currentTarget.select()} />}
        {instruction && <button type="button" className="text-sm text-blue-800 underline underline-offset-2" onClick={() => setShowInstruction((v) => !v)}>{showInstruction ? '依頼文を閉じる' : '最後にコピーした依頼文を確認'}</button>}
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

      {variant === 'ai' && <Dialog open={improveOpen} onClose={() => setImproveOpen(false)} title={improveKind === 'ocr' ? '文字認識の精度を改善' : '分類の精度を改善'} size="lg" footer={<button type="button" className="btn btn-secondary" onClick={() => setImproveOpen(false)}>閉じる</button>}>
        <div className="space-y-4 text-sm">
          <p className="rounded bg-blue-50 px-3 py-2 text-blue-900">間違いの修正と改善文の作成は、利用中のAIとの同じ会話で行います。正しい結果になった後、AIが返した改善部分だけをここへ登録します。</p>

          <label className="block font-medium text-slate-800">AIが出力した改善結果
            <textarea data-autofocus className="input mt-1 min-h-44 w-full" value={newRules} onChange={(e) => setNewRules(e.target.value)} placeholder={'# 改善後のルール全文\n- 過去の有効なルールを含む全文\n\n# 今回の変更点\n- 追加・整理した内容'} />
          </label>
          <p className="text-xs text-slate-500">修正済みCSVを含むAIの回答全体を貼り付けても、改善ルールと変更点だけを取り出します。</p>

          {parsedImprovement.changes && <div className="rounded bg-slate-50 px-3 py-2 text-slate-700"><strong className="block text-xs">今回の変更点</strong><p className="mt-1 whitespace-pre-wrap text-xs">{parsedImprovement.changes}</p></div>}

          {parsedImprovement.rules && <section className="rounded border border-slate-200 p-3" aria-labelledby="ruleDiffTitle">
            <h3 id="ruleDiffTitle" className="font-semibold text-slate-800">現在のルールとの差</h3>
            {improvementDiff.added.length === 0 && improvementDiff.removed.length === 0
              ? <p className="mt-2 text-sm text-amber-800">現在のルールと同じ内容です。</p>
              : <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <RuleDiffList title={`追加・変更 ${improvementDiff.added.length}件`} lines={improvementDiff.added} tone="add" />
                  <RuleDiffList title={`削除 ${improvementDiff.removed.length}件`} lines={improvementDiff.removed} tone="remove" />
                </div>}
          </section>}

          <div className="flex flex-wrap items-end gap-3">
            <button type="button" className="btn btn-primary" disabled={busy || !parsedImprovement.rules || (improvementDiff.added.length === 0 && improvementDiff.removed.length === 0)} onClick={() => void saveRules()}><Save size={16} />次回用として保存</button>
            {((improveKind === 'ocr' ? format?.ocrPrompt : format?.classificationPrompt)?.versions.length ?? 0) > 1 && <label className="text-xs text-slate-600">過去の版を再利用
              <select className="input mt-1 block w-auto text-sm" value={historyVersion} onChange={(e) => chooseHistory(e.target.value)}><option value="">選択してください</option>{(improveKind === 'ocr' ? format!.ocrPrompt! : format!.classificationPrompt!).versions.map((v) => <option key={v.version} value={v.version}>Ver.{v.version}{v.note ? `・${v.note.slice(0, 24)}` : ''}</option>)}</select>
            </label>}
          </div>
          {status && <p role="status" className={`rounded px-3 py-2 ${status.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>{status.text}</p>}
        </div>
      </Dialog>}
    </div>
  );
}

function StepNumber({ n }: { n: number }) {
  return <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-700 text-xs font-bold text-white" aria-hidden="true">{n}</span>;
}

function AiStageCard({ icon, number, title, version, tone, children }: { icon: ReactNode; number: string; title: string; version?: number; tone: 'blue' | 'indigo'; children: ReactNode }) {
  const colors = tone === 'blue' ? 'border-blue-200 bg-blue-50/40 text-blue-700' : 'border-indigo-200 bg-indigo-50/40 text-indigo-700';
  const iconColor = tone === 'blue' ? 'bg-blue-700' : 'bg-indigo-700';
  return <section className={`rounded-lg border bg-white p-4 ${colors}`} aria-labelledby={`aiStage${number}`}>
    <div className="flex items-center gap-3">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white ${iconColor}`} aria-hidden="true">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h4 id={`aiStage${number}`} className="font-semibold text-slate-900">{number}. {title}</h4>
          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium">依頼文 Ver.{version ?? '－'}</span>
        </div>
      </div>
    </div>
    <div className="mt-3 text-slate-800">{children}</div>
  </section>;
}

function ruleLineDiff(current: string, next: string) {
  const lines = (value: string) => value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const currentLines = lines(current);
  const nextLines = lines(next);
  const currentSet = new Set(currentLines);
  const nextSet = new Set(nextLines);
  return {
    added: nextLines.filter((line) => !currentSet.has(line)),
    removed: currentLines.filter((line) => !nextSet.has(line)),
  };
}

function RuleDiffList({ title, lines, tone }: { title: string; lines: string[]; tone: 'add' | 'remove' }) {
  const colors = tone === 'add' ? 'bg-emerald-50 text-emerald-900' : 'bg-rose-50 text-rose-900';
  return <div className={`rounded px-3 py-2 ${colors}`}>
    <strong className="text-xs">{title}</strong>
    {lines.length > 0 ? <ul className="mt-1 max-h-32 list-disc space-y-1 overflow-y-auto pl-4 text-xs">{lines.map((line) => <li key={line}>{line}</li>)}</ul> : <p className="mt-1 text-xs">なし</p>}
  </div>;
}
