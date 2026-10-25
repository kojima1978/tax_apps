import { Routes, Route } from 'react-router-dom'
import { EditableListStep } from '@/components/EditableListStep'
import { MasterDataPage } from '@/components/MasterDataPage'
import { PoaPrincipalsPage } from '@/components/PoaPrincipalsPage'
import { PowerOfAttorneyPage } from '@/components/PowerOfAttorneyPage'
import { ResourcesPage } from '@/components/ResourcesPage'

export default function App() {
  return (
    <div className="bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 min-h-screen text-slate-800 dark:text-slate-200 transition-colors">
      <Routes>
        <Route path="/" element={<EditableListStep />} />
        <Route path="/resources" element={<ResourcesPage readOnly />} />
        <Route path="/masters" element={<MasterDataPage />} />
        <Route path="/power-of-attorney" element={<PowerOfAttorneyPage />} />
        <Route path="/power-of-attorney/principals" element={<PoaPrincipalsPage />} />
      </Routes>
    </div>
  )
}
