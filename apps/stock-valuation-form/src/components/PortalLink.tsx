// ポータル（全アプリの入口）へ戻るリンク。出すのは会社一覧（トップ）だけ。
// 下の画面（年分の一覧・帳票・業種目データ管理）の左上は「1段上へ戻る」1つに揃えている ──
// 出口が2つ並ぶと、片方だけがアプリの外へ出るので押し間違える。

export function PortalLink() {
  return (
    <a href="/" className="app-home-link" title="ポータルに戻る">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
        <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      </svg>
      ポータル
    </a>
  );
}
