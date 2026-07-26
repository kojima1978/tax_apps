'use client';

import React, { createContext, useContext } from 'react';
import type { PrintPageKey } from '@/utils/printPages';

// 印刷ページのキー列を共有し、各ページは自分のキーから番号を引く。
// 呼び出し側がページ番号を計算しないので、ページの増減で番号がズレることがない。
const PrintPagesContext = createContext<PrintPageKey[]>([]);

interface PrintPagesProviderProps {
  pageKeys: PrintPageKey[];
  children: React.ReactNode;
}

export const PrintPagesProvider: React.FC<PrintPagesProviderProps> = ({ pageKeys, children }) => (
  <PrintPagesContext.Provider value={pageKeys}>{children}</PrintPagesContext.Provider>
);

/** 目次のようにページ列全体を見たいコンポーネント向け */
export const usePrintPageKeys = (): PrintPageKey[] => useContext(PrintPagesContext);

export interface PrintPageInfo {
  currentPage: number;
  totalPages: number;
}

/** 印刷対象に含まれないキーなら null を返す */
export const usePrintPage = (pageKey: PrintPageKey): PrintPageInfo | null => {
  const pageKeys = useContext(PrintPagesContext);
  const index = pageKeys.indexOf(pageKey);
  if (index < 0) return null;
  return { currentPage: index + 1, totalPages: pageKeys.length };
};
