import { Link } from 'react-router-dom';
import { FileText, FileSpreadsheet, FileIcon, Download, ArrowLeft, Home } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useDarkMode } from '@/hooks/useDarkMode';
import { Sun, Moon } from 'lucide-react';

type Resource = {
  id: string;
  title: string;
  description: string;
  filename: string;
  downloadName: string;
  icon: LucideIcon;
};

const RESOURCES: Resource[] = [
  {
    id: 'schedule',
    title: '相続・手続きスケジュール',
    description: '葬儀を終えた後の相続手続きの流れとスケジュール（14日以内〜1年以内）',
    filename: 'schedule.pdf',
    downloadName: '相続手続きスケジュール.pdf',
    icon: FileText,
  },
  {
    id: 'checklist',
    title: '手続き＆チェックリスト',
    description: '相続発生後に必要な各種届出・手続きの一覧と提出先・相談先',
    filename: 'checklist.pdf',
    downloadName: '相続手続きチェックリスト.pdf',
    icon: FileText,
  },
  {
    id: 'after-support',
    title: '相続税申告後サポート',
    description: '二次相続対策・資産運用・不動産見直しなど申告後のサポート案内',
    filename: 'after-support.pdf',
    downloadName: '相続後のアフターサポート.pdf',
    icon: FileText,
  },
  {
    id: 'life-insurance',
    title: '保険を使った相続税対策',
    description: '生命保険の非課税枠や生前贈与を組み合わせた節税方法の解説',
    filename: 'life-insurance.pdf',
    downloadName: '生命保険を使った相続税対策.pdf',
    icon: FileText,
  },
  {
    id: 'real-estate-risk',
    title: '不動産リスク診断チェック表',
    description: '保有不動産のリスクを10項目でチェックできる診断シート',
    filename: 'real-estate-risk-check.pdf',
    downloadName: '不動産リスク診断チェックシート.pdf',
    icon: FileText,
  },
  {
    id: 'household-family',
    title: '生計一親族チェックリスト',
    description: '生計を一にする親族の判定に使用するチェックリスト',
    filename: 'household-family-checklist.xlsx',
    downloadName: '生計一親族チェックリスト.xlsx',
    icon: FileSpreadsheet,
  },
  {
    id: 'nominee-deposit',
    title: '名義預金、生前贈与について',
    description: '名義預金の基礎知識・具体例と申告しない場合のペナルティの解説',
    filename: 'nominee-deposit.pdf',
    downloadName: '名義預金、生前贈与について.pdf',
    icon: FileText,
  },
  {
    id: 'deposit-transfer',
    title: '預金移動調査について',
    description: '預金移動調査の目的・必要性判定フローチャートとお預かり資料の案内',
    filename: 'deposit-transfer-survey.pdf',
    downloadName: '預金移動調査について.pdf',
    icon: FileText,
  },
  {
    id: 'gift-contract',
    title: '贈与契約書ひな形',
    description: '贈与契約書のひな形テンプレート',
    filename: 'gift-contract-template.doc',
    downloadName: '贈与契約書ひな形.doc',
    icon: FileIcon,
  },
  {
    id: 'undivided-declaration',
    title: '未分割申告の確認書',
    description: '遺産が未分割の場合の申告に関する確認書',
    filename: 'undivided-declaration-confirmation.docx',
    downloadName: '未分割申告の確認書.docx',
    icon: FileIcon,
  },
];

export const ResourcesPage = () => {
  const basePath = import.meta.env.BASE_URL;
  const { isDark, toggleDark } = useDarkMode();

  return (
    <div className="w-full animate-fade-in">
      {/* ヘッダー */}
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <a href="/" className="flex items-center gap-1 text-slate-400 hover:text-emerald-600 transition-colors" title="ポータルに戻る">
                <Home className="h-5 w-5" />
                <span className="hidden md:inline text-sm font-medium">ポータル</span>
              </a>
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <Link to="/" className="flex items-center gap-1 text-slate-400 hover:text-emerald-600 transition-colors" title="書類リストに戻る">
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm font-medium">書類リスト</span>
              </Link>
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">参考資料</h1>
            </div>
            <button
              onClick={toggleDark}
              className="p-1.5 rounded text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              aria-label={isDark ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
            >
              {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* カード一覧 */}
      <div className="p-4 md:px-8 md:py-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            相続手続きに関する参考資料をダウンロードできます。
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            {RESOURCES.map((resource) => (
              <a
                key={resource.id}
                href={`${basePath}files/${resource.filename}`}
                download={resource.downloadName}
                className="group flex items-start gap-4 p-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-600 transition-all"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/50 transition-colors">
                  <resource.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                    {resource.title}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {resource.description}
                  </p>
                </div>
                <div className="flex-shrink-0 self-center text-slate-400 dark:text-slate-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  <Download className="w-4 h-4" />
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
