import { BrowserRouter, Routes, Route } from 'react-router-dom'
import GiftTaxPage from './pages/GiftTaxPage'
import TablePage from './pages/TablePage'
import YearComparisonPage from './pages/YearComparisonPage'
import AcquisitionTaxPage from './pages/AcquisitionTaxPage'
import RegistrationTaxPage from './pages/RegistrationTaxPage'

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<GiftTaxPage />} />
        <Route path="/table" element={<TablePage />} />
        <Route path="/year-comparison" element={<YearComparisonPage />} />
        <Route path="/acquisition-tax" element={<AcquisitionTaxPage />} />
        <Route path="/registration-tax" element={<RegistrationTaxPage />} />
      </Routes>
    </BrowserRouter>
  )
}
