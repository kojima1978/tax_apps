// お客様配布用文書（預金取引確認のご案内）。ヘッダーの無い別タブで開く、印刷用の1枚。
// 文面は Django の customer_letter.html と同じ（案件のデータは使わない）。
//
// Django 版から直したもの:
// - 印刷ボタンの帯が position: fixed で用紙の上端に重なり、スクロールするまで会社名が隠れていた
//   → 帯を流れの中（sticky）に置く
// - 「閉じる」が window.close() だけだった。スクリプトで開いたのでないタブを閉じさせないブラウザがあり、
//   その場合この画面にはヘッダーが無いので戻る口が1つも無かった → 閉じられなければ案件一覧へ移る
// - 用紙の幅が 210mm 固定で、狭い画面では横にはみ出して読めなかった
//   → 紙の形は保ったまま画面幅に収める
// - アイコン2つのために bootstrap-icons のフォント一式を読み込んでいた → 同梱の SVG を使う
// - 「※」を CSS の content で足していたので文字として選べず、折り返した2行目が記号の下に回り込んでいた
//   → 本文の文字にして、2行目は1字下げで揃える
// - 見出しの要素が1つも無かった → 読み上げ用の h1 を置く（印刷には出さない）

import { useEffect } from 'react';
import { Printer, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TITLE = '預金取引確認のご案内';

const SANS = { fontFamily: "'Noto Sans JP', sans-serif" };
const MINCHO = { fontFamily: '"Yu Mincho", "Hiragino Mincho ProN", "Noto Serif JP", serif' };

const FIRM = {
  name: '税理士法人マスエージェント',
  lines: ['〒770-0002 徳島県徳島市春日２丁目３−３３', 'TEL 088-632-6228 ／ FAX 088-631-9870'],
};

// note: true は「※」から始まる注記（1字下げではなく、折り返しを記号の右へ揃える）
const PARAGRAPHS = [
  {
    note: true,
    text: '税務調査においては被相続人の預金取引に関する内容が最も指摘される可能性の高いものであるため、税務調査と同じ確認を事前に弊社で行い、生前贈与や生命保険契約、直前の現金引出し等の有無を確認しております。',
  },
  {
    note: false,
    text: '相続開始日時点での被相続人のお手元にあった現金の金額も相続税の課税対象となります。',
  },
  {
    note: false,
    text: 'なお、葬式費用の準備のため等として死亡日よりも前に現金を引き出している場合は、その引き出した金額も合計した額をお知らせください。',
  },
] as const;

// @page は Tailwind で書けないのでここだけ CSS
const PAGE_CSS = '@media print { @page { size: A4; margin: 20mm 25mm; } }';

export function CustomerLetterPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // 印刷すると用紙の端にも出る題なので、アプリ名のままにしない
    const before = document.title;
    document.title = TITLE;
    return () => {
      document.title = before;
    };
  }, []);

  const close = () => {
    window.close();
    // 閉じさせないブラウザがある。この画面にはヘッダーが無いので、閉じられなければ戻る口を出す
    window.setTimeout(() => {
      if (!window.closed) navigate('/');
    }, 100);
  };

  return (
    <div className="min-h-screen bg-slate-200 print:bg-transparent">
      <style>{PAGE_CSS}</style>
      <h1 className="sr-only">{TITLE}</h1>

      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-slate-300 bg-white px-4 py-2 shadow-sm print:hidden" style={SANS}>
        <button type="button" onClick={close} className="btn btn-secondary">
          <X size={16} />
          閉じる
        </button>
        <button type="button" onClick={() => window.print()} className="btn btn-primary">
          <Printer size={16} />
          印刷
        </button>
      </div>

      <div
        className="mx-auto my-5 min-h-[297mm] w-[210mm] max-w-full bg-white px-[25mm] py-[20mm] text-[15px] leading-loose text-slate-900 shadow-md max-sm:px-6 max-sm:py-8 print:m-0 print:min-h-0 print:w-auto print:p-0 print:shadow-none"
        style={MINCHO}
      >
        <div className="mb-6 border-b-2 border-blue-600 pb-3 text-right" style={SANS}>
          <div className="mb-1 text-lg font-bold text-blue-600">{FIRM.name}</div>
          <div className="text-xs leading-relaxed text-slate-600">
            {FIRM.lines.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
        </div>

        <div className="mt-8">
          {PARAGRAPHS.map((p) =>
            p.note ? (
              <p key={p.text} className="mb-[1.5em] indent-[-1.25em] pl-[1.25em] text-sm text-slate-700">
                ※&nbsp;{p.text}
              </p>
            ) : (
              <p key={p.text} className="mb-[1.5em] indent-[1em]">
                {p.text}
              </p>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
