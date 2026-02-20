import { BrowserRouter, Routes, Route } from 'react-router-dom'
import GiftTaxPage from './pages/GiftTaxPage'
import TablePage from './pages/TablePage'
import RealEstatePage from './pages/RealEstatePage'

export default function App() {
  return (
    <BrowserRouter basename="/gift-tax-simulator">
      <Routes>
        <Route path="/" element={<GiftTaxPage />} />
        <Route path="/table" element={<TablePage />} />
        <Route path="/real-estate" element={<RealEstatePage />} />
      </Routes>
    </BrowserRouter>
  )
}
