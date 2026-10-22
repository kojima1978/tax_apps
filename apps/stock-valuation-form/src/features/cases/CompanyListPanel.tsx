// トップの会社一覧。1社1行で、選ぶとその会社の年分（年度一覧）へ入る。
//
// 年分をここに全部並べていた頃は、翌年度更新を重ねた会社があるだけで画面が縦に伸びて、
// 目当ての会社を探すのに巻き取る必要があった。1行にまとめると、縦の長さは会社の数で決まる。
//
// まとめ方（同じ会社かどうかの判定）は caseGroups が決める。ここは並べるだけ。

import { useEffect, useState } from 'react';
import { useOperator, type Operator } from '@/shared/staff-directory/operator';
import { ArchivedToggle } from './ArchivedToggle';
import type { CaseSummary } from './api';
import { type AssigneeFilter, assigneeLabel, filterGroupsByAssignee, isAssigneeFilter } from './caseAssignee';
import { filterCasesByCompany } from './caseFilter';
import { groupCasesByCompany, type CaseGroup } from './caseGroups';
import { caseDisplayName, formatSavedAt } from './caseLabels';
import { useOpenCase } from './useOpenCase';
import type { CaseStore } from './useCases';

/** 絞り込み欄を出す会社数。数社のうちは探すより目で追うほうが早い。 */
const FILTER_MIN_COMPANIES = 5;

/** 担当者の絞り込みの控え。一覧に戻るたびに「すべて」へ戻ると、毎回選び直すことになる。 */
const ASSIGNEE_FILTER_KEY = 'stock-valuation-form:case-assignee-filter';

function readAssigneeFilter(): AssigneeFilter {
  try {
    const stored = localStorage.getItem(ASSIGNEE_FILTER_KEY);
    return isAssigneeFilter(stored) ? stored : 'all';
  } catch {
    return 'all';
  }
}

interface CompanyListPanelProps {
  store: CaseStore;
  /** その会社の年度一覧へ移る。 */
  onOpenCompany: (groupKey: string) => void;
  /** 年分が1つだけの会社は、一覧から直接その帳票へ入れる。 */
  onEnterForm: () => void;
}

/**
 * 行の2段目。どの会社かを見分ける手がかり（一番新しい年分の課税時期と更新日時、その年分の担当）を出す。
 */
function companyMeta(group: CaseGroup<CaseSummary>, people: readonly Operator[]): string {
  const latest = group.items[0]!;
  const archived = group.items.filter((item) => item.archivedAt !== null).length;
  const assignee = assigneeLabel(latest.assignee, people);
  return [
    `課税時期 ${latest.taxPeriod === '' ? '未入力' : latest.taxPeriod}`,
    `更新 ${formatSavedAt(latest.updatedAt)}`,
    assignee === null ? '' : `担当 ${assignee}`,
    archived === 0 ? '' : `ゴミ箱 ${archived}件`,
  ].filter((part) => part !== '').join(' ／ ');
}

export function CompanyListPanel({ store, onOpenCompany, onEnterForm }: CompanyListPanelProps) {
  const [query, setQuery] = useState('');
  const { busy, open } = useOpenCase(store, onEnterForm);
  const { reload } = store;
  const { selected: me, operators, status: directory } = useOperator();
  const [assigneeFilter, setAssigneeFilterState] = useState<AssigneeFilter>(readAssigneeFilter);
  const setAssigneeFilter = (next: AssigneeFilter) => {
    setAssigneeFilterState(next);
    try { localStorage.setItem(ASSIGNEE_FILTER_KEY, next); } catch { /* 控えられなくても絞り込みは効く */ }
  };
  // 台帳が引けない間は絞らない。「自分の担当」が誰か決まらず、黙って0件に見えてしまう。
  const activeFilter: AssigneeFilter = directory === 'ok' ? assigneeFilter : 'all';

  // 開いた時点で取り直す（別のタブで増減していることがある）。ゴミ箱の切替で取り直すのは
  // ストア側（setIncludeArchived）。
  useEffect(() => { void reload(); }, [reload]);

  const visible = filterCasesByCompany(store.cases, query);
  // 担当者は会社の塊に対して絞る（年分を先に落とすと、残った年分だけで塊が組まれて
  // 「N年分」や一番新しい課税時期が実際と食い違う）。
  const groups = filterGroupsByAssignee(groupCasesByCompany(visible), activeFilter, me?.id ?? null);

  const renderGroup = (group: CaseGroup<CaseSummary>) => {
    const items = group.items;
    // 年分が1つだけで、それがゴミ箱に入っていないときだけ帳票への近道を出す
    // （ゴミ箱の案件を開く口はここには作らない。復元してから開く）。
    const shortcut = items.length === 1 && items[0]!.archivedAt === null ? items[0]! : null;
    const editing = items.some((item) => item.id === store.currentId);
    const allArchived = items.every((item) => item.archivedAt !== null);

    return (
      <li
        key={group.key}
        className={`case-row${editing ? ' is-current' : ''}${allArchived ? ' is-archived' : ''}`}
      >
        <button
          type="button"
          className="case-row-main case-row-open"
          onClick={() => onOpenCompany(group.key)}
          title="この会社の年分（課税時期ごとの案件）を一覧します"
        >
          <span className="case-row-name">
            {group.companyName.trim() === '' ? caseDisplayName(items[0]!) : group.companyName}
          </span>
          <span className="case-row-updated">{companyMeta(group, operators)}</span>
          {editing && <span className="case-row-period">編集中</span>}
        </button>
        <div className="case-row-actions">
          {shortcut !== null ? (
            <button
              type="button"
              className="app-tool-btn"
              disabled={busy}
              title="この会社の帳票を開きます"
              onClick={() => open(shortcut.id)}
            >
              {shortcut.id === store.currentId ? '続きを開く' : '開く'}
            </button>
          ) : (
            <span className="case-group-count">{items.length}年分</span>
          )}
        </div>
      </li>
    );
  };

  return (
    <section className="cases-panel">
      <div className="case-actions">
        <h2 className="check-title">会社の一覧</h2>
        {store.cases.length >= FILTER_MIN_COMPANIES && (
          <label className="cases-filter">
            会社名で絞り込み
            <input
              id="case-filter-company"
              name="case.filterCompany"
              type="search"
              value={query}
              placeholder="会社名の一部"
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        )}
        {directory === 'ok' && (
          <label className="cases-filter">
            担当
            <select
              id="case-filter-assignee"
              name="case.filterAssignee"
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value as AssigneeFilter)}
            >
              <option value="all">すべて</option>
              <option value="mine">自分の担当{me ? `（${me.fullName}）` : ''}</option>
              <option value="none">担当者なし</option>
            </select>
          </label>
        )}
        <ArchivedToggle store={store} />
      </div>

      {activeFilter === 'mine' && me === null && (
        <p className="case-filter-hint">
          「自分の担当」で絞るには、画面右上の「操作者」で自分を選んでください。
        </p>
      )}

      {store.cases.length === 0 ? (
        <p className="case-empty">
          案件はまだありません。「新しい案件を作る」か、帳票に入力を始めた時点で自動で作られます。
        </p>
      ) : visible.length === 0 ? (
        <p className="case-empty">
          「{query}」に一致する会社はありません。
          {!store.includeArchived && 'ゴミ箱に入れていないか確かめてください。'}
        </p>
      ) : groups.length === 0 ? (
        <p className="case-empty">
          {activeFilter === 'none' ? '担当者なしの会社はありません。' : '担当している会社はありません。'}
          年分の一覧で、年分ごとに担当者を選べます。
        </p>
      ) : (
        <ul className="case-list">{groups.map(renderGroup)}</ul>
      )}
    </section>
  );
}
