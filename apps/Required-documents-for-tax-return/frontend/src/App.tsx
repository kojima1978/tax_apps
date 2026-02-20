import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ErrorBoundary from '@/components/ErrorBoundary'
import HomePage from './pages/HomePage'
import CustomersPage from './pages/CustomersPage'
import CustomerCreatePage from './pages/CustomerCreatePage'
import CustomerEditPage from './pages/CustomerEditPage'
import StaffPage from './pages/StaffPage'
import StaffCreatePage from './pages/StaffCreatePage'
import StaffEditPage from './pages/StaffEditPage'
import DataManagementPage from './pages/DataManagementPage'

export default function App() {
  return (
    <BrowserRouter basename="/tax-docs">
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/customers/create" element={<CustomerCreatePage />} />
          <Route path="/customers/:id/edit" element={<CustomerEditPage />} />
          <Route path="/staff" element={<StaffPage />} />
          <Route path="/staff/create" element={<StaffCreatePage />} />
          <Route path="/staff/:id/edit" element={<StaffEditPage />} />
          <Route path="/data-management" element={<DataManagementPage />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
