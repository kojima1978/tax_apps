// お客様への確認事項。質問候補タブでメモ（質問文）を書いた取引を、お客様へ渡す書面にする。
// ヘッダーの無い別タブで開く印刷用の画面（A4 横・複数ページ）。
//
// - 行と並びは質問候補タブと同じ（?keyword= ?sort= をそのまま受ける）。中身はサーバの
//   questionSheet が作り、Excel も同じものから作る（services/questions.ts）
// - メモが空の質問候補は出さない（事務所内の覚え書きの段階。件数だけ帯に出す）
// - 口座番号は下4桁だけ（lib/questions.ts）
// - 2ページ目からも表の見出しが出る（thead）。行はページをまたがせない
// - 「預金取引確認のご案内」（/letter）は案件によらない1枚の案内で、この書面とは別紙。
//   一緒に渡すことが多いので、帯から開けるようにしてある

import { useEffect } from 'react';
import { ArrowLeft, Download, Mail, Printer } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { CompanySwitcher } from '@/shared/staff-directory/CompanySwitcher';
import { useCompanyInfo } from '@/shared/staff-directory/company';
import { DownloadButton } from '../components/DownloadButton';
import { useApiData } from '../hooks/useApiData';
import { api } from '../lib/api';
import { num, yen } from '../lib/format';
import { QUESTION_SHEET_COLUMNS, QUESTION_SHEET_INTRO, QUESTION_SHEET_TITLE } from '../../server/lib/questions';

// サーバーの型から引くと Prisma の型まで画面側の型検査に入るので書き写す（services/questions.ts の QuestionSheet）
type Sheet = {
  case: { id: number; name: string };
  createdOn: string;
  rows: {
    no: number;
    id: number;
    date: string;
    accountLines: string[];
    description: string;
    amountOut: number;
    amountIn: number;
    question: string;
  }[];
  skippedCount: number;
};

const SANS = { fontFamily: "'Noto Sans JP', 'Yu Gothic', 'Meiryo', sans-serif" };

// 列の幅（mm。A4 横の印字幅 277mm に合わせてある）と寄せ方。並びは QUESTION_SHEET_COLUMNS と同じ
const COLUMNS = [
  { width: 9, align: 'text-center' },
  // 日付は「平成29年10月21日」が1行に収まる幅（折り返すと「日」だけ次の行へ落ちる）
  { width: 32, align: 'text-left whitespace-nowrap' },
  { width: 36, align: 'text-left' },
  { width: 34, align: 'text-left' },
  { width: 23, align: 'text-right' },
  { width: 23, align: 'text-right' },
  { width: 63, align: 'text-left' },
  { width: 57, align: 'text-left' },
] as const;

// @page と改ページは Tailwind で書けないのでここだけ CSS。
// 見出しの薄い網掛けは印刷でも残す（帳票の共通ルールで可としている範囲）
const PAGE_CSS = `
@media print {
  @page { size: A4 landscape; margin: 10mm; }
  .q-sheet thead { display: table-header-group; }
  .q-sheet tr { break-inside: avoid; page-break-inside: avoid; }
  .q-sheet th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
.q-sheet { border-collapse: collapse; table-layout: fixed; width: 277mm; }
.q-sheet th, .q-sheet td { border: 0.3mm solid #000; padding: 1.2mm 1.5mm; vertical-align: top; overflow-wrap: anywhere; }
.q-sheet th { background: #f1f5f9; font-weight: 700; text-align: center; vertical-align: middle; }
.q-sheet td { height: 18mm; }
`;

export function QuestionLetterPage() {
  const { caseId } = useParams();
  const [params] = useSearchParams();
  const { company } = useCompanyInfo();

  // 質問候補タブから引き継ぐ条件（それ以外は送らない）
  const query = new URLSearchParams();
  for (const k of ['keyword', 'sort'] as const) {
    const v = params.get(k);
    if (v) query.set(k, v);
  }
  const queryText = query.toString();
  const { data, error, loading } = useApiData(`questions-${caseId}-${queryText}`, () =>
    api.get<{ sheet: Sheet }>(`/cases/${caseId}/questions${queryText ? `?${queryText}` : ''}`),
  );
  const sheet = data?.sheet ?? null;

  useEffect(() => {
    // 印刷すると用紙の端にも出る題・PDF に保存するときのファイル名になるので、アプリ名のままにしない
    if (!sheet) return;
    const before = document.title;
    document.title = `${sheet.case.name}_${QUESTION_SHEET_TITLE}`;
    return () => {
      document.title = before;
    };
  }, [sheet]);

  const backTo = { pathname: `/cases/${caseId}`, search: new URLSearchParams({ tab: 'flagged', ...Object.fromEntries(query) }).toString() };
  const excelParams = new URLSearchParams(query);
  excelParams.set('firm', company.name);
  const keyword = params.get('keyword');

  return (
    <div className="min-h-screen bg-slate-200 text-black print:bg-transparent" style={SANS}>
      <style>{PAGE_CSS}</style>

      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-slate-300 bg-white px-4 py-2 shadow-sm print:hidden">
        <Link to={backTo} className="btn btn-secondary">
          <ArrowLeft size={16} />
          質問候補へ戻る
        </Link>
        <button type="button" onClick={() => window.print()} className="btn btn-primary" disabled={!sheet || sheet.rows.length === 0}>
          <Printer size={16} />
          印刷
        </button>
        {sheet && sheet.rows.length > 0 && (
          <DownloadButton
            path={`/cases/${caseId}/export/xlsx/questions`}
            params={excelParams}
            className="btn btn-secondary"
            title="同じ内容を Excel で書き出します（メールで送り、回答を書き込んでもらえます）"
          >
            <Download size={16} aria-hidden="true" />
            Excel
          </DownloadButton>
        )}
        <a
          href={`${import.meta.env.BASE_URL}letter`}
          target="_blank"
          rel="noopener"
          className="btn btn-secondary"
          title="一緒にお渡しする「預金取引確認のご案内」（別紙・案件によらない1枚）を開きます"
        >
          <Mail size={16} aria-hidden="true" />
          ご案内（別紙）
        </a>
        {sheet && (
          <span className="text-xs text-slate-600">
            {num(sheet.rows.length)}件{keyword && `（「${keyword}」で絞り込み中）`}
            {sheet.skippedCount > 0 && ` ／ メモが空の${num(sheet.skippedCount)}件は出していません`}
          </span>
        )}
        <CompanySwitcher className="ml-auto" />
      </div>

      {error && <p className="mx-auto my-6 max-w-xl rounded bg-red-50 px-3 py-2 text-sm text-red-800 print:hidden">{error}</p>}
      {loading && !sheet && <p className="py-10 text-center text-slate-500 print:hidden">読み込み中…</p>}

      {sheet && sheet.rows.length === 0 && (
        <p className="mx-auto my-6 max-w-xl rounded bg-white px-4 py-6 text-center text-sm text-slate-700 shadow-sm">
          書面に出す質問がありません。質問候補のメモに質問を書くと、ここに出ます。
        </p>
      )}

      {sheet && sheet.rows.length > 0 && (
        // 紙の幅は保ったまま、狭い画面では横へ送って読めるようにする
        <div className="overflow-x-auto print:overflow-visible">
          <div className="mx-auto my-5 w-[297mm] bg-white p-[10mm] text-[10.5pt] leading-snug shadow-md print:m-0 print:w-auto print:p-0 print:shadow-none">
            <h1 className="text-center text-[16pt] font-bold tracking-widest">{QUESTION_SHEET_TITLE}</h1>
            <div className="mt-[3mm] flex items-end justify-between gap-4">
              <div className="border-b border-black pr-6 pb-0.5 text-[13pt] font-bold">{sheet.case.name} 様</div>
              <div className="text-right text-[10pt]">
                <div>{sheet.createdOn}</div>
                <div>{company.name}</div>
              </div>
            </div>
            <p className="mt-[3mm] mb-[3mm] text-[10pt]">{QUESTION_SHEET_INTRO}</p>

            <table className="q-sheet text-[9.5pt]">
              <colgroup>
                {COLUMNS.map((c, i) => (
                  <col key={QUESTION_SHEET_COLUMNS[i]} style={{ width: `${c.width}mm` }} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  {QUESTION_SHEET_COLUMNS.map((label) => (
                    <th key={label} scope="col">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sheet.rows.map((r) => {
                  const cells = [
                    r.no,
                    r.date,
                    r.accountLines.map((line) => <div key={line}>{line}</div>),
                    r.description,
                    yen(r.amountOut),
                    yen(r.amountIn),
                    <span className="whitespace-pre-wrap">{r.question}</span>,
                    // ご回答（手書き・書き込み用に空けておく）
                    '',
                  ];
                  return (
                    <tr key={r.id}>
                      {cells.map((cell, i) => (
                        <td key={QUESTION_SHEET_COLUMNS[i]} className={`${COLUMNS[i]!.align} ${i === 4 || i === 5 ? 'tabular-nums whitespace-nowrap' : ''}`}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
