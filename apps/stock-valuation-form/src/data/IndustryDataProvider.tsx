import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  createIndustryDataset,
  EMPTY_INDUSTRY_DATASET,
  type IndustryDataset,
  type IndustryDatasetPayload,
} from './industryDataset';

// 業種目マスタ・業種目別株価等は API から起動時に一括取得する。
// 取得後は同期的に引ける形（IndustryDataset）に変換して配るので、各表は非同期を意識しない。
const DATASET_URL = `${import.meta.env.BASE_URL}api/industry-dataset`;

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; dataset: IndustryDataset };

const IndustryDataContext = createContext<IndustryDataset>(EMPTY_INDUSTRY_DATASET);

/** 業種目データセット。プロバイダの外では空データセットになる。 */
export function useIndustryDataset(): IndustryDataset {
  return useContext(IndustryDataContext);
}

const MESSAGE_STYLE: React.CSSProperties = {
  fontFamily: '"Noto Sans JP", sans-serif',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 12,
  minHeight: '60vh',
  color: '#444',
  fontSize: 14,
};

export function IndustryDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((count) => count + 1), []);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setState({ status: 'loading' });
      try {
        const response = await fetch(DATASET_URL, { signal: controller.signal });
        if (!response.ok) throw new Error(`サーバがHTTP ${response.status}を返しました`);

        const payload = (await response.json()) as IndustryDatasetPayload;
        if (payload.years.length === 0) throw new Error('業種目データが1件も登録されていません');

        setState({ status: 'ready', dataset: createIndustryDataset(payload) });
      } catch (error) {
        if (controller.signal.aborted) return;
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    };

    void load();
    return () => controller.abort();
  }, [attempt]);

  if (state.status === 'loading') {
    return <div style={MESSAGE_STYLE}>業種目データを読み込んでいます…</div>;
  }

  if (state.status === 'error') {
    return (
      <div style={MESSAGE_STYLE}>
        <div>業種目データを読み込めませんでした（{state.message}）。</div>
        <button type="button" onClick={retry} className="app-tool-btn">再試行</button>
      </div>
    );
  }

  return (
    <IndustryDataContext.Provider value={state.dataset}>
      {children}
    </IndustryDataContext.Provider>
  );
}
