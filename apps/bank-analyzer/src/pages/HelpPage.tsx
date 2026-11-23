import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, DatabaseBackup, FileSpreadsheet, FileUp, ListChecks, MessageSquareText, Search } from 'lucide-react';
import { Breadcrumb } from '../components/Layout';

const topics = [
  { id: 'start', label: '案件を作る' },
  { id: 'import', label: '通帳を取り込む' },
  { id: 'review', label: '取引を整理する' },
  { id: 'analysis', label: '分析する' },
  { id: 'questions', label: '質問をまとめる' },
  { id: 'export', label: '資料を出力する' },
] as const;

export function HelpPage() {
  useEffect(() => window.scrollTo(0, 0), []);
  return <div className="mx-auto max-w-5xl px-4 py-6 text-slate-800 sm:px-6 sm:py-8">
    <Breadcrumb items={[{ label: '案件一覧', to: '/' }, { label: '使い方' }]} />
    <div className="flex items-start gap-3">
      <span className="rounded-lg bg-blue-100 p-2 text-blue-800" aria-hidden="true"><BookOpen size={24} /></span>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">使い方</h1>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">通帳データの取込から、未分類の整理・お客様への質問・分類別Excelの出力までの流れです。</p>
      </div>
    </div>

    <nav className="card mt-6 p-4" aria-label="使い方の項目">
      <h2 className="text-sm font-semibold text-slate-900">知りたい操作へ</h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {topics.map((topic, i) => <a key={topic.id} href={`#${topic.id}`} className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-blue-800 hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
          <span className="font-semibold text-slate-500">{i + 1}.</span>{topic.label}<ArrowRight size={14} className="ml-auto" aria-hidden="true" />
        </a>)}
      </div>
    </nav>

    <div className="mt-6 space-y-4">
      <HelpSection id="start" icon={<BookOpen size={19} />} number="1" title="案件を作る">
        <p>「新規案件」でお客様名を登録します。案件を開いたら、概要で基準日（相続開始日）や分析期間を確認してください。</p>
        <Link to="/?new=1" className="mt-2 inline-flex items-center gap-1 font-medium text-blue-800 underline underline-offset-2 hover:text-blue-950">新規案件を作る <ArrowRight size={15} aria-hidden="true" /></Link>
      </HelpSection>

      <HelpSection id="import" icon={<FileUp size={19} />} number="2" title="通帳を取り込む">
        <p>案件の「データを追加」から取込画面へ進み、方法を選びます。作成済みのCSV・Excelはそのまま選択できます。通帳PDFはアプリ内では読み取らず、外部AIで文字認識・分類した結果を取り込みます。</p>
        <ol className="mt-3 list-decimal space-y-1 pl-5">
          <li>「AIで文字認識・分類」で日付の元号を確認し、文字認識の依頼文とPDFをAIへ渡す。</li>
          <li>返されたCSVをPDFと照合し、誤りを直してから分類の依頼文と一緒にAIへ渡す。</li>
          <li>分類済みCSVを貼り付け、「次へ」で口座・取引を確認して取込を確定する。</li>
        </ol>
        <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-950">例：通帳の「30－03－21」が平成30年なら元号で「平成」を選びます。不明・混在なら推測せず、取込時に確認します。</p>
      </HelpSection>

      <HelpSection id="review" icon={<ListChecks size={19} />} number="3" title="取引を整理する">
        <p>「未分類」で個別取引を確認し、分類を付けます。「分類候補」はまとめて確認できますが、候補の適用とパターン登録は別の操作です。「取引一覧・検索」では日付・摘要・金額などから探せます。</p>
        <p className="mt-2">分類を誤って変更した場合は、直前の変更を「元に戻す」から取り消せます。重要な取引は元の通帳とも照合してください。</p>
      </HelpSection>

      <HelpSection id="analysis" icon={<Search size={19} />} number="4" title="分析する">
        <p>概要で入出金や月次の傾向を確認します。「資金移動フロー」は口座間の動きを追うための画面です。気になる金額や相手先があれば、取引一覧で明細まで戻って確認します。</p>
      </HelpSection>

      <HelpSection id="questions" icon={<MessageSquareText size={19} />} number="5" title="質問をまとめる">
        <p>説明が必要な取引は「質問候補」に追加します。取引は一覧から消えません。質問メモを記入した取引を、お客様に確認する書面として出力できます。</p>
      </HelpSection>

      <HelpSection id="export" icon={<FileSpreadsheet size={19} />} number="6" title="資料を出力・保管する">
        <p>案件メニューの「分類別Excel出力」から、分類ごとのシートを含む成果物を作れます。「通帳有無一覧表」は資料の揃い具合の確認に使います。</p>
        <p className="mt-2 flex items-start gap-2"><DatabaseBackup size={17} className="mt-0.5 shrink-0 text-slate-500" aria-hidden="true" />案件ごとの「JSONバックアップ」と、案件一覧の「全案件をJSON書き出し」「JSONから復元」は、データの保管・移行に使います。</p>
      </HelpSection>
    </div>

    <div className="mt-6 flex flex-wrap gap-2">
      <Link to="/" className="btn btn-primary">案件一覧へ戻る <ArrowRight size={16} aria-hidden="true" /></Link>
      <Link to="/settings" className="btn btn-secondary">分類パターンなどの設定</Link>
    </div>
  </div>;
}

function HelpSection({ id, icon, number, title, children }: { id: string; icon: ReactNode; number: string; title: string; children: ReactNode }) {
  return <section id={id} className="card scroll-mt-20 p-4 sm:p-5" aria-labelledby={`${id}-title`}>
    <h2 id={`${id}-title`} className="flex items-center gap-2 text-lg font-semibold text-slate-900">
      <span className="text-blue-700" aria-hidden="true">{icon}</span><span className="text-sm text-slate-500">{number}.</span>{title}
    </h2>
    <div className="mt-3 space-y-1 text-sm leading-relaxed text-slate-700">{children}</div>
  </section>;
}
