import { Routes, Route } from 'react-router-dom'
import { Home } from 'lucide-react'
import { ToastProvider } from '@/components/ui/Toast'
import HomePage from '@/pages/HomePage'
import Step1Page from '@/pages/Step1Page'
import Step2Page from '@/pages/Step2Page'
import Step3Page from '@/pages/Step3Page'
import Step4Page from '@/pages/Step4Page'
import Step5Page from '@/pages/Step5Page'
import Step6Page from '@/pages/Step6Page'
import Step7Page from '@/pages/Step7Page'
import Step8Page from '@/pages/Step8Page'
import Step9Page from '@/pages/Step9Page'
import Step10Page from '@/pages/Step10Page'
import BulkPage from '@/pages/BulkPage'

export default function App() {
  return (
    <ToastProvider>
      <main className="min-h-screen p-4 sm:p-8">
        <div className="max-w-4xl mx-auto">
          <a href="/" title="ポータルに戻る" aria-label="ポータルに戻る" className="no-print inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-4">
            <Home className="w-4 h-4" aria-hidden="true" />
            <span>ポータル</span>
          </a>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/valuation/step1" element={<Step1Page />} />
            <Route path="/valuation/step2" element={<Step2Page />} />
            <Route path="/valuation/step3" element={<Step3Page />} />
            <Route path="/valuation/step4" element={<Step4Page />} />
            <Route path="/valuation/step5" element={<Step5Page />} />
            <Route path="/valuation/step6" element={<Step6Page />} />
            <Route path="/valuation/step7" element={<Step7Page />} />
            <Route path="/valuation/step8" element={<Step8Page />} />
            <Route path="/valuation/step9" element={<Step9Page />} />
            <Route path="/valuation/step10" element={<Step10Page />} />
            <Route path="/valuation/bulk" element={<BulkPage />} />
          </Routes>
        </div>
      </main>
    </ToastProvider>
  )
}
