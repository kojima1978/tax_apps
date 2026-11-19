import { Navigate, Route, Routes } from 'react-router-dom';
import StaffPage from './pages/StaffPage';
import DepartmentsPage from './pages/DepartmentsPage';
import CompaniesPage from './pages/CompaniesPage';
import LinksPage from './pages/LinksPage';
import HelpPage from './pages/HelpPage';
import { AppHeader, AppSidebar } from './components/AppNavigation';

export default function App() {
  return (
    <div className="min-h-screen lg:pl-[4.5rem] print:pl-0">
      <AppSidebar />
      <AppHeader />
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <Routes>
          <Route path="/" element={<StaffPage />} />
          <Route path="/departments" element={<DepartmentsPage />} />
          <Route path="/companies" element={<CompaniesPage />} />
          <Route path="/links" element={<LinksPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
