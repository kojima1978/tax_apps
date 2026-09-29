// トップの会社一覧。1社1行で、選ぶとその会社の年分（年度一覧）へ入る。
//
// 年分をここに全部並べていた頃は、翌年度更新を重ねた会社があるだけで画面が縦に伸びて、
// 目当ての会社を探すのに巻き取る必要があった。1行にまとめると、縦の長さは会社の数で決まる。
//
// まとめ方（同じ会社かどうかの判定）は caseGroups が決める。ここは並べるだけ。

import { useEffect, useState } from 'react';
import { ArchivedToggle } from './ArchivedToggle';
import type { CaseSummary } from './api';
import { filterCasesByCompany } from './caseFilter';
import { groupCasesByCompany, type CaseGroup } from './caseGroups';
import { caseDisplayName, formatSavedAt } from './caseLabels';
import { useOpenCase } from './useOpenCase';
import type { CaseStore } from './useCases';

/** 絞り込み欄を出す会社数。数社のうちは探すより目で追うほうが早い。 */
const FILTER_MIN_COMPANIES = 5;

interface CompanyListPanelProps {
  store: CaseStore;
  /** その会社の年度一覧へ移る。 */
  onOpenCompany: (groupKey: string) => void;
  /** 年分が1つだけの会社は、一覧から直接その帳票へ入れる。 */
  onEnterForm: () => void;
}

/** 行の2段目。どの会社かを見分ける手がかり（一番新しい年分の課税時期と更新日時）を出す。 */
function companyMeta(group: CaseGroup<CaseSummary>): string {
  const latest = group.items[0]!;
  const archived = group.items.filter((item) => item.archivedAt !== null).length;
  return [
    `課税時期 ${latest.taxPeriod === '' ? '未入力' : latest.taxPeriod}`,
    `更新 ${formatSavedAt(latest.updatedAt)}`,
    archived === 0 ? '' : `ゴミ箱 ${archived}件`,
  ].filter((part) => part !== '').join(' ／ ');
}

export function CompanyListPanel({ store, onOpenCompany, onEnterForm }: CompanyListPanelProps) {
  const [query, setQuery] = useState('');
  const { busy, open } = useOpenCase(store, onEnterForm);
  const { reload } = store;

  // 開いた時点で取り直す（別のタブで増減していることがある）。ゴミ箱の切替で取り直すのは
  // ストア側（setIncludeArchived）。
  useEffect(() => { void reload(); }, [reload]);

  const visible = filterCasesByCompany(store.cases, query);
  const groups = groupCasesByCompany(visible);

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
          <span className="case-row-updated">{companyMeta(group)}</span>
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
        <ArchivedToggle store={store} />
      </div>

      {store.cases.length === 0 ? (
        <p className="case-empty">
          案件はまだありません。「新しい案件を作る」か、帳票に入力を始めた時点で自動で作られます。
        </p>
      ) : visible.length === 0 ? (
        <p className="case-empty">
          「{query}」に一致する会社はありません。
          {!store.includeArchived && 'ゴミ箱に入れていないか確かめてください。'}
        </p>
      ) : (
        <ul className="case-list">{groups.map(renderGroup)}</ul>
      )}
    </section>
  );
}
