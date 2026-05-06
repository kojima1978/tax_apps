import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { StaffProvider } from './contexts/StaffContext';

const TablePage = lazy(() => import('./pages/TablePage').then(module => ({ default: module.TablePage })));
const CalculatorPage = lazy(() => import('./pages/CalculatorPage').then(module => ({ default: module.CalculatorPage })));
const ComparisonPage = lazy(() => import('./pages/ComparisonPage').then(module => ({ default: module.ComparisonPage })));
const InsurancePage = lazy(() => import('./pages/InsurancePage').then(module => ({ default: module.InsurancePage })));
const CashGiftPage = lazy(() => import('./pages/CashGiftPage').then(module => ({ default: module.CashGiftPage })));
const SplitPage = lazy(() => import('./pages/SplitPage').then(module => ({ default: module.SplitPage })));
const TimelinePage = lazy(() => import('./pages/TimelinePage').then(module => ({ default: module.TimelinePage })));

const routeFallback = <div className="min-h-[60vh]" aria-hidden="true" />;

function App() {
  return (
    <StaffProvider>
    <div className="min-h-screen bg-gray-50">
      <Suspense fallback={routeFallback}>
        <Routes>
          <Route path="/" element={<CalculatorPage />} />
          <Route path="/table" element={<TablePage />} />
          <Route path="/comparison" element={<ComparisonPage />} />
          <Route path="/insurance" element={<InsurancePage />} />
          <Route path="/cash-gift" element={<CashGiftPage />} />
          <Route path="/split" element={<SplitPage />} />
          <Route path="/timeline" element={<TimelinePage />} />
        </Routes>
      </Suspense>

      <footer className="bg-gray-800 text-white py-4 md:py-6 mt-8 md:mt-12 no-print">
        <div className="max-w-7xl mx-auto px-3 md:px-4 text-center text-xs md:text-sm">
          <p>&copy; 2026 相続税シミュレーター</p>
        </div>
      </footer>
    </div>
    </StaffProvider>
  );
}

export default App;
