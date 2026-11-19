import { HelpDocument } from '../shared/help-doc/HelpDocument';
import { HELP_LEAD, HELP_SECTIONS } from '../helpContent';
import { APP_TITLE } from '../navigation';

// 使い方の画面（/help）。本文は helpContent.ts、見た目と印刷（A4 縦）は shared/help-doc に任せる。
// サイドバー・上の帯は印刷で消えるので、ここで印刷用に何かを足す必要は無い
export default function HelpPage() {
  return <HelpDocument appName={APP_TITLE} lead={HELP_LEAD} sections={HELP_SECTIONS} />;
}
