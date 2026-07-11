import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { Routes, Route } from 'react-router-dom'
import './i18n'
import './index.css'

const VITE_GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string

// eslint-disable-next-line react-refresh/only-export-components
function App() {
  return (
    <Routes>
      <Route path="/" element={<div className="p-8 text-center">Landing (Task 1D)</div>} />
      <Route path="*" element={<div className="p-8 text-center">404</div>} />
    </Routes>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={VITE_GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </GoogleOAuthProvider>
  </StrictMode>,
)
