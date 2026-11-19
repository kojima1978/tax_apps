'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { HELP_LEAD, HELP_SECTIONS } from '@/lib/help-content';
import { HelpDocument } from '@/lib/shared/help-doc/HelpDocument';

/** 使い方の画面の中身。印刷ボタンが window.print を呼ぶのでクライアントで描く。 */
export default function HelpView() {
  return (
    <HelpDocument
      appName="保険証券分析・診断"
      lead={HELP_LEAD}
      sections={HELP_SECTIONS}
      before={
        <Link href="/" className="help-back-link">
          <ArrowLeft size={16} aria-hidden="true" />
          お客様一覧へ
        </Link>
      }
    />
  );
}
