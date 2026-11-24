'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { HELP_LEAD, HELP_SECTIONS } from '@/lib/help-content';
import { HelpDocument } from '@/lib/shared/help-doc/HelpDocument';
import { backHrefFromHelp, backLabelFromHelp } from '@/utils/helpNavigation';

/** 使い方の画面の中身。印刷ボタンが window.print を呼ぶのでクライアントで描く。 */
export default function HelpView() {
  // 案件の画面から開いたときは ?case= が付いてくる。そのときは一覧ではなく元の案件へ戻す。
  // useSearchParams は静的に書き出すページでは Suspense が要るので、読むのは描いた後にする
  const [caseId, setCaseId] = useState<string | null>(null);
  useEffect(() => {
    setCaseId(new URLSearchParams(window.location.search).get('case'));
  }, []);

  return (
    <HelpDocument
      appName="保険証券分析・診断"
      lead={HELP_LEAD}
      sections={HELP_SECTIONS}
      before={
        <Link href={backHrefFromHelp(caseId)} className="help-back-link">
          <ArrowLeft size={16} aria-hidden="true" />
          {backLabelFromHelp(caseId)}
        </Link>
      }
    />
  );
}
