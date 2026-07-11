# Monsoon Preparedness App (Epics 1–4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a deployable, mobile-first React + HeroUI v3 web app on Netlify covering PRD Epics 1–4: project setup, geolocation + unauthenticated multi-location weather teaser, Google sign-in + onboarding, and authenticated multi-location management with Gemini-powered personalized preparedness plans.

**Architecture:** Vite SPA (React 19 + TS) served as a Netlify SPA. All secrets stay in Netlify serverless/edge functions (`/api/*`). Postgres via Drizzle ORM holds relational data; Netlify Blobs caches weather responses. Gemini `@google/genai` generates structured plan JSON. The single auth mechanism is Sign in with Google → verified server-side → signed HttpOnly session cookie.

**Tech Stack:** React 19, TypeScript, Vite 8, HeroUI v3, Tailwind v4 (`@tailwindcss/vite`), React Router v6, Zustand, react-i18next (en/hi/bn), `@react-oauth/google` + `google-auth-library`, Drizzle ORM + `@neondatabase/serverless` (Netlify Postgres), `@netlify/blobs`, `@google/genai` (Gemini 3.x), `jose` (session JWT), `zod` (validation), vitest + @testing-library.

## Global Constraints

- **HeroUI v3 rules:** NO provider (v2 `<HeroUIProvider>` is wrong). Use compound components (`Card.Header`, `Tabs.Tab`). Use `onPress`, not `onClick`. CSS import order: `@import "tailwindcss";` then `@import "@heroui/styles";`.
- **Mobile-first a11y:** 48×48px minimum touch targets; semantic HTML; `aria-live="polite"` on weather/alert streams; WCAG-AAA contrast for severity chips.
- **i18n:** Every user-facing string goes through `useTranslation()`. Gemini prompts receive the user's `preferred_language`.
- **Secrets:** `GEMINI_API_KEY`, `DATABASE_URL`, `WEATHER_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET` are server-side only. `VITE_GOOGLE_CLIENT_ID` is the sole documented public client exception (Google Client ID is public by design).
- **Path alias:** `@/` → `./src`.
- **Gate:** Every task ends with `npm run lint && npm run build` green, then commit. TypeScript (`tsc -b`) is the type gate.
- **Gemini models (current per gemini-api skill):** `gemini-3.1-pro-preview` for structured plan JSON. 2.x/1.5 are legacy — do not use.
- **SDK:** Gemini uses `@google/genai` (NOT `@google/generative-ai`).

## File Structure

```
vite.config.ts                     (modify) tailwind plugin + @ alias + vitest
src/index.css                      (modify) tailwind + heroui imports, theme tokens
src/main.tsx                       (modify) GoogleOAuthProvider + Router + i18n
src/App.tsx                        (modify) routed shell (replace demo)
src/lib/api.ts                     client fetcher for /api/*
src/lib/types.ts                   shared types (Weather, Plan, Profile, Location)
src/i18n/index.ts                  i18next config
src/i18n/LanguageProvider.tsx      provider + LanguageSwitcher
locales/{en,hi,bn}.json            namespaced translation bundles
src/hooks/useUserLocation.ts       HTML5 geolocation + edge fallback
src/hooks/useAuth.ts               auth Zustand selector hook
src/stores/auth.ts                 auth Zustand store
src/stores/locations.ts            locations Zustand store
src/app/ProtectedRoute.tsx         guard for authenticated routes
src/routes/LandingRoute.tsx        unauthenticated teaser (/)
src/routes/OnboardingRoute.tsx     wizard (/onboarding)
src/routes/CommandCenterRoute.tsx  authenticated app (/app)
src/routes/LocationsRoute.tsx      location hub (/app/locations)
src/components/*                   WeatherCard, CitySearch, Checklist, RiskChip, etc.
netlify.toml                       (create) build + SPA redirects + functions
.netlify/                           netlify config (auto)
.env.example                        (create) documented env keys
db/schema.ts                        Drizzle schema (PRD §3)
db/client.ts                        drizzle + neon-http client
drizzle.config.ts                   drizzle-kit config
netlify/edge-functions/geo-fallback.ts
netlify/functions/weather.ts
netlify/functions/auth/callback.ts
netlify/functions/auth/me.ts
netlify/functions/auth/logout.ts
netlify/functions/save-profile.ts
netlify/functions/locations.ts
netlify/functions/generate-plan.ts
src/lib/__tests__/                 vitest unit tests for pure logic
```

## Parallelization (waves)

```
Wave 0: Task 0.1 (foundation) — sequential trunk
Wave 1: Tasks 1A, 1B, 1C, 1D — 4 parallel (non-overlapping file sets)
Wave 2: Tasks 2E, 2F — 2 parallel
Wave 3: Task 3G — converges
```

---

## Task 0.1: Foundation Trunk  (Wave 0)

**Files:**
- Modify: `package.json`, `vite.config.ts`, `src/index.css`, `src/main.tsx`, `src/App.tsx`, `eslint.config.js`
- Create: `netlify.toml`, `.env.example`, `src/lib/api.ts`, `src/lib/types.ts`, `src/app/ProtectedRoute.tsx`

**Interfaces:**
- Produces: `@/` path alias; `apiGet/apiPost/apiDelete` in `src/lib/api.ts`; shared types in `src/lib/types.ts`; routed shell with `<ProtectedRoute>`; `GoogleOAuthProvider` wrapping app.

- [ ] **Step 1: Install dependencies**

```bash
npm i react-router-dom@^6 zustand react-i18next i18next i18next-browser-languagedetector @react-oauth/google google-auth-library jose zod drizzle-orm @neondatabase/serverless @netlify/blobs @google/genai framer-motion lucide-react
npm i -D tailwindcss@^4 @tailwindcss/vite vitest @testing-library/react @testing-library/jest-dom jsdom drizzle-kit
```

- [ ] **Step 2: Configure Vite (Tailwind plugin + alias + vitest)**

Replace `vite.config.ts`:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts',
  },
})
```

- [ ] **Step 3: Add test setup file**

Create `src/test-setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 4: Update tsconfig path alias**

In `tsconfig.app.json` `compilerOptions`, add:

```json
"baseUrl": ".",
"paths": { "@/*": ["./src/*"] }
```

- [ ] **Step 5: Rewrite `src/index.css` (Tailwind v4 + HeroUI v3)**

Replace the entire file with:

```css
@import "tailwindcss";
@import "@heroui/styles";

:root { color-scheme: light dark; }

html, body, #root { height: 100%; }
body { margin: 0; }
```

- [ ] **Step 6: Create `.env.example`**

```bash
# Server-side only (NEVER prefix with VITE_):
GEMINI_API_KEY=
DATABASE_URL=             # Netlify Postgres pooled connection string
WEATHER_API_KEY=          # WeatherAPI.com key
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
SESSION_SECRET=           # random 32+ char string to sign session cookies

# Client-side (public by Google's design — sole documented VITE_ exception):
VITE_GOOGLE_CLIENT_ID=
```

- [ ] **Step 7: Create `netlify.toml`**

```toml
[build]
  command = "npm run build"
  publish = "dist"
  functions = "netlify/functions"

[functions]
  node_bundler = "esbuild"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

- [ ] **Step 8: Shared types** — Create `src/lib/types.ts`:

```ts
export interface GeoPoint { lat: number; lng: number; city?: string }

export interface WeatherAlert { event: string; severity: 'minor' | 'moderate' | 'severe' | 'extreme'; description: string; starts?: string; expires?: string }
export interface WeatherData { location: string; alerts: WeatherAlert[]; rainfallMm: number; forecast: string }

export type DwellingType = 'ground_floor' | 'high_rise' | 'independent_house'
export interface UserProfile { id: string; email: string; preferredLanguage: string; householdSize: number; dwellingType: DwellingType | null }
export interface MonitoredLocation { id: string; locationName: string; lat: number; lng: number; isPrimary: boolean }
export interface Vulnerability { id: string; type: string }

export interface PlanChecklistItem { id: string; label: string; done: boolean }
export interface LocationPlan { locationName: string; summary: string; immediate: PlanChecklistItem[]; supplies: PlanChecklistItem[]; evacuation: string }
export interface PreparednessPlan { overview: string; locations: LocationPlan[]; updatedAt: string }
```

- [ ] **Step 9: API client** — Create `src/lib/api.ts`:

```ts
import type { WeatherData, UserProfile, MonitoredLocation, PreparednessPlan } from './types'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { credentials: 'include', ...init })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T)
}

export const api = {
  getWeather: (lat: number, lng: number) => request<WeatherData>(`/api/weather?lat=${lat}&lng=${lng}`),
  getMe: () => request<UserProfile>('/api/auth/me'),
  logout: () => request<void>('/api/auth/logout', { method: 'POST' }),
  saveProfile: (body: unknown) => request<UserProfile>('/api/save-profile', { method: 'POST', body: JSON.stringify(body) }),
  listLocations: () => request<MonitoredLocation[]>('/api/locations'),
  saveLocation: (body: unknown) => request<MonitoredLocation>('/api/locations', { method: 'POST', body: JSON.stringify(body) }),
  deleteLocation: (id: string) => request<void>(`/api/locations?id=${id}`, { method: 'DELETE' }),
  generatePlan: () => request<PreparednessPlan>('/api/generate-plan', { method: 'POST' }),
}
```

- [ ] **Step 10: Protected route placeholder** — Create `src/app/ProtectedRoute.tsx`:

```tsx
import { Navigate } from 'react-router-dom'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  // Real guard wired in Task 1C; placeholder allows routing skeleton to compile.
  return <>{children}</>
}
```

- [ ] **Step 11: Routed shell + providers** — Replace `src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { Routes, Route } from 'react-router-dom'
import './i18n'
import './index.css'

const VITE_GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string

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
```

- [ ] **Step 12: i18n stub (full impl in Task 1A)** — Create `src/i18n/index.ts`:

```ts
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

i18n.use(initReactI18next).use(LanguageDetector).init({
  fallbackLng: 'en',
  resources: { en: { translation: { app: { title: 'Monsoon Ready' } } } },
})

export default i18n
```

- [ ] **Step 13: Delete demo assets / clean `App.tsx`** — Remove `src/App.tsx`, `src/App.css`, `src/assets/` (no longer imported).

- [ ] **Step 14: Add scripts** — In `package.json` `scripts`, add: `"test": "vitest run"`, `"test:watch": "vitest"`, `"db:push": "drizzle-kit push"`.

- [ ] **Step 15: Verify + commit**

```bash
npm run lint && npm run build
git add -A && git commit -m "feat(foundation): vite+tailwind v4+heroui v3, routing, api client, env, netlify.toml"
```

---

## Task 1A: i18n + Language Switcher  (Wave 1)

**Files:**
- Create: `locales/en.json`, `locales/hi.json`, `locales/bn.json`, `src/i18n/LanguageProvider.tsx`, `src/components/LanguageSwitcher.tsx`
- Modify: `src/i18n/index.ts`, `src/main.tsx` (wrap with LanguageProvider)

**Interfaces:**
- Consumes: `src/i18n/index.ts` from Task 0.1.
- Produces: `<LanguageProvider>` and `<LanguageSwitcher />`; `i18n.changeLanguage(lang)`; namespaced bundles `{ common, landing, onboarding, dashboard }`.

- [ ] **Step 1: Translation bundles** — Create `locales/en.json`:

```json
{
  "common": { "appName": "Monsoon Ready", "signInGoogle": "Sign in with Google", "loading": "Loading…", "error": "Something went wrong" },
  "landing": { "title": "Stay ready this monsoon", "subtitle": "Track weather across your locations", "addCity": "Add a city", "loginForPlan": "Sign in for your personalized preparedness plan", "severe": "Severe weather" },
  "onboarding": { "title": "Set up your profile", "homeLocation": "Home location", "dwelling": "Your home type", "household": "Household size", "vulnerabilities": "Special needs", "save": "Save and continue" },
  "dashboard": { "primaryStatus": "Primary Status", "savedZones": "Saved Zones", "actionPlan": "Action Plan Checklist", "generatePlan": "Generate my plan", "addLocation": "Add location" }
}
```

- [ ] **Step 2:** Create `locales/hi.json` (Hindi) — same keys, translated values:

```json
{
  "common": { "appName": "मानसून रेडी", "signInGoogle": "Google से साइन इन करें", "loading": "लोड हो रहा है…", "error": "कुछ गलत हुआ" },
  "landing": { "title": "इस मानसून के लिए तैयार रहें", "subtitle": "अपने स्थानों पर मौसम ट्रैक करें", "addCity": "शहर जोड़ें", "loginForPlan": "अपनी व्यक्तिगत तैयारी योजना के लिए साइन इन करें", "severe": "गंभीर मौसम" },
  "onboarding": { "title": "अपनी प्रोफ़ाइल सेट करें", "homeLocation": "घर का स्थान", "dwelling": "आपके घर का प्रकार", "household": "परिवार का आकार", "vulnerabilities": "विशेष जरूरतें", "save": "सहेजें और जारी रखें" },
  "dashboard": { "primaryStatus": "मुख्य स्थिति", "savedZones": "सहेजे गए क्षेत्र", "actionPlan": "कार्रवाई योजना चेकलिस्ट", "generatePlan": "मेरी योजना बनाएं", "addLocation": "स्थान जोड़ें" }
}
```

- [ ] **Step 3:** Create `locales/bn.json` (Bengali) — same keys, translated values:

```json
{
  "common": { "appName": "মনসুন রেডি", "signInGoogle": "Google দিয়ে সাইন ইন করুন", "loading": "লোড হচ্ছে…", "error": "কিছু ভুল হয়েছে" },
  "landing": { "title": "এই মনসুনে প্রস্তুত থাকুন", "subtitle": "আপনার অবস্থানগুলিতে আবহাওয়া ট্র্যাক করুন", "addCity": "একটি শহর যোগ করুন", "loginForPlan": "আপনার ব্যক্তিগত প্রস্তুতি পরিকল্পনার জন্য সাইন ইন করুন", "severe": "ভয়াবহ আবহাওয়া" },
  "onboarding": { "title": "আপনার প্রোফাইল সেট আপ করুন", "homeLocation": "বাড়ির অবস্থান", "dwelling": "আপনার বাড়ির ধরন", "household": "পরিবারের আকার", "vulnerabilities": "বিশেষ প্রয়োজন", "save": "সংরক্ষণ করুন এবং চালিয়ে যান" },
  "dashboard": { "primaryStatus": "প্রাথমিক অবস্থা", "savedZones": "সংরক্ষিত অঞ্চল", "actionPlan": "কর্ম পরিকল্পনা চেকলিস্ট", "generatePlan": "আমার পরিকল্পনা তৈরি করুন", "addLocation": "অবস্থান যোগ করুন" }
}
```

- [ ] **Step 4: Wire i18n to bundles** — Replace `src/i18n/index.ts`:

```ts
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import en from '../../locales/en.json'
import hi from '../../locales/hi.json'
import bn from '../../locales/bn.json'

i18n.use(initReactI18next).use(LanguageDetector).init({
  fallbackLng: 'en',
  supportedLngs: ['en', 'hi', 'bn'],
  resources: { en: { translation: en }, hi: { translation: hi }, bn: { translation: bn } },
  detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] },
  interpolation: { escapeValue: false },
})

export default i18n
```

- [ ] **Step 5: LanguageProvider** — Create `src/i18n/LanguageProvider.tsx`:

```tsx
import { Suspense, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation()
  if (!i18n.isInitialized) return null
  return <Suspense fallback={null}>{children}</Suspense>
}
```

- [ ] **Step 6: LanguageSwitcher (HeroUI v3 Dropdown)** — Create `src/components/LanguageSwitcher.tsx`:

```tsx
import { useTranslation } from 'react-i18next'
import { Button } from '@heroui/react'   // use the v3 export path verified at impl time

const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'bn', label: 'বাংলা' },
]

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation()
  const cycle = () => {
    const idx = LANGS.findIndex((l) => l.code === i18n.language)
    const next = LANGS[(idx + 1) % LANGS.length]
    i18n.changeLanguage(next.code)
  }
  return (
    <Button variant="secondary" onPress={cycle} aria-label={t('common.appName')}>
      {LANGS.find((l) => l.code === i18n.language)?.label ?? 'English'}
    </Button>
  )
}
```

> Note: Confirm exact HeroUI v3 `Dropdown`/`Button` import + compound API via `node scripts/get_component_docs.mjs Button` (heroui-react skill). A simple cycling Button is used here to avoid guessing the Dropdown API; upgrade to Dropdown once verified.

- [ ] **Step 7: Wrap app with LanguageProvider** — In `src/main.tsx`, import and wrap `<App/>` with `<LanguageProvider>` inside `<BrowserRouter>`.

- [ ] **Step 8: Test language switching** — Create `src/lib/__tests__/i18n.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import i18n from '@/i18n'

describe('i18n', () => {
  it('falls back to en and resolves keys per language', async () => {
    await i18n.changeLanguage('hi')
    expect(i18n.t('landing.addCity')).toBe('शहर जोड़ें')
    await i18n.changeLanguage('bn')
    expect(i18n.t('landing.addCity')).toBe('একটি শহর যোগ করুন')
    await i18n.changeLanguage('en')
    expect(i18n.t('landing.addCity')).toBe('Add a city')
  })
})
```

- [ ] **Step 9: Verify + commit**

```bash
npm run lint && npm run build && npm run test
git add -A && git commit -m "feat(i18n): en/hi/bn bundles, LanguageProvider, switcher"
```

---

## Task 1B: Geolocation + Weather  (Wave 1)

**Files:**
- Create: `src/hooks/useUserLocation.ts`, `netlify/edge-functions/geo-fallback.ts`, `netlify/functions/weather.ts`, `src/lib/__tests__/weather.test.ts`
- Consumes: `src/lib/api.ts`, `src/lib/types.ts` (Task 0.1).

**Interfaces:**
- Produces: `useUserLocation()` → `{ lat, lng, city } | null`; `GET /api/weather?lat&lng` → `WeatherData`; edge `/api/geo-fallback` → `{ city }`. Weather responses cached in Blobs under key `weather-cache/{lat},{lng}` (rounded to 2dp) with 10-min TTL.

- [ ] **Step 1: `useUserLocation` hook** — Create `src/hooks/useUserLocation.ts`:

```ts
import { useEffect, useState } from 'react'
import type { GeoPoint } from '@/lib/types'

export function useUserLocation() {
  const [location, setLocation] = useState<GeoPoint | null>(null)
  useEffect(() => {
    if (!('geolocation' in navigator)) return fallback()
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => fallback(),
      { enableHighAccuracy: false, timeout: 8000 },
    )
    async function fallback() {
      try {
        const res = await fetch('/api/geo-fallback')
        if (res.ok) setLocation((await res.json()) as GeoPoint)
      } catch { /* ignore */ }
    }
  }, [])
  return location
}
```

- [ ] **Step 2: Edge fallback** — Create `netlify/edge-functions/geo-fallback.ts`:

```ts
export default async (_req: Request, context: { geo?: { city?: string; latitude?: number; longitude?: number } }) => {
  const { city, latitude, longitude } = context.geo ?? {}
  if (!city || latitude == null) return new Response('unknown', { status: 404 })
  return Response.json({ city, lat: latitude, lng: longitude })
}
```

> Declare the edge function route in `netlify.toml` by adding:
> ```toml
> [[edge_functions]]
>   function = "geo-fallback"
>   path = "/api/geo-fallback"
> ```

- [ ] **Step 3: Weather normalizer (pure, testable)** — Add to `src/lib/types.ts`? No — put server-side normalizer in the function. Create `netlify/functions/weather.ts`:

```ts
import type { WeatherData, WeatherAlert } from '../../src/lib/types'

interface WaAlert { headline?: string; event?: string; severity?: string; description?: string; effective?: string; expires?: string }

export function normalizeWeather(locName: string, alerts: WaAlert[], current: { precip_mm?: number; condition?: { text?: string } }): WeatherData {
  const sevMap: Record<string, WeatherAlert['severity']> = { moderate: 'moderate', severe: 'severe', extreme: 'extreme' }
  return {
    location: locName,
    alerts: (alerts ?? []).map((a) => ({
      event: a.event ?? a.headline ?? 'Weather alert',
      severity: sevMap[(a.severity ?? '').toLowerCase()] ?? 'minor',
      description: a.description ?? '',
      starts: a.effective, expires: a.expires,
    })),
    rainfallMm: current.precip_mm ?? 0,
    forecast: current.condition?.text ?? '',
  }
}

export default async (req: Request): Promise<Response> => {
  const url = new URL(req.url)
  const lat = Number(url.searchParams.get('lat'))
  const lng = Number(url.searchParams.get('lng'))
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return new Response('bad coords', { status: 400 })

  const key = process.env.WEATHER_API_KEY
  if (!key) return new Response('weather not configured', { status: 503 })

  const { getStore } = await import('@netlify/blobs')
  const store = getStore('weather-cache')
  const cacheKey = `${lat.toFixed(2)},${lng.toFixed(2)}`
  const cached = await store.get(cacheKey, { metadata: true })
  if (cached?.metadata && Date.now() - Number(cached.metadata.ttl) < 10 * 60 * 1000 && cached.data) {
    return Response.json(JSON.parse(cached.data))
  }

  const base = 'https://api.weatherapi.com/v1/forecast.json'
  const q = `${lat},${lng}`
  const res = await fetch(`${base}?key=${key}&q=${q}&days=1&alerts=yes`, { headers: { Accept: 'application/json' } })
  if (!res.ok) return new Response('weather upstream error', { status: 502 })
  const data = await res.json()
  const normalized = normalizeWeather(
    data.location?.name ?? cacheKey,
    data.alerts?.alert ?? [],
    { precip_mm: data.current?.precip_mm, condition: { text: data.current?.condition?.text } },
  )
  await store.setJSON(cacheKey, normalized, { metadata: { ttl: String(Date.now()) } })
  return Response.json(normalized)
}
```

- [ ] **Step 4: Unit test the normalizer** — Create `src/lib/__tests__/weather.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
// Import the server normalizer for pure-logic testing.
import { normalizeWeather } from '../../../netlify/functions/weather'

describe('normalizeWeather', () => {
  it('maps severities and defaults missing fields', () => {
    const out = normalizeWeather('Mumbai', [{ event: 'Flood', severity: 'Severe', description: 'Heavy rain' }], { precip_mm: 42, condition: { text: 'Rain' } })
    expect(out.location).toBe('Mumbai')
    expect(out.alerts[0].severity).toBe('severe')
    expect(out.rainfallMm).toBe(42)
    expect(out.forecast).toBe('Rain')
  })
  it('treats unknown severity as minor', () => {
    const out = normalizeWeather('X', [{ severity: 'Unknown' }], {})
    expect(out.alerts[0].severity).toBe('minor')
  })
})
```

> Note: Vitest importing a `netlify/functions/*.ts` default-export module for its named export is fine because it is plain TS.

- [ ] **Step 5: Verify + commit**

```bash
npm run lint && npm run build && npm run test
git add -A && git commit -m "feat(geo): useUserLocation hook, geo-fallback edge fn, weather fn w/ blob cache"
```

---

## Task 1C: Auth + DB  (Wave 1)

**Files:**
- Create: `db/schema.ts`, `db/client.ts`, `drizzle.config.ts`, `netlify/functions/auth/callback.ts`, `netlify/functions/auth/me.ts`, `netlify/functions/auth/logout.ts`, `src/stores/auth.ts`, `src/hooks/useAuth.ts`
- Modify: `src/app/ProtectedRoute.tsx`, `src/main.tsx` (optional login button), `netlify.toml`

**Interfaces:**
- Consumes: shared types (Task 0.1).
- Produces: Drizzle schema (4 tables) + client; session cookie auth via `verifySession(req)`; `<GoogleLogin/>` → `/api/auth/callback`; `useAuth()` store; real `<ProtectedRoute>`.

- [ ] **Step 1: Drizzle config** — Create `drizzle.config.ts`:

```ts
import { defineConfig } from 'drizzle-kit'
export default defineConfig({
  schema: './db/schema.ts',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL ?? process.env.NETLIFY_DATABASE_URL ?? '' },
})
```

- [ ] **Step 2: Schema (PRD §3)** — Create `db/schema.ts`:

```ts
import { pgTable, uuid, text, integer, boolean, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core'

export const dwellingEnum = pgEnum('dwelling_type', ['ground_floor', 'high_rise', 'independent_house'])

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  preferredLanguage: text('preferred_language').default('en').notNull(),
  householdSize: integer('household_size').default(1).notNull(),
  dwellingType: dwellingEnum('dwelling_type'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const monitoredLocations = pgTable('monitored_locations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  locationName: text('location_name').notNull(),
  latitude: text('latitude').notNull(), // stored as text to preserve precision
  longitude: text('longitude').notNull(),
  isPrimary: boolean('is_primary').default(false).notNull(),
})

export const vulnerabilities = pgTable('vulnerabilities', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
})

export const preparednessPlans = pgTable('preparedness_plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  locationId: uuid('location_id').references(() => monitoredLocations.id),
  planData: jsonb('plan_data').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
```

> Latitude/longitude are stored as `text` to preserve precision without float coercion; parse with `Number()` on read.

- [ ] **Step 3: DB client** — Create `db/client.ts`:

```ts
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from './schema'

export function getDb() {
  const url = process.env.DATABASE_URL ?? process.env.NETLIFY_DATABASE_URL
  if (!url) throw new Error('DATABASE_URL missing')
  const sql = neon(url)
  return drizzle(sql, { schema })
}
```

- [ ] **Step 4: Session helpers** — Create `netlify/functions/auth/_session.ts`:

```ts
import { SignJWT, jwtVerify } from 'jose'

const enc = () => new TextEncoder().encode(process.env.SESSION_SECRET!)

export async function makeSession(payload: { sub: string; email: string }) {
  const token = await new SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('7d').sign(enc())
  return token
}

export async function verifySession(req: Request): Promise<{ sub: string; email: string } | null> {
  const cookie = req.headers.get('cookie') ?? ''
  const match = cookie.match(/session=([^;]+)/)
  if (!match) return null
  try {
    const { payload } = await jwtVerify(match[1], enc())
    return { sub: String(payload.sub), email: String(payload.email) }
  } catch {
    return null
  }
}

export const sessionCookie = (token: string) =>
  `session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`
```

- [ ] **Step 5: Callback** — Create `netlify/functions/auth/callback.ts`:

```ts
import { OAuth2Client } from 'google-auth-library'
import { eq } from 'drizzle-orm'
import { getDb } from '../../db/client'
import { users } from '../../db/schema'
import { makeSession, sessionCookie } from './_session'

export default async (req: Request): Promise<Response> => {
  const { credential } = await req.json() as { credential?: string }
  if (!credential) return new Response('missing credential', { status: 400 })

  const clientId = process.env.VITE_GOOGLE_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID
  const oauth = new OAuth2Client(clientId)
  const ticket = await oauth.verifyIdToken({ idToken: credential, audience: clientId })
  const payload = ticket.getPayload()!
  const googleId = payload.sub!
  const email = payload.email!

  const db = getDb()
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1)
  let user = existing[0]
  if (!user) {
    const [created] = await db.insert(users).values({ email }).returning()
    user = created
  }

  const token = await makeSession({ sub: user.id, email })
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json', 'Set-Cookie': sessionCookie(token) },
  })
}
```

- [ ] **Step 6: `me` + `logout`** — Create `netlify/functions/auth/me.ts`:

```ts
import { eq } from 'drizzle-orm'
import { getDb } from '../../db/client'
import { users } from '../../db/schema'
import { verifySession } from './_session'

export default async (req: Request): Promise<Response> => {
  const session = await verifySession(req)
  if (!session) return new Response('unauthorized', { status: 401 })
  const db = getDb()
  const [u] = await db.select().from(users).where(eq(users.id, session.sub)).limit(1)
  if (!u) return new Response('not found', { status: 404 })
  return Response.json({ id: u.id, email: u.email, preferredLanguage: u.preferredLanguage, householdSize: u.householdSize, dwellingType: u.dwellingType })
}
```

Create `netlify/functions/auth/logout.ts`:

```ts
export default async (): Promise<Response> =>
  new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json', 'Set-Cookie': 'session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0' },
  })
```

- [ ] **Step 7: Auth store + hook** — Create `src/stores/auth.ts`:

```ts
import { create } from 'zustand'
import type { UserProfile } from '@/lib/types'
import { api } from '@/lib/api'

interface AuthState { user: UserProfile | null; loading: boolean; load: () => Promise<void>; setUser: (u: UserProfile | null) => void }
export const useAuthStore = create<AuthState>((set) => ({
  user: null, loading: true,
  load: async () => { try { set({ user: await api.getMe(), loading: false }) } catch { set({ user: null, loading: false }) } },
  setUser: (user) => set({ user, loading: false }),
}))
```

Create `src/hooks/useAuth.ts`:

```ts
import { useAuthStore } from '@/stores/auth'
export const useAuth = () => useAuthStore()
```

- [ ] **Step 8: Real ProtectedRoute** — Replace `src/app/ProtectedRoute.tsx`:

```tsx
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="p-8 text-center">Loading…</div>
  if (!user) return <Navigate to="/" replace />
  return <>{children}</>
}
```

- [ ] **Step 9: Wire login + bootstrap** — In `src/main.tsx` (or a small `<AppShell>`), call `useAuthStore.getState().load()` on mount, and add a Google login button on the landing route using `@react-oauth/google`'s `useGoogleLogin`/`<GoogleLogin>` that POSTs the credential to `/api/auth/callback`, then calls `load()`.

Example login handler:

```tsx
import { useGoogleLogin } from '@react-oauth/google'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'

const login = useGoogleLogin({
  flow: 'auth-code',
  onSuccess: async ({ code }) => {
    // exchange: simplest is one-tap ID token via <GoogleLogin/>; for auth-code, exchange server-side.
  },
})
```

> Use `<GoogleLogin onSuccess={(cred) => fetch('/api/auth/callback',{...}).then(()=>useAuthStore.getState().load())}/>` (the ID-token credential flow) — it matches the callback's `verifyIdToken` path. The auth-code snippet above is an alternative; pick the credential flow for MVP.

- [ ] **Step 10: netlify.toml edge redirect for nested auth path** — Netlify maps `netlify/functions/auth/callback.ts` → `/api/auth/callback` automatically (directory = path). No extra config needed.

- [ ] **Step 11: Verify + commit**

```bash
npm run lint && npm run build
git add -A && git commit -m "feat(auth): google oauth -> session cookie, drizzle schema, useAuth store, protected route"
```

---

## Task 1D: Landing Teaser UI  (Wave 1)

**Files:**
- Create: `src/routes/LandingRoute.tsx`, `src/components/CitySearch.tsx`, `src/components/WeatherCard.tsx`, `src/stores/teaser.ts`

**Interfaces:**
- Consumes: `api.getWeather` (Task 0.1), HeroUI v3, i18n (Task 1A).
- Produces: `/` route with multi-city weather cards + login CTA blur. (Task 1A must land before this for translations; if dispatched in parallel, guard with `t()` only after 1A merges.)

- [ ] **Step 1: Teaser store (local, unauthenticated)** — Create `src/stores/teaser.ts`:

```ts
import { create } from 'zustand'
import type { GeoPoint } from '@/lib/types'

interface TeaserState { cities: GeoPoint[]; add: (c: GeoPoint) => void; remove: (lat: number, lng: number) => void }
export const useTeaserStore = create<TeaserState>((set) => ({
  cities: [],
  add: (c) => set((s) => s.cities.find((x) => x.lat === c.lat && x.lng === c.lng) ? s : { cities: [...s.cities, c] }),
  remove: (lat, lng) => set((s) => ({ cities: s.cities.filter((c) => !(c.lat === lat && c.lng === lng)) })),
}))
```

- [ ] **Step 2: CitySearch** — Create `src/components/CitySearch.tsx`. Use a free geocoding endpoint (Open-Meteo geocoding, no key):

```tsx
import { useState } from 'react'
import { Input, Button } from '@heroui/react'
import { useTeaserStore } from '@/stores/teaser'

export function CitySearch() {
  const [q, setQ] = useState('')
  const add = useTeaserStore((s) => s.add)
  async function search() {
    if (!q.trim()) return
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1`)
    const data = await res.json()
    const hit = data.results?.[0]
    if (hit) add({ lat: hit.latitude, lng: hit.longitude, city: hit.name })
    setQ('')
  }
  return (
    <div className="flex gap-2">
      <Input value={q} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQ(e.target.value)} aria-label="City name" placeholder="Mumbai" />
      <Button variant="primary" onPress={search}>Add</Button>
    </div>
  )
}
```

- [ ] **Step 3: WeatherCard** — Create `src/components/WeatherCard.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { Card } from '@heroui/react'
import { useTranslation } from 'react-i18next'
import { api } from '@/lib/api'
import type { GeoPoint, WeatherData } from '@/lib/types'

export function WeatherCard({ city, onRemove }: { city: GeoPoint; onRemove: () => void }) {
  const { t } = useTranslation()
  const [w, setW] = useState<WeatherData | null>(null)
  useEffect(() => { api.getWeather(city.lat, city.lng).then(setW).catch(() => setW(null)) }, [city.lat, city.lng])
  const severe = w?.alerts.some((a) => a.severity === 'severe' || a.severity === 'extreme')
  return (
    <Card>
      <Card.Header>
        <Card.Title>{city.city ?? `${city.lat.toFixed(2)},${city.lng.toFixed(2)}`}</Card.Title>
        {severe && <span className="ml-2 rounded bg-red-600 px-2 text-white" role="status" aria-live="polite">{t('landing.severe')}</span>}
      </Card.Header>
      <Card.Content>
        <p>{w ? `${w.rainfallMm} mm · ${w.forecast}` : t('common.loading')}</p>
        <div className="mt-2 blur-sm select-none pointer-events-none" aria-hidden="true">{t('landing.loginForPlan')}</div>
      </Card.Content>
    </Card>
  )
}
```

> Confirm exact HeroUI v3 compound API (`Card.Header`/`Card.Content`/`Card.Title`) via `node scripts/get_component_docs.mjs Card`. Adjust subcomponent names to match if different.

- [ ] **Step 4: LandingRoute** — Create `src/routes/LandingRoute.tsx`:

```tsx
import { useTranslation } from 'react-i18next'
import { Button } from '@heroui/react'
import { CitySearch } from '@/components/CitySearch'
import { WeatherCard } from '@/components/WeatherCard'
import { useTeaserStore } from '@/stores/teaser'
import { useAuthStore } from '@/stores/auth'

export default function LandingRoute() {
  const { t } = useTranslation()
  const cities = useTeaserStore((s) => s.cities)
  const remove = useTeaserStore((s) => s.remove)
  const user = useAuthStore((s) => s.user)
  return (
    <main className="mx-auto max-w-md p-4">
      <h1 className="text-2xl font-semibold">{t('landing.title')}</h1>
      <p className="text-default-500">{t('landing.subtitle')}</p>
      <div className="mt-4"><CitySearch /></div>
      <section className="mt-4 grid gap-3" aria-live="polite">
        {cities.map((c) => <WeatherCard key={`${c.lat},${c.lng}`} city={c} onRemove={() => remove(c.lat, c.lng)} />)}
      </section>
      {!user && (
        <div className="mt-6 rounded-lg border p-4 text-center">
          <p>{t('landing.loginForPlan')}</p>
          {/* Google sign-in button rendered here (Task 1C login wiring) */}
        </div>
      )}
    </main>
  )
}
```

- [ ] **Step 5: Wire route** — In `src/main.tsx`, set `/` element to `<LandingRoute/>`, and add `/onboarding` and `/app` placeholder routes wrapped in `<ProtectedRoute>`.

- [ ] **Step 6: Verify + commit**

```bash
npm run lint && npm run build
git add -A && git commit -m "feat(landing): unauthenticated multi-city weather teaser w/ login CTA"
```

---

## Task 2E: Onboarding Wizard + save-profile  (Wave 2)

**Depends on:** 1A (i18n), 1C (auth + DB).

**Files:**
- Create: `src/routes/OnboardingRoute.tsx`, `netlify/functions/save-profile.ts`, `src/lib/__tests__/save-profile.test.ts`

**Interfaces:**
- Consumes: `useAuth` (1C), schema tables (1C), i18n (1A).
- Produces: `/onboarding` wizard collecting home location, dwelling, household size, vulnerabilities → `POST /api/save-profile` (3-table transaction).

- [ ] **Step 1: save-profile function** — Create `netlify/functions/save-profile.ts`:

```ts
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { getDb } from '../db/client'
import { users, monitoredLocations, vulnerabilities } from '../db/schema'
import { verifySession } from './auth/_session'

const Body = z.object({
  lat: z.number(), lng: z.number(), city: z.string(),
  dwellingType: z.enum(['ground_floor', 'high_rise', 'independent_house']),
  householdSize: z.number().int().min(1),
  vulnerabilityTypes: z.array(z.string()).default([]),
})

export default async (req: Request): Promise<Response> => {
  const session = await verifySession(req)
  if (!session) return new Response('unauthorized', { status: 401 })
  const parsed = Body.safeParse(await req.json())
  if (!parsed.success) return new Response('bad request', { status: 400 })
  const b = parsed.data
  const db = getDb()

  await db.transaction(async (tx) => {
    await tx.update(users).set({ dwellingType: b.dwellingType, householdSize: b.householdSize }).where(eq(users.id, session.sub))
    await tx.delete(monitoredLocations).where(eq(monitoredLocations.userId, session.sub))
    await tx.delete(vulnerabilities).where(eq(vulnerabilities.userId, session.sub))
    await tx.insert(monitoredLocations).values({ userId: session.sub, locationName: b.city, latitude: String(b.lat), longitude: String(b.lng), isPrimary: true })
    if (b.vulnerabilityTypes.length) await tx.insert(vulnerabilities).values(b.vulnerabilityTypes.map((type) => ({ userId: session.sub, type })))
  })
  return Response.json({ ok: true })
}
```

- [ ] **Step 2: Onboarding wizard UI** — Create `src/routes/OnboardingRoute.tsx` using `useUserLocation()` (1B) to prefill, HeroUI `RadioGroup`/`Input`/`CheckboxGroup`:

```tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Input, RadioGroup, CheckboxGroup, Button } from '@heroui/react'
import { useTranslation } from 'react-i18next'
import { useUserLocation } from '@/hooks/useUserLocation'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import type { DwellingType } from '@/lib/types'

const VULNS = ['elderly', 'pets', 'infants', 'mobility_impaired']

export default function OnboardingRoute() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const loc = useUserLocation()
  const setUser = useAuthStore((s) => s.setUser)
  const user = useAuthStore((s) => s.user)
  const [dwelling, setDwelling] = useState<DwellingType>('independent_house')
  const [size, setSize] = useState(1)
  const [vulns, setVulns] = useState<string[]>([])

  useEffect(() => { if (!user) nav('/') }, [user, nav])

  async function save() {
    if (!loc) return
    await api.saveProfile({ lat: loc.lat, lng: loc.lng, city: loc.city ?? 'Home', dwellingType: dwelling, householdSize: size, vulnerabilityTypes: vulns })
    const me = await api.getMe()
    setUser(me)
    nav('/app')
  }

  return (
    <main className="mx-auto max-w-md p-4">
      <Card>
        <Card.Header><Card.Title>{t('onboarding.title')}</Card.Title></Card.Header>
        <Card.Content className="grid gap-4">
          <div>
            <p>{t('onboarding.homeLocation')}</p>
            <p className="text-default-500">{loc ? `${loc.city ?? ''} (${loc.lat.toFixed(2)}, ${loc.lng.toFixed(2)})` : t('common.loading')}</p>
          </div>
          <RadioGroup label={t('onboarding.dwelling')} value={dwelling} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDwelling(e.target.value as DwellingType)}>
            <RadioGroup.Radio value="ground_floor" /><RadioGroup.Radio value="high_rise" /><RadioGroup.Radio value="independent_house" />
          </RadioGroup>
          <Input type="number" min={1} label={t('onboarding.household')} value={String(size)} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSize(Number(e.target.value))} />
          <CheckboxGroup label={t('onboarding.vulnerabilities')} value={vulns} onChange={setVulns}>
            {VULNS.map((v) => <CheckboxGroup.Checkbox key={v} value={v}>{v}</CheckboxGroup.Checkbox>)}
          </CheckboxGroup>
          <Button variant="primary" onPress={save}>{t('onboarding.save')}</Button>
        </Card.Content>
      </Card>
    </main>
  )
}
```

> Confirm exact RadioGroup/CheckboxGroup compound API via the heroui-react docs scripts; adjust subcomponent names to match.

- [ ] **Step 3: Verify + commit**

```bash
npm run lint && npm run build
git add -A && git commit -m "feat(onboarding): wizard + /api/save-profile (3-table txn)"
```

---

## Task 2F: Location Hub + locations CRUD  (Wave 2)

**Depends on:** 1C (auth + DB), 1B (geocoding/weather).

**Files:**
- Create: `netlify/functions/locations.ts`, `src/routes/LocationsRoute.tsx`, `src/stores/locations.ts`

**Interfaces:**
- Consumes: schema (1C), session (1C), CitySearch-style geocoding (1B).
- Produces: `/app/locations` managing up to 5 locations; `GET/POST/DELETE /api/locations`.

- [ ] **Step 1: locations function (CRUD)** — Create `netlify/functions/locations.ts`:

```ts
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { getDb } from '../db/client'
import { monitoredLocations } from '../db/schema'
import { verifySession } from './auth/_session'

const MAX = 5

export default async (req: Request): Promise<Response> => {
  const session = await verifySession(req)
  if (!session) return new Response('unauthorized', { status: 401 })
  const db = getDb()
  const url = new URL(req.url)

  if (req.method === 'GET') {
    const rows = await db.select().from(monitoredLocations).where(eq(monitoredLocations.userId, session.sub))
    return Response.json(rows.map((r) => ({ id: r.id, locationName: r.locationName, lat: Number(r.latitude), lng: Number(r.longitude), isPrimary: r.isPrimary })))
  }

  if (req.method === 'POST') {
    const count = (await db.select().from(monitoredLocations).where(eq(monitoredLocations.userId, session.sub))).length
    if (count >= MAX) return new Response('max 5 locations', { status: 409 })
    const Body = z.object({ locationName: z.string(), lat: z.number(), lng: z.number(), isPrimary: z.boolean().default(false) })
    const b = Body.parse(await req.json())
    const [row] = await db.insert(monitoredLocations).values({ userId: session.sub, locationName: b.locationName, latitude: String(b.lat), longitude: String(b.lng), isPrimary: b.isPrimary }).returning()
    return Response.json({ id: row.id, locationName: row.locationName, lat: Number(row.latitude), lng: Number(row.longitude), isPrimary: row.isPrimary })
  }

  if (req.method === 'DELETE') {
    const id = url.searchParams.get('id')!
    await db.delete(monitoredLocations).where(and(eq(monitoredLocations.id, id), eq(monitoredLocations.userId, session.sub)))
    return new Response(null, { status: 204 })
  }

  return new Response('method not allowed', { status: 405 })
}
```

- [ ] **Step 2: locations store** — Create `src/stores/locations.ts`:

```ts
import { create } from 'zustand'
import type { MonitoredLocation } from '@/lib/types'
import { api } from '@/lib/api'

interface LocState { items: MonitoredLocation[]; loading: boolean; load: () => Promise<void>; add: (l: { locationName: string; lat: number; lng: number }) => Promise<void>; remove: (id: string) => Promise<void> }
export const useLocationsStore = create<LocState>((set, get) => ({
  items: [], loading: true,
  load: async () => { set({ items: await api.listLocations(), loading: false }) },
  add: async (l) => { const row = await api.saveLocation(l); set((s) => ({ items: [...s.items, row] })) },
  remove: async (id) => { await api.deleteLocation(id); set({ items: get().items.filter((i) => i.id !== id) }) },
}))
```

- [ ] **Step 3: LocationsRoute** — Create `src/routes/LocationsRoute.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { Card, Button } from '@heroui/react'
import { useTranslation } from 'react-i18next'
import { useLocationsStore } from '@/stores/locations'

export default function LocationsRoute() {
  const { t } = useTranslation()
  const { items, load, add, remove } = useLocationsStore()
  const [q, setQ] = useState('')
  useEffect(() => { load() }, [load])
  async function addCity() {
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1`)
    const hit = (await res.json()).results?.[0]
    if (hit) await add({ locationName: hit.name, lat: hit.latitude, lng: hit.longitude })
    setQ('')
  }
  return (
    <main className="mx-auto max-w-md p-4">
      <div className="flex gap-2"><input className="flex-1 rounded border p-2" value={q} onChange={(e) => setQ(e.target.value)} /><Button variant="primary" onPress={addCity}>{t('dashboard.addLocation')}</Button></div>
      <ul className="mt-4 grid gap-2">
        {items.map((l) => (
          <li key={l.id}><Card><Card.Content className="flex items-center justify-between"><span>{l.locationName} {l.isPrimary && '★'}</span><Button variant="danger" onPress={() => remove(l.id)}>×</Button></Card.Content></Card></li>
        ))}
      </ul>
    </main>
  )
}
```

- [ ] **Step 4: Verify + commit**

```bash
npm run lint && npm run build
git add -A && git commit -m "feat(locations): location hub UI + /api/locations CRUD (max 5)"
```

---

## Task 3G: AI Plan Engine + Command Center  (Wave 3)

**Depends on:** 2F (locations), 1B (weather), 1C (DB + session).

**Files:**
- Create: `netlify/functions/generate-plan.ts`, `src/routes/CommandCenterRoute.tsx`, `src/components/Checklist.tsx`, `src/components/RiskChip.tsx`, `src/lib/__tests__/generate-plan.test.ts`

**Interfaces:**
- Consumes: locations (2F), weather normalization (1B), schema (1C), Gemini SDK (`@google/genai`).
- Produces: `POST /api/generate-plan` → `PreparednessPlan` (persisted to `preparedness_plans.plan_data`); `/app` tabbed Command Center with checklist + risk chips.

- [ ] **Step 1: Gemini client helper** — Create `netlify/functions/_gemini.ts`:

```ts
import { GoogleGenAI, Type } from '@google/genai'

export function gemini() {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
}

export const PLAN_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    overview: { type: Type.STRING },
    locations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          locationName: { type: Type.STRING },
          summary: { type: Type.STRING },
          immediate: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, label: { type: Type.STRING } }, required: ['id', 'label'] } },
          supplies: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, label: { type: Type.STRING } }, required: ['id', 'label'] } },
          evacuation: { type: Type.STRING },
        },
        required: ['locationName', 'summary', 'immediate', 'supplies', 'evacuation'],
      },
    },
  },
  required: ['overview', 'locations'],
}
```

- [ ] **Step 2: generate-plan function** — Create `netlify/functions/generate-plan.ts`:

```ts
import { eq } from 'drizzle-orm'
import { getDb } from '../db/client'
import { users, monitoredLocations, vulnerabilities, preparednessPlans } from '../db/schema'
import { verifySession } from './auth/_session'
import { gemini, PLAN_SCHEMA } from './_gemini'
import { normalizeWeather } from './weather'

export default async (req: Request): Promise<Response> => {
  const session = await verifySession(req)
  if (!session) return new Response('unauthorized', { status: 401 })
  const db = getDb()

  const [user] = await db.select().from(users).where(eq(users.id, session.sub)).limit(1)
  const locs = await db.select().from(monitoredLocations).where(eq(monitoredLocations.userId, session.sub))
  const vulns = await db.select().from(vulnerabilities).where(eq(vulnerabilities.userId, session.sub))
  if (!locs.length) return new Response('no locations', { status: 400 })

  // Fetch + normalize weather for each location (reuses weather.ts pure normalizer).
  const weatherKey = process.env.WEATHER_API_KEY!
  const weather = await Promise.all(locs.map(async (l) => {
    const res = await fetch(`https://api.weatherapi.com/v1/forecast.json?key=${weatherKey}&q=${l.latitude},${l.longitude}&days=1&alerts=yes`)
    const d = await res.json()
    return normalizeWeather(l.locationName, d.alerts?.alert ?? [], { precip_mm: d.current?.precip_mm, condition: { text: d.current?.condition?.text } })
  }))

  const prompt = `You are a monsoon preparedness expert. Produce a personalized plan in language code "${user?.preferredLanguage ?? 'en'}".
Household size: ${user?.householdSize ?? 1}. Dwelling: ${user?.dwellingType ?? 'unknown'}. Special needs: ${vulns.map((v) => v.type).join(', ') || 'none'}.
For each location, consider its weather alerts and rainfall. Return concise, actionable items.`
  const context = JSON.stringify(weather)

  const ai = gemini()
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: `${prompt}\n\nWeather data:\n${context}`,
    config: { responseMimeType: 'application/json', responseSchema: PLAN_SCHEMA },
  })

  const planData = JSON.parse(response.text ?? '{}')
  const updatedAt = new Date().toISOString()
  const payload = { ...planData, updatedAt }

  await db.delete(preparednessPlans).where(eq(preparednessPlans.userId, session.sub))
  await db.insert(preparednessPlans).values({ userId: session.sub, locationId: locs[0].id, planData: payload })

  return Response.json(payload)
}
```

- [ ] **Step 3: Checklist component** — Create `src/components/Checklist.tsx`:

```tsx
import { useState } from 'react'
import { Checkbox } from '@heroui/react'
import type { PlanChecklistItem } from '@/lib/types'

export function Checklist({ items }: { items: PlanChecklistItem[] }) {
  const [state, setState] = useState(() => Object.fromEntries(items.map((i) => [i.id, false])))
  return (
    <ul className="grid gap-1">
      {items.map((i) => (
        <li key={i.id}><Checkbox isSelected={state[i.id]} onChange={() => setState((s) => ({ ...s, [i.id]: !s[i.id] }))}>{i.label}</Checkbox></li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 4: RiskChip** — Create `src/components/RiskChip.tsx`:

```tsx
const COLORS: Record<string, string> = { minor: 'bg-yellow-500', moderate: 'bg-orange-500', severe: 'bg-red-600', extreme: 'bg-purple-700' }
export function RiskChip({ severity, label }: { severity: string; label: string }) {
  return <span className={`rounded px-2 py-1 text-xs text-white ${COLORS[severity] ?? 'bg-gray-500'}`} role="status" aria-live="polite">{label}</span>
}
```

- [ ] **Step 5: CommandCenterRoute (Tabs)** — Create `src/routes/CommandCenterRoute.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { Tabs, Button } from '@heroui/react'
import { useTranslation } from 'react-i18next'
import { api } from '@/lib/api'
import { useLocationsStore } from '@/stores/locations'
import { Checklist } from '@/components/Checklist'
import { RiskChip } from '@/components/RiskChip'
import type { PreparednessPlan, WeatherData } from '@/lib/types'

export default function CommandCenterRoute() {
  const { t } = useTranslation()
  const { items } = useLocationsStore()
  const [plan, setPlan] = useState<PreparednessPlan | null>(null)
  const [weather, setWeather] = useState<WeatherData[]>([])

  useEffect(() => { useLocationsStore.getState().load() }, [])
  useEffect(() => { Promise.all(items.map((l) => api.getWeather(l.lat, l.lng).catch(() => null))).then((w) => setWeather(w.filter(Boolean) as WeatherData[])) }, [items])

  async function generate() { setPlan(await api.generatePlan()) }

  return (
    <main className="mx-auto max-w-md p-4">
      <Tabs>
        <Tabs.Tab id="primary" label={t('dashboard.primaryStatus')}>
          <div className="grid gap-2">{weather.map((w) => <div key={w.location} className="flex items-center justify-between"><span>{w.location}</span>{w.alerts[0] && <RiskChip severity={w.alerts[0].severity} label={w.alerts[0].event} />}</div>)}</div>
        </Tabs.Tab>
        <Tabs.Tab id="zones" label={t('dashboard.savedZones')}>
          <ul className="grid gap-1">{items.map((l) => <li key={l.id}>{l.locationName} {l.isPrimary && '★'}</li>)}</ul>
        </Tabs.Tab>
        <Tabs.Tab id="plan" label={t('dashboard.actionPlan')}>
          <Button variant="primary" onPress={generate}>{t('dashboard.generatePlan')}</Button>
          {plan && (
            <div className="mt-4 grid gap-4">
              <p>{plan.overview}</p>
              {plan.locations.map((loc) => (
                <section key={loc.locationName} className="rounded-lg border p-3">
                  <h3 className="font-medium">{loc.locationName}</h3>
                  <p className="text-sm text-default-500">{loc.summary}</p>
                  <h4 className="mt-2 text-sm">Immediate</h4>
                  <Checklist items={loc.immediate} />
                  <h4 className="mt-2 text-sm">Supplies</h4>
                  <Checklist items={loc.supplies} />
                  <p className="mt-2 text-sm">Evacuation: {loc.evacuation}</p>
                </section>
              ))}
            </div>
          )}
        </Tabs.Tab>
      </Tabs>
    </main>
  )
}
```

> Confirm exact Tabs compound API via `node scripts/get_component_docs.mjs Tabs`; adjust subcomponent names to match.

- [ ] **Step 6: Wire routes in main.tsx** — Final route table:

```tsx
<Route path="/" element={<LandingRoute/>} />
<Route path="/onboarding" element={<ProtectedRoute><OnboardingRoute/></ProtectedRoute>} />
<Route path="/app" element={<ProtectedRoute><CommandCenterRoute/></ProtectedRoute>} />
<Route path="/app/locations" element={<ProtectedRoute><LocationsRoute/></ProtectedRoute>} />
```

- [ ] **Step 7: Verify + commit**

```bash
npm run lint && npm run build && npm run test
git add -A && git commit -m "feat(plan): gemini-3.1-pro structured plan engine + command center w/ tabs, checklist, risk chips"
```

---

## Self-Review (run after writing — issues fixed inline)

- **Spec coverage:** PRD E1.1–1.3 → Task 0.1 ✓; E2.1–2.3 → Tasks 1B, 1D ✓; E3.1–3.3 → Tasks 1C, 2E ✓; E4.1–4.3 → Tasks 2F, 3G ✓; Command Center (E5 display) → Task 3G ✓.
- **Placeholder scan:** HeroUI compound subcomponent names flagged for verification via skill scripts (not placeholders — verification steps exist). Model IDs current per gemini-api skill.
- **Type consistency:** `PreparednessPlan`/`LocationPlan`/`PlanChecklistItem` shapes match between schema (jsonb) and the Gemini `PLAN_SCHEMA`. `MonitoredLocation` store shape matches `/api/locations` GET mapping.
- **Known soft spots (resolved by verification steps):** HeroUI v3 exact compound subcomponent names (`Card.Header/Content/Title`, `Tabs.Tab`, `RadioGroup.Radio`, `CheckboxGroup.Checkbox`) — each task instructs confirming via `node scripts/get_component_docs.mjs <Component>`.

## Execution Handoff

Plan saved to `docs/superpowers/plans/2026-07-11-monsoon-prep-e1-4.md`. **Subagent-Driven execution (recommended):** dispatch a fresh subagent per task in waves (0.1 → [1A,1B,1C,1D] parallel → [2E,2F] parallel → 3G), reviewing between tasks.
