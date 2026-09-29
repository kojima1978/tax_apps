// 1社ぶんの年度一覧（課税時期ごとの案件）と、1件ごとの操作。
//
// 行は「開く」が中心。行そのものがボタンで、複製・ゴミ箱へ（復元・完全に削除）は右端に控えめに置く
// ── 一覧に来る用は開くことがほとんどで、同じ大きさのボタンが3つ並んでいると押し間違える。
//
// どの案件を同じ会社とみなすかは caseGroups が決める。ここは渡された塊を並べるだけ。

import { ArchivedToggle } from './ArchivedToggle';
import type { CaseSummary } from './api';
import type { CaseGroup } from './caseGroups';
import { caseDisplayName, formatSavedAt } from './caseLabels';
import { useOpenCase } from './useOpenCase';
import type { CaseStore } from './useCases';

interface CaseListPanelProps {
  store: CaseStore;
  /** 表示する会社の塊（課税時期の新しい順）。 */
  group: CaseGroup<CaseSummary>;
  /** 案件を開けたら帳票へ移る。 */
  onOpened: () => void;
  /** この会社に年分を足す（渡さなければボタンを出さない）。 */
  onAddYear?: () => void;
}

export function CaseListPanel({ store, group, onOpened, onAddYear }: CaseListPanelProps) {
  const { busy, act, open } = useOpenCase(store, onOpened);

  const rowActions = (item: CaseSummary) => (
    item.archivedAt !== null
      ? [
          { label: '復元', onClick: () => act(() => store.restore(item.id)) },
          {
            label: '完全に削除',
            danger: true,
            onClick: () => {
              const message = [
                `「${caseDisplayName(item)}」を完全に削除します。`,
                '',
                'この操作は取り消せません。よろしいですか？',
              ].join('\n');
              if (window.confirm(message)) void act(() => store.purge(item.id));
            },
          },
        ]
      : [
          { label: '複製', onClick: () => act(() => store.duplicate(item.id)) },
          { label: 'ゴミ箱へ', onClick: () => act(() => store.archive(item.id)) },
        ]
  );

  // 会社名は見出しに1度出ているので行には出さない。代わりに課税時期が年分の見分けになるので、
  // 未入力でもその旨を出す ── どちらも空の行は、どの年分か分からないまま並ぶことになる。
  const renderRow = (item: CaseSummary) => (
    <li
      key={item.id}
      className={`case-row${item.id === store.currentId ? ' is-current' : ''}${item.archivedAt !== null ? ' is-archived' : ''}`}
    >
      <button
        type="button"
        className="case-row-main case-row-open"
        disabled={busy}
        title={item.archivedAt !== null ? 'ゴミ箱に入っていますが、開いて中身を確かめられます' : 'この年分の帳票を開きます'}
        onClick={() => open(item.id)}
      >
        <span className="case-row-name">
          課税時期 {item.taxPeriod === '' ? '未入力' : item.taxPeriod}
        </span>
        <span className="case-row-updated">
          {item.archivedAt !== null ? 'ゴミ箱 ' : '更新 '}
          {formatSavedAt(item.archivedAt ?? item.updatedAt)}
        </span>
        {item.id === store.currentId && <span className="case-row-period">編集中</span>}
      </button>
      <div className="case-row-actions">
        {rowActions(item).map((action) => (
          <button
            key={action.label}
            type="button"
            className={`case-row-quiet${'danger' in action && action.danger ? ' is-danger' : ''}`}
            disabled={busy}
            onClick={action.onClick}
          >
            {action.label}
          </button>
        ))}
      </div>
    </li>
  );

  return (
    <section className="cases-panel">
      <div className="case-actions">
        <h2 className="check-title">年分の一覧（{group.items.length}件）</h2>
        {onAddYear !== undefined && (
          <button
            type="button"
            className="app-tool-btn"
            disabled={busy}
            title="この会社の別の課税時期を作ります（一番新しい年分の内容を写します）"
            onClick={onAddYear}
          >
            この会社に年分を追加
          </button>
        )}
        <ArchivedToggle store={store} />
      </div>
      <ul className="case-list">{group.items.map(renderRow)}</ul>
    </section>
  );
}
