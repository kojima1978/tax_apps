import { Routes, Route } from 'react-router-dom';
import { TablePage } from './pages/TablePage';
import { CalculatorPage } from './pages/CalculatorPage';
import { ComparisonPage } from './pages/ComparisonPage';
import { InsurancePage } from './pages/InsurancePage';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/" element={<TablePage />} />
        <Route path="/calculator" element={<CalculatorPage />} />
        <Route path="/comparison" element={<ComparisonPage />} />
        <Route path="/insurance" element={<InsurancePage />} />
      </Routes>

      <footer className="bg-gray-800 text-white py-6 mt-12 no-print">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm">
          <p>&copy; 2026 相続税シミュレーター</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
