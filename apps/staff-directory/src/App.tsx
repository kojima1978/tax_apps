import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import StaffPage from './pages/StaffPage';
import DepartmentsPage from './pages/DepartmentsPage';
import OfficePage from './pages/OfficePage';

const NAV = [
  { to: '/', label: '社員' },
  { to: '/departments', label: '部署' },
  { to: '/office', label: '事務所' },
] as const;

export default function App() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-8 px-6 py-3">
          <a href="/" className="text-sm text-slate-500 hover:text-slate-700">← ポータル</a>
          <h1 className="text-lg font-bold text-slate-800">社員台帳</h1>
          <nav className="flex gap-1">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 text-sm font-medium ${
                    isActive ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-6">
        <Routes>
          <Route path="/" element={<StaffPage />} />
          <Route path="/departments" element={<DepartmentsPage />} />
          <Route path="/office" element={<OfficePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
