import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { IndustryDataProvider } from './data/IndustryDataProvider';
import './main.css';

// 業種目データを読み終えるまで App を描画しない。
// 保存済みデータの正規化（第1表の1の業種目名や第4表への転記）が起動時に走るため。
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <IndustryDataProvider>
      <App />
    </IndustryDataProvider>
  </StrictMode>,
);
