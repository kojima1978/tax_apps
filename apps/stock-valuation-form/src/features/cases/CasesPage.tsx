// 会社を選ぶトップページ。ハッシュ無しで開いたときはこの画面から始まる。
//
// 帳票をいきなり出さないのは、前の会社の入力が出たまま別の会社を打ち始める余地を消すため。
// 帳票へ入るときは `#form` を付けるので、作業中の再読み込みでここへ戻されることはない。
//
// 並ぶのは会社で、年分（課税時期ごとの案件）は選んだ先（CompanyPage）に出す。

import { useMemo, useRef, useState } from 'react';
import { PortalLink } from '@/components/PortalLink';
import { readFormDataFile } from '@/hooks/useFormData';
import { APP_TITLE, caseDisplayName, formatSavedAt } from './caseLabels';
import { CompanyListPanel } from './CompanyListPanel';
import { NewCaseDialog } from './NewCaseDialog';
import { companiesForNewCase } from './newCase';
import { useBusyAction } from './useBusyAction';
import { useCaseListReload } from './useCaseListReload';
import type { CaseStore } from './useCases';

interface CasesPageProps {
  store: CaseStore;
  /** 帳票に入力があるか（案件に紐づいていない入力の行き先を示すため）。 */
  hasInput: boolean;
  onEnterForm: () => void;
  /** その会社の年度一覧へ移る。 */
  onOpenCompany: (groupKey: string) => void;
  onOpenAdmin: () => void;
}

export function CasesPage({ store, hasInput, onEnterForm, onOpenCompany, onOpenAdmin }: CasesPageProps) {
  const { busy, act } = useBusyAction();
  // 一覧に入るたびサーバから取り直す（別の端末で増えた案件を出さないまま選ばせない）。
  const loaded = useCaseListReload(store);
  const importRef = useRef<HTMLInputElement>(null);
  const [newCaseOpen, setNewCaseOpen] = useState(false);
  // 作るときに選べる会社。同じ会社を2度打たせないための一覧なので、ゴミ箱は除く（newCase.ts）。
  const companies = useMemo(() => companiesForNewCase(store.cases), [store.cases]);

  /** 作れたときだけ帳票へ移る（確認を取り消したときは null が返る）。 */
  const enterIfCreated = async (action: () => Promise<unknown>) => {
    if (await act(action) !== null) onEnterForm();
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const data = await readFormDataFile(file);
      await enterIfCreated(() => store.createFromJson(data));
    } catch (cause) {
      alert(cause instanceof Error ? cause.message : String(cause));
    }
  };

  // 一覧の読み込み前は currentCase が埋まらないので、紐づいているかどうかは id で見る。
  const linked = store.currentId !== null;
  const resumeName = store.currentCase !== null
    ? caseDisplayName(store.currentCase)
    : linked ? '開いている案件' : 'この端末に残っている入力';

  return (
    <div className="app-root cases-root" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>
      <header className="app-header">
        <PortalLink />
        <div className="app-header-title">{APP_TITLE}</div>
        <div className="app-header-right">
          <button
            type="button"
            className="app-tool-btn"
            onClick={onOpenAdmin}
            title="類似業種比準価額に使う業種目マスタ・業種目別株価等を登録・訂正します"
          >
            業種目データ管理
          </button>
        </div>
      </header>

      <div className="cases-shell">
        {/* 説明は1行だけ。保存の細かい話はヘッダの保存表示が出すので、ここで繰り返さない。 */}
        <p className="check-note cases-lead">
          評価する会社を選ぶと年分の一覧へ、そこから帳票に入ります（入力は数秒ごとに自動で保存されます）。
        </p>

        {store.error !== null && <p className="case-error">{store.error}</p>}

        {(linked || hasInput) && (
          <section className="cases-panel cases-resume">
            <div className="cases-resume-main">
              <span className="cases-resume-name">{resumeName}</span>
              <span className="cases-resume-note">
                {linked
                  ? store.currentCase !== null
                    ? `更新 ${formatSavedAt(store.currentCase.updatedAt)}${store.currentCase.taxPeriod !== '' ? ` ／ 課税時期 ${store.currentCase.taxPeriod}` : ''}`
                    : '入力は数秒ごとにこの案件へ保存されています。'
                  : '案件に入っていない入力が残っています。開いて入力を続けると自動で案件になります。'}
              </span>
            </div>
            <button
              type="button"
              className="app-tool-btn cases-enter-btn"
              onClick={onEnterForm}
              title="いまの入力のまま帳票に戻ります"
            >
              続きから開く
            </button>
          </section>
        )}

        <section className="cases-panel">
          <div className="case-actions">
            <button
              type="button"
              className="app-tool-btn"
              disabled={busy}
              title="会社名と課税時期を決めて案件を作ります（評価したことのある会社なら選ぶだけ）"
              onClick={() => setNewCaseOpen(true)}
            >
              新しい案件を作る
            </button>
            <button
              type="button"
              className="app-tool-btn"
              disabled={busy}
              title="保存しておいたJSONを取り込んで新しい案件にします"
              onClick={() => importRef.current?.click()}
            >
              JSONから案件を作る
            </button>
            {!linked && hasInput && (
              <button
                type="button"
                className="app-tool-btn"
                disabled={busy}
                title="いまの入力をそのまま新しい案件にします（自動で作られなかったときの手動の口）"
                onClick={() => void enterIfCreated(() => store.createFromCurrent())}
              >
                いまの入力を案件にする
              </button>
            )}
          </div>
        </section>

        {loaded ? (
          <CompanyListPanel store={store} onOpenCompany={onOpenCompany} onEnterForm={onEnterForm} />
        ) : (
          <p className="case-empty">読み込んでいます…</p>
        )}

        <input
          id="case-import-json"
          name="case.importJson"
          ref={importRef}
          type="file"
          accept=".json"
          onChange={(e) => void handleImport(e)}
          style={{ display: 'none' }}
        />
      </div>

      {newCaseOpen && (
        <NewCaseDialog
          companies={companies}
          busy={busy}
          onCancel={() => setNewCaseOpen(false)}
          onSubmit={(profile, basedOn) => {
            // 作れたときだけ閉じる。失敗したら入れた会社名・課税時期を残したまま出しておく。
            void (async () => {
              if (await act(() => store.createWithProfile(profile, basedOn)) === null) return;
              setNewCaseOpen(false);
              onEnterForm();
            })();
          }}
        />
      )}
    </div>
  );
}
