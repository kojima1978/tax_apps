import { BrowserRouter, Routes, Route } from 'react-router-dom'
import GiftTaxPage from './pages/GiftTaxPage'
import TablePage from './pages/TablePage'
import AcquisitionTaxPage from './pages/AcquisitionTaxPage'
import RegistrationTaxPage from './pages/RegistrationTaxPage'

export default function App() {
  return (
    <BrowserRouter basename="/gift-tax-simulator">
      <Routes>
        <Route path="/" element={<GiftTaxPage />} />
        <Route path="/table" element={<TablePage />} />
        <Route path="/acquisition-tax" element={<AcquisitionTaxPage />} />
        <Route path="/registration-tax" element={<RegistrationTaxPage />} />
      </Routes>
    </BrowserRouter>
  )
}
