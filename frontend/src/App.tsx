import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { IDEPage } from './pages/IDEPage'
import { DashboardPage } from './pages/DashboardPage'
import { Layout } from './components/Layout'
import './styles/globals.css'

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#13131f',
            color: '#c8c8e8',
            border: '1px solid #1e1e30',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '13px',
          },
          success: { iconTheme: { primary: '#00ff9f', secondary: '#0a0a0f' } },
          error: { iconTheme: { primary: '#ff4444', secondary: '#0a0a0f' } },
        }}
      />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/ide" element={<IDEPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
