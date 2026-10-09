// 画面の並び（Django の urls.py の画面側）。API は server/app.ts
//
//   /                      案件一覧（?new=1 で新規作成のダイアログ）
//   /import-json           JSON バックアップから復元
//   /settings              全体の設定
//   /letter                お客様配布用文書（印刷用・ヘッダーなし）
//   /cases/:id             分析画面（?tab=… で7タブ）
//   /cases/:id/import      取込ウィザード
//   /cases/:id/direct      直接入力
//   /cases/:id/classify    自動分類のプレビュー
//   /cases/:id/passbooks   通帳有無一覧

import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { NoticeProvider } from './components/Notice';
import { AnalysisPage } from './pages/analysis/AnalysisPage';
import { CaseListPage } from './pages/CaseListPage';
import { ClassifyPreviewPage } from './pages/ClassifyPreviewPage';
import { DirectInputPage } from './pages/DirectInputPage';
import { ImportWizardPage } from './pages/ImportWizardPage';
import { JsonImportPage } from './pages/JsonImportPage';
import { PassbookInventoryPage } from './pages/PassbookInventoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { NotFoundPage, PendingPage } from './pages/PendingPage';

// vite.config.ts の base（'/bank-analyzer-next/'）から末尾の / を落としたもの
const BASENAME = import.meta.env.BASE_URL.replace(/\/$/, '');

export default function App() {
  return (
    <BrowserRouter basename={BASENAME}>
      <NoticeProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<CaseListPage />} />
            <Route path="import-json" element={<JsonImportPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="cases/:caseId" element={<AnalysisPage />} />
            <Route path="cases/:caseId/import" element={<ImportWizardPage />} />
            <Route path="cases/:caseId/direct" element={<DirectInputPage />} />
            <Route path="cases/:caseId/classify" element={<ClassifyPreviewPage />} />
            <Route path="cases/:caseId/passbooks" element={<PassbookInventoryPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
          <Route path="letter" element={<PendingPage title="お客様配布用文書" />} />
        </Routes>
      </NoticeProvider>
    </BrowserRouter>
  );
}
