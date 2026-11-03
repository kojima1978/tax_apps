import { Link } from 'react-router-dom';
import { ArrowLeft, Home, Moon, Printer, Sun } from 'lucide-react';
import { useDarkMode } from '@/hooks/useDarkMode';
import { HELP_SECTIONS, type HelpBlock } from '@/constants/helpContent';

// 使い方（/help）。本文は helpContent.ts の節の配列で、ここは描くだけ。
// 印刷は globals.css の .help-doc 以下に閉じた規則で A4 縦・複数ページに流す。

const TEXT_CLASS = 'text-sm leading-relaxed text-slate-700 dark:text-slate-300';
const CELL_BORDER = 'border border-slate-300 dark:border-slate-600';

function HelpBlockView({ block }: { block: HelpBlock }) {
  switch (block.kind) {
    case 'paragraph':
      return <p className={TEXT_CLASS}>{block.text}</p>;
    case 'list':
      return (
        <ul className={`ml-5 list-disc space-y-1.5 ${TEXT_CLASS}`}>
          {block.items.map((item) => <li key={item}>{item}</li>)}
        </ul>
      );
    case 'steps':
      return (
        <ol className={`ml-5 list-decimal space-y-1.5 ${TEXT_CLASS}`}>
          {block.items.map((item) => <li key={item}>{item}</li>)}
        </ol>
      );
    case 'table':
      return (
        <div className="help-table-wrap overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            {block.caption && (
              <caption className="mb-1.5 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">{block.caption}</caption>
            )}
            <thead>
              <tr>
                {block.headers.map((header) => (
                  <th key={header} scope="col" className={`${CELL_BORDER} bg-slate-100 dark:bg-slate-700 px-2.5 py-2 text-left align-top font-semibold text-slate-800 dark:text-slate-100`}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row) => (
                <tr key={row.join('|')}>
                  {row.map((cell, index) => (
                    <td key={index} className={`${CELL_BORDER} px-2.5 py-2 align-top leading-relaxed text-slate-700 dark:text-slate-300`}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'note':
      return (
        <p className="help-note rounded-lg border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 px-3 py-2.5 text-sm leading-relaxed text-amber-900 dark:text-amber-200">
          <span className="font-semibold">注意　</span>{block.text}
        </p>
      );
  }
}

export function HelpPage() {
  const { isDark, toggleDark } = useDarkMode();

  return (
    <div className="w-full animate-fade-in">
      <div className="no-print sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <a href="/" className="flex items-center justify-center gap-1 min-h-6 min-w-6 text-slate-500 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors" title="ポータルに戻る">
                <Home className="h-5 w-5" />
                <span className="hidden md:inline text-sm font-medium">ポータル</span>
              </a>
              <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">|</span>
              <Link to="/" className="flex items-center justify-center gap-1 min-h-6 min-w-6 text-slate-500 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors" title="書類リストに戻る">
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm font-medium">書類リスト</span>
              </Link>
              <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">|</span>
              <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">使い方</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors"
              >
                <Printer className="w-3.5 h-3.5" aria-hidden="true" /> 印刷
              </button>
              <button
                type="button"
                onClick={toggleDark}
                className="p-1.5 rounded text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                aria-label={isDark ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
              >
                {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="help-doc mx-auto max-w-6xl px-4 py-6 lg:py-8">
        <div className="mb-6">
          <h2 className="help-doc-title text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">必要書類管理の使い方</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            書類リストの作り方から委任状・マスタ管理までをまとめたものです。右上の「印刷」で A4 縦の紙に出せます（複数枚になります）。
          </p>
        </div>

        <div className="gap-8 lg:flex lg:items-start">
          <nav aria-labelledby="help-toc-heading" className="help-toc mb-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 lg:sticky lg:top-16 lg:mb-0 lg:w-72 lg:shrink-0">
            <h2 id="help-toc-heading" className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">目次</h2>
            <ol className="space-y-1">
              {HELP_SECTIONS.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`} className="block rounded-md px-2 py-1.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100">
                    <span className="font-medium">{section.title}</span>
                    <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{section.summary}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="min-w-0 flex-1 space-y-6">
            {HELP_SECTIONS.map((section) => (
              <section
                key={section.id}
                id={section.id}
                aria-labelledby={`${section.id}-heading`}
                className="help-section scroll-mt-16 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 sm:p-5"
              >
                <h2 id={`${section.id}-heading`} className="text-lg font-semibold text-slate-900 dark:text-slate-100">{section.title}</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{section.summary}</p>
                <div className="mt-4 space-y-3.5">
                  {section.blocks.map((block, index) => <HelpBlockView key={index} block={block} />)}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
