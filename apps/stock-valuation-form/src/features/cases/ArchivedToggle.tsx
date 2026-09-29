// ゴミ箱も一覧に出すかの切替。会社一覧と年度一覧の両方に置く（どちらからでも復元・完全削除へ
// 入れるようにするため。外すとゴミ箱の案件へ二度と手が届かなくなる）。
//
// 状態は useCases が1つだけ持つので、どちらで切り替えても同じものが動く。画面ごとに持つと、
// 会社を選んで入った先で切替が元に戻る。

import type { CaseStore } from './useCases';

export function ArchivedToggle({ store }: { store: CaseStore }) {
  return (
    <label className="case-archived-toggle">
      <input
        type="checkbox"
        checked={store.includeArchived}
        onChange={(e) => store.setIncludeArchived(e.target.checked)}
      />
      ゴミ箱も表示（復元・完全に削除）
    </label>
  );
}
