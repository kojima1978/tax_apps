import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import App from './App'
import './globals.css'

// 画面の切り替えは App の <Routes> が持つ。ここをデータルーターにしているのは
// 未保存の変更があるときに移動を止める useBlocker（hooks/useLeaveGuard）がこれでしか動かないため
const router = createBrowserRouter([{ path: '*', element: <App /> }], { basename: '/staff-directory' })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
