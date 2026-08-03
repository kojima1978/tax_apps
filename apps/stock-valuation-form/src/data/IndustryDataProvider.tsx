import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
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
const IndustryReloadContext = createContext<() => Promise<void>>(() => Promise.resolve());

/** 業種目データセット。プロバイダの外では空データセットになる。 */
export function useIndustryDataset(): IndustryDataset {
  return useContext(IndustryDataContext);
}

/**
 * 業種目データを取り直す。管理画面で取り込んだ内容を帳票側へ反映させるために使う。
 * 初回取得と違い、読み込み中も表示は差し替えない（取込直後の画面を消さないため）。
 */
export function useReloadIndustryDataset(): () => Promise<void> {
  return useContext(IndustryReloadContext);
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

async function fetchDataset(signal?: AbortSignal): Promise<IndustryDataset> {
  const response = await fetch(DATASET_URL, signal ? { signal } : undefined);
  if (!response.ok) throw new Error(`サーバがHTTP ${response.status}を返しました`);

  const payload = (await response.json()) as IndustryDatasetPayload;
  if (payload.years.length === 0) throw new Error('業種目データが1件も登録されていません');

  return createIndustryDataset(payload);
}

export function IndustryDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((count) => count + 1), []);

  // 取得済みかどうかで reload の振る舞いを変えるため、レンダーを跨いで保持する。
  const loadedRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setState({ status: 'loading' });
      try {
        const dataset = await fetchDataset(controller.signal);
        loadedRef.current = true;
        setState({ status: 'ready', dataset });
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

  const reload = useCallback(async () => {
    // 初回取得が終わる前に呼ばれたら、その取得に任せる。
    if (!loadedRef.current) return;
    setState({ status: 'ready', dataset: await fetchDataset() });
  }, []);

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
    <IndustryReloadContext.Provider value={reload}>
      <IndustryDataContext.Provider value={state.dataset}>
        {children}
      </IndustryDataContext.Provider>
    </IndustryReloadContext.Provider>
  );
}
