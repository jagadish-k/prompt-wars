import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { LanguageProvider } from './i18n/LanguageProvider'
import { useAuthStore } from './stores/auth'
import { ProtectedRoute } from './app/ProtectedRoute'
import LandingRoute from './routes/LandingRoute'
import './i18n'
import './index.css'

const VITE_GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string

// Static placeholders for routes built in later waves (2E/2F/3G).
// Defined as elements (not components) so they don't trip react-refresh rules.
const OnboardingPlaceholder = <div className="p-8">Onboarding (soon)</div>
const AppHomePlaceholder = <div className="p-8">App (soon)</div>
const LocationsPlaceholder = <div className="p-8">Locations (soon)</div>

// eslint-disable-next-line react-refresh/only-export-components
function App() {
  useEffect(() => {
    void useAuthStore.getState().load()
  }, [])
  return (
    <Routes>
      <Route path="/" element={<LandingRoute />} />
      <Route
        path="/onboarding"
        element={<ProtectedRoute>{OnboardingPlaceholder}</ProtectedRoute>}
      />
      <Route path="/app" element={<ProtectedRoute>{AppHomePlaceholder}</ProtectedRoute>} />
      <Route
        path="/app/locations"
        element={<ProtectedRoute>{LocationsPlaceholder}</ProtectedRoute>}
      />
      <Route path="*" element={<div className="p-8 text-center">404</div>} />
    </Routes>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={VITE_GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <LanguageProvider>
          <App />
        </LanguageProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  </StrictMode>,
)
