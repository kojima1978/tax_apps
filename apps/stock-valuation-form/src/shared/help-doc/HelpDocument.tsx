// 原本は tax_apps/shared/help-doc/。写しを直さず原本を直して `bash shared/sync.sh` で配る
//
// アプリ内の「使い方」画面。本文（節の配列）を目次つきで描き、右上の「印刷」で A4 縦の紙にする。
// 見た目は helpDoc.css に閉じる（Tailwind の有無・各アプリの CSS に依らない）。
// Next.js のアプリは、これを読む page を "use client" にする（印刷ボタンが window.print を呼ぶ）。
import type { ReactNode } from 'react';
import type { HelpBlock, HelpSection } from './helpDoc';
import './helpDoc.css';

function HelpBlockView({ block }: { block: HelpBlock }) {
  switch (block.kind) {
    case 'paragraph':
      return <p className="help-doc-text">{block.text}</p>;
    case 'list':
      return (
        <ul className="help-doc-list">
          {block.items.map((item) => <li key={item}>{item}</li>)}
        </ul>
      );
    case 'steps':
      return (
        <ol className="help-doc-steps">
          {block.items.map((item) => <li key={item}>{item}</li>)}
        </ol>
      );
    case 'table':
      return (
        <div className="help-doc-table-wrap">
          <table className="help-doc-table">
            {block.caption ? <caption>{block.caption}</caption> : null}
            <thead>
              <tr>
                {block.headers.map((header) => <th key={header} scope="col">{header}</th>)}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row) => (
                <tr key={row.join('|')}>
                  {row.map((cell, index) => <td key={index}>{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'note':
      return (
        <p className="help-doc-note">
          <strong>注意　</strong>{block.text}
        </p>
      );
  }
}

function PrinterIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9V2h12v7" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <path d="M6 14h12v8H6z" />
    </svg>
  );
}

export function HelpDocument({
  appName,
  lead,
  sections,
  before,
}: {
  /** 「〇〇の使い方」の〇〇（見出しと印刷の表題になる） */
  appName: string;
  /** 見出しの下の1〜2文 */
  lead: string;
  sections: readonly HelpSection[];
  /** 見出しの上に置く物（「一覧へ戻る」など）。印刷では消す */
  before?: ReactNode;
}) {
  return (
    <div className="help-doc">
      {before ? <div className="help-doc-before">{before}</div> : null}
      <div className="help-doc-head">
        <div>
          <h1>{appName}の使い方</h1>
          <p>{lead}</p>
        </div>
        <button type="button" className="help-doc-print" onClick={() => window.print()}>
          <PrinterIcon />
          印刷
        </button>
      </div>

      <div className="help-doc-body">
        <nav aria-labelledby="help-doc-toc-heading" className="help-doc-toc">
          <h2 id="help-doc-toc-heading">目次</h2>
          <ol>
            {sections.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`}>
                  <span className="help-doc-toc-title">{section.title}</span>
                  <span className="help-doc-toc-summary">{section.summary}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="help-doc-sections">
          {sections.map((section) => (
            <section key={section.id} id={section.id} aria-labelledby={`${section.id}-heading`} className="help-doc-section">
              <h2 id={`${section.id}-heading`}>{section.title}</h2>
              <p className="help-doc-summary">{section.summary}</p>
              <div className="help-doc-blocks">
                {section.blocks.map((block, index) => <HelpBlockView key={index} block={block} />)}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
