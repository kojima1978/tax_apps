import { useState } from 'react';
import { useIndustryDataset, useReloadIndustryDataset } from '@/data/IndustryDataProvider';
import { AdminAlert } from './AdminAlert';
import { NewYearPanel } from './NewYearPanel';
import { YearListPanel } from './YearListPanel';
import { YearTransferPanel } from './YearTransferPanel';

type PanelId = 'list' | 'newYear' | 'transfer';

const PANELS: ReadonlyArray<{ id: PanelId; label: string; description: string }> = [
  {
    id: 'list',
    label: '登録済みの年分',
    description: '登録状況のアイコンをクリックすると中身を開きます。'
      + '月をクリックすればその月の株価を直接入力・貼り付けで登録でき、基礎情報からはB・C・Dを訂正できます。',
  },
  { id: 'newYear', label: '年分を新規追加', description: '新しい年分の業種目マスタとB・C・Dを貼り付けて登録します。' },
  {
    id: 'transfer',
    label: 'JSONで入出力',
    description: '年分まるごとをJSONファイルに書き出し、別のPCや作り直した環境で読み込んで復元します。',
  },
];

/**
 * 業種目データ管理画面。帳票とは別画面（`#industry-data`）で開く。
 * 削除は用意していない（誤操作の影響が大きいため、取り消しはバックアップからの復元で行う）。
 */
export function IndustryAdminPage({ onClose }: { onClose: () => void }) {
  const dataset = useIndustryDataset();
  const reload = useReloadIndustryDataset();
  const [panel, setPanel] = useState<PanelId>('list');
  /*
   * 年分を作った直後の受け渡し。作成画面はタブを移ると消えるので、
   * 「どの年分を開くか」と「作成できた旨」はここで持つ。
   */
  const [focusYear, setFocusYear] = useState<number | undefined>(undefined);
  const [notice, setNotice] = useState<string | null>(null);

  const years = dataset.years;
  const active = PANELS.find((candidate) => candidate.id === panel)!;

  const selectPanel = (id: PanelId) => {
    setPanel(id);
    // 自分でタブを選び直したなら、直前の作成の報せはもう用済み。
    setNotice(null);
  };

  const openCreatedYear = (gregorianYear: number, message: string) => {
    setFocusYear(gregorianYear);
    setNotice(message);
    setPanel('list');
  };

  return (
    <div className="app-root admin-root" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>
      <header className="app-header">
        <button type="button" className="app-home-link admin-back" onClick={onClose}>
          ← 帳票に戻る
        </button>
        <div className="app-header-title">業種目データ管理</div>
      </header>

      <div className="app-topbar admin-topbar">
        <nav className="admin-tabs" aria-label="管理メニュー">
          {PANELS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`admin-tab${item.id === panel ? ' admin-tab-active' : ''}`}
              onClick={() => selectPanel(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="admin-shell">
        <p className="admin-description">{active.description}</p>

        {notice && <AdminAlert kind="ok" scrollKey={notice}>{notice}</AdminAlert>}

        {panel === 'list' && (
          <YearListPanel years={years} onUpdated={reload} focusYear={focusYear} />
        )}
        {panel === 'newYear' && (
          <NewYearPanel years={years} onCreated={reload} onOpenYear={openCreatedYear} />
        )}
        {panel === 'transfer' && <YearTransferPanel years={years} onImported={reload} />}
      </div>
    </div>
  );
}
