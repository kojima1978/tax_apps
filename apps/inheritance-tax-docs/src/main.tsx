import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './globals.css'

// ダーク表示は廃止したため、以前の保存値や残ったクラスを起動時に取り除く。
document.documentElement.classList.remove('dark')
try {
  localStorage.removeItem('inheritance_tax_docs_dark_mode')
} catch {
  // 保存領域を使えない環境でもライト表示のまま起動する。
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename="/inheritance-tax-docs">
      <App />
    </BrowserRouter>
  </StrictMode>,
)
