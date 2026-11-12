import { Link } from 'react-router-dom';
import { relativeTime } from '../linkedApps';
import { failingSince, useLinkHealth, type LinkHealth } from '../linkHealth';
import type { WorkloadSource } from '../../server/linkedApps';

// 「連携が読めない」の注記。社員一覧・部署・会社・連携の4画面で同じものを出す。
//   - 担当件数: その画面が自分で読めなかったアプリ（unreachable）。いつからかは台帳のサーバの記録から
//   - 写し: 台帳のサーバが失敗と見ている写し（案件管理・PB の担当者・部署が古いまま）
// どちらも無ければ何も出さない

/** 「（12分前から）」。始まりが分からない・たった今なら付けない */
function sinceText(since: string | null): string {
  if (!since) return '';
  const rel = relativeTime(since, Date.now());
  return rel === 'たった今' ? '' : `（${rel}から）`;
}

/** いちばん古い始まり（複数のアプリが読めないとき、注記には最も長く続いているものを出す） */
function earliest(values: (string | null)[]): string | null {
  return values.filter((v): v is string => v !== null).sort()[0] ?? null;
}

type Props = {
  /** この画面で担当件数を読めなかったアプリ（読み込み中は空で渡す） */
  unreachable: WorkloadSource[];
  /** 担当件数が読めないときに、この画面の数字がどうなっているか */
  consequence: string;
  /** 連携の画面が自分で読んだものを渡す（渡さなければここで読む） */
  health?: LinkHealth | null;
  /** 連携の画面そのものでは、リンクの代わりに下の記録を指す */
  onLinksPage?: boolean;
  /** 置き場所に合わせた余白など */
  className?: string;
};

export function LinkTroubleNote({ unreachable, consequence, health: given, onLinksPage = false, className = '' }: Props) {
  const loaded = useLinkHealth();
  const health = given !== undefined ? given : loaded;
  const syncFailures = (health?.checks ?? []).filter((c) => c.kind === 'sync' && c.state === 'failed');
  if (unreachable.length === 0 && syncFailures.length === 0) return null;

  const workloadSince = earliest(unreachable.map((s) => failingSince(health, s.key, 'workload')));
  return (
    <div role="status" className={`space-y-1 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 ${className}`}>
      {unreachable.length > 0 && (
        <p>
          <span className="font-medium">
            {unreachable.map((s) => s.label).join('・')}の担当件数が読めません{sinceText(workloadSince)}。
          </span>
          {consequence}
        </p>
      )}
      {syncFailures.map((c) => (
        <p key={c.app}>
          <span className="font-medium">
            {c.label}への担当者・部署の写しが失敗しています{sinceText(c.since)}。
          </span>
          {c.label}の担当者・部署は台帳の変更が届かず古いままです（理由: {c.reason}）。
        </p>
      ))}
      <p className="text-xs text-amber-800">
        {onLinksPage ? (
          'いつから・理由・これまでの記録は、下の「失敗の記録」にあります。30分以上続くとデスクトップの警告（TAX-APPS-ALERT.txt）にも出ます。'
        ) : (
          <>
            いつから・理由・これまでの記録は
            <Link to="/links" className="mx-0.5 font-medium text-teal-700 underline hover:text-teal-800">
              連携の画面
            </Link>
            で確かめられます。
          </>
        )}
      </p>
    </div>
  );
}
