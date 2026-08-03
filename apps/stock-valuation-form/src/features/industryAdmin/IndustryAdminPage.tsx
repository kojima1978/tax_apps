import { useState } from 'react';
import { useIndustryDataset, useReloadIndustryDataset } from '@/data/IndustryDataProvider';
import { MonthlyPriceImportPanel } from './MonthlyPriceImportPanel';
import { NewYearPanel } from './NewYearPanel';
import { YearListPanel } from './YearListPanel';

type PanelId = 'list' | 'monthly' | 'newYear';

const PANELS: ReadonlyArray<{ id: PanelId; label: string; description: string }> = [
  { id: 'list', label: '登録済みの年分', description: '登録内容の確認と、業種目ごとの個別訂正を行います。' },
  { id: 'monthly', label: '月次株価を取り込む', description: '公表された月の株価と2年間の平均株価を貼り付けて取り込みます。' },
  { id: 'newYear', label: '年分を新規追加', description: '新しい年分の業種目マスタとB・C・Dを貼り付けて登録します。' },
];

/**
 * 業種目データ管理画面。帳票とは別画面（`#industry-data`）で開く。
 * 削除は用意していない（誤操作の影響が大きいため、取り消しはバックアップからの復元で行う）。
 */
export function IndustryAdminPage({ onClose }: { onClose: () => void }) {
  const dataset = useIndustryDataset();
  const reload = useReloadIndustryDataset();
  const [panel, setPanel] = useState<PanelId>('list');

  const years = dataset.years;
  const active = PANELS.find((candidate) => candidate.id === panel)!;

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
              onClick={() => setPanel(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="admin-shell">
        <p className="admin-description">{active.description}</p>

        {panel === 'list' && <YearListPanel years={years} onUpdated={reload} />}
        {panel === 'monthly' && <MonthlyPriceImportPanel years={years} onImported={reload} />}
        {panel === 'newYear' && <NewYearPanel years={years} onCreated={reload} />}
      </div>
    </div>
  );
}
