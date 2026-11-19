"use client";

import { BackToClientList } from "@/components/back-to-client-list";
import { HELP_LEAD, HELP_SECTIONS } from "@/lib/help-content";
import { HelpDocument } from "@/shared/help-doc/HelpDocument";

/** 使い方の画面の中身。印刷ボタンが window.print を呼ぶのでクライアントで描く。 */
export function HelpView() {
  return <HelpDocument appName="個人資産・負債管理" lead={HELP_LEAD} sections={HELP_SECTIONS} before={<BackToClientList />} />;
}
