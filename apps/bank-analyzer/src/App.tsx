import { useEffect, useState } from 'react';
import { fetchCases, type CaseSummary } from './api';

// 段階2（土台）の確認用の画面。画面・API・DB が1本につながっていることだけを見せる。
// 本来の画面（案件一覧 → 取込ウィザード → 分析）は段階5で作る。
export default function App() {
  const [cases, setCases] = useState<CaseSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCases()
      .then(setCases)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  return (
    <main className="mx-auto max-w-3xl p-6 text-slate-800">
      <h1 className="text-xl font-bold">銀行取引分析（React 版・移行中）</h1>
      <p className="mt-1 text-sm text-slate-500">
        いまお使いの画面は <a className="text-blue-700 underline" href="/bank-analyzer/">/bank-analyzer/</a> です。
        こちらは移行作業中の新しい版で、まだ機能はありません。
      </p>

      <section className="mt-6">
        <h2 className="font-semibold">案件</h2>
        {error !== null && <p className="mt-2 text-red-700">{error}</p>}
        {error === null && cases === null && <p className="mt-2 text-slate-500">読み込み中…</p>}
        {cases !== null && cases.length === 0 && <p className="mt-2 text-slate-500">案件はまだありません。</p>}
        {cases !== null && cases.length > 0 && (
          <ul className="mt-2 divide-y divide-slate-200 rounded border border-slate-200">
            {cases.map((c) => (
              <li key={c.id} className="flex justify-between px-3 py-2">
                <span>{c.name}</span>
                <span className="text-sm text-slate-500">{c.transactionCount.toLocaleString()} 件</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
