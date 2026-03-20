import { Routes, Route } from 'react-router-dom'
import InheritanceTaxDocGuide from '@/components/InheritanceTaxDocGuide'
import { UnlistedStockGuidePage } from '@/components/UnlistedStockGuidePage'
import { SimplifiedGuidePage } from '@/components/SimplifiedGuidePage'

export default function App() {
  return (
    <div className="bg-slate-50 min-h-screen text-slate-800">
      <Routes>
        <Route path="/" element={<InheritanceTaxDocGuide />} />
        <Route path="/simplified" element={<SimplifiedGuidePage />} />
        <Route path="/unlisted-stock" element={<UnlistedStockGuidePage />} />
      </Routes>
    </div>
  )
}
