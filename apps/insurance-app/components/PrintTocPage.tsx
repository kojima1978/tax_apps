'use client';

import React, { useMemo } from 'react';
import type { Policy } from '@/types';
import PrintPageNumber from '@/components/PrintPageNumber';
import { usePrintPageKeys } from '@/components/PrintPageContext';
import { buildPrintTocEntries } from '@/utils/printPages';

interface PrintTocPageProps {
  policies: Policy[];
  customerName: string;
}

const PrintTocPage: React.FC<PrintTocPageProps> = ({ policies, customerName }) => {
  const pageKeys = usePrintPageKeys();
  const entries = useMemo(() => buildPrintTocEntries(pageKeys, policies), [pageKeys, policies]);

  // 目次を出さない構成(本文1ページだけ)ではページ列に 'toc' が入らない。
  // ここで描画しないことで、目次の有無とページ番号の根拠を buildPrintPageKeys 側に一本化する
  if (!pageKeys.includes('toc')) return null;

  return (
    <div className="print-only toc-page print-page">
      <div className="cover-accent-bar" />

      <div className="toc-body">
        <div className="toc-head">
          <div className="toc-head-title">
            <span className="toc-title">目次</span>
            <span className="toc-title-sub">Contents</span>
          </div>
          {customerName && <div className="toc-customer">{customerName} 様</div>}
        </div>

        <ol className="toc-list">
          {entries.map(entry => (
            <li key={entry.id} className={`toc-row${entry.isChild ? ' is-child' : ''}`}>
              <span className="toc-row-title">{entry.title}</span>
              <span className="toc-row-leader" aria-hidden="true" />
              <span className="toc-row-page">{entry.pageLabel}</span>
            </li>
          ))}
        </ol>
      </div>

      <PrintPageNumber pageKey="toc" />
    </div>
  );
};

export default PrintTocPage;
