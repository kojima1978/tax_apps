import { Routes, Route } from 'react-router-dom'
import { EditableListStep } from '@/components/EditableListStep'
import { ResourcesPage } from '@/components/ResourcesPage'

export default function App() {
  return (
    <div className="bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 min-h-screen text-slate-800 dark:text-slate-200 transition-colors">
      <Routes>
        <Route path="/" element={<EditableListStep />} />
        <Route path="/resources" element={<ResourcesPage />} />
      </Routes>
    </div>
  )
}
