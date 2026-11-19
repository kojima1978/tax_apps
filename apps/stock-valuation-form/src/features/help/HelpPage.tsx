import { HelpDocument } from '@/shared/help-doc/HelpDocument';
import { APP_TITLE } from '@/features/cases/caseLabels';
import { HELP_LEAD, HELP_SECTIONS } from './helpContent';

/**
 * 使い方の画面（#help）。会社一覧・帳票のどちらからも開けるので、戻り先は App が渡す。
 * 同じタブで開く ── 別のタブで開くと帳票が2つ立ち、同じ案件を自動保存し合って楽観ロックにぶつかる。
 */
export function HelpPage({ backLabel, onClose }: { backLabel: string; onClose: () => void }) {
  return (
    <div className="app-root help-root" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>
      <header className="no-print app-header">
        <button type="button" className="app-home-link admin-back" onClick={onClose}>
          {backLabel}
        </button>
        <div className="app-header-title">使い方</div>
      </header>
      <HelpDocument appName={APP_TITLE} lead={HELP_LEAD} sections={HELP_SECTIONS} />
    </div>
  );
}
