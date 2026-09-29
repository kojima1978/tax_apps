// 1社ぶんの年度一覧。会社一覧（CasesPage）で会社を選ぶとこの画面に入る。
//
// 帳票の「← 会社名」もここへ戻る。翌年度更新を重ねた会社は年分が増えていくので、
// 「どの年分を開くか」だけを出す画面を分けた（トップは会社の数だけ縦に伸びる）。
//
// 業種目データ管理への入口はここには置かない（出すのはトップだけ）。データが足りない
// ことに気づくのは第4表を打っている最中で、年分を選ぶだけのこの画面では気づきようがない。

import { useMemo, useState } from 'react';
import { ArchivedToggle } from './ArchivedToggle';
import { CaseListPanel } from './CaseListPanel';
import { NewCaseDialog } from './NewCaseDialog';
import { findGroupByKey, groupCasesByCompany } from './caseGroups';
import { APP_TITLE } from './caseLabels';
import { companiesForNewCase } from './newCase';
import { useBusyAction } from './useBusyAction';
import { useCaseListReload } from './useCaseListReload';
import type { CaseStore } from './useCases';

interface CompanyPageProps {
  store: CaseStore;
  /** 会社の印（caseGroups の groupKeyOf が作る。URLのハッシュに入っている）。 */
  groupKey: string;
  onBack: () => void;
  onEnterForm: () => void;
}

export function CompanyPage({ store, groupKey, onBack, onEnterForm }: CompanyPageProps) {
  const { busy, act } = useBusyAction();
  // 読み込む前は案件が0件なので、そのまま描くと「見つかりません」が一瞬出る。
  const loaded = useCaseListReload(store);
  const [addOpen, setAddOpen] = useState(false);

  const group = findGroupByKey(groupCasesByCompany(store.cases), groupKey);
  const companies = useMemo(() => companiesForNewCase(store.cases), [store.cases]);
  // ゴミ箱だけの会社・会社名が空の会社は写す元にならないので、そのときはボタンを出さない。
  const addable = companies.find((item) => item.key === group?.key) ?? null;

  return (
    <div className="app-root cases-root" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>
      <header className="app-header">
        <div className="app-header-title">{APP_TITLE}</div>
      </header>

      <div className="cases-shell">
        <div className="cases-crumbs">
          <button type="button" className="app-tool-btn" onClick={onBack} title="会社の一覧に戻ります">
            ← 会社の一覧
          </button>
          <h1 className="cases-company-name">{group?.companyName || '（会社名未入力）'}</h1>
        </div>

        {store.error !== null && <p className="case-error">{store.error}</p>}

        {group !== null ? (
          <CaseListPanel
            store={store}
            group={group}
            onOpened={onEnterForm}
            onAddYear={addable === null ? undefined : () => setAddOpen(true)}
          />
        ) : loaded ? (
          <section className="cases-panel">
            {/* ゴミ箱へ入れた会社もこのURLのままなので、切替をここにも出す（出さないと戻り道が無い）。 */}
            <div className="case-actions">
              <h2 className="check-title">この会社の年分は見つかりませんでした</h2>
              <ArchivedToggle store={store} />
            </div>
            <p className="case-empty">
              会社名を書き直した・ゴミ箱に入れた・別の端末で削除した、のいずれかです。
              「ゴミ箱も表示」で出てこなければ、会社の一覧から探してください。
            </p>
          </section>
        ) : (
          <p className="case-empty">読み込んでいます…</p>
        )}
      </div>

      {addOpen && addable !== null && (
        <NewCaseDialog
          companies={companies}
          fixedCompanyKey={addable.key}
          busy={busy}
          onCancel={() => setAddOpen(false)}
          onSubmit={(profile, basedOn) => {
            // 作れたときだけ閉じる。失敗したら入れた課税時期を残したまま出しておく。
            void (async () => {
              if (await act(() => store.createWithProfile(profile, basedOn)) === null) return;
              setAddOpen(false);
              onEnterForm();
            })();
          }}
        />
      )}
    </div>
  );
}
