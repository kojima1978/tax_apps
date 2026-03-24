import { Routes, Route } from 'react-router-dom';
import { StaffProvider } from './contexts/StaffContext';
import { TablePage } from './pages/TablePage';
import { CalculatorPage } from './pages/CalculatorPage';
import { ComparisonPage } from './pages/ComparisonPage';
import { InsurancePage } from './pages/InsurancePage';
import { CashGiftPage } from './pages/CashGiftPage';
import { SplitPage } from './pages/SplitPage';

function App() {
  return (
    <StaffProvider>
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/" element={<CalculatorPage />} />
        <Route path="/table" element={<TablePage />} />
        <Route path="/comparison" element={<ComparisonPage />} />
        <Route path="/insurance" element={<InsurancePage />} />
        <Route path="/cash-gift" element={<CashGiftPage />} />
        <Route path="/split" element={<SplitPage />} />
      </Routes>

      <footer className="bg-gray-800 text-white py-6 mt-12 no-print">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm">
          <p>&copy; 2026 相続税シミュレーター</p>
        </div>
      </footer>
    </div>
    </StaffProvider>
  );
}

export default App;
