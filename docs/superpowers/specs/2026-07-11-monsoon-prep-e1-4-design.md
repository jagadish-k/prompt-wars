# Monsoon Preparedness App — Epics 1–4 Design

- **Status:** Approved
- **Date:** 2026-07-11
- **Scope:** PRD Epics 1–4 (Project Setup, Geolocation + Unauthenticated Teaser, Auth & Onboarding, Multi-Location Management + AI Plan Engine). Epics 5 (Command Center) is partially included as the display layer for the AI plan. Epics 6 (SOS) and 7 (Chat Assistant) are deferred to a later phase.
- **Hosting:** Netlify (SPA + Edge Functions + Serverless Functions + Postgres + Blobs)

## 1. Locked Decisions

| Concern | Decision |
|---|---|
| Scope | Epics 1–4 (+ Command Center as the plan display surface). E6/E7 deferred. |
| Auth | Sign in with Google via `@react-oauth/google` → server-side JWT verification (`google-auth-library`) → signed HttpOnly session cookie. **(Deviation accepted 2026-07-11: shipped as pure signed JWTs — no Blob-backed revocation; see §4.)** |
| Data | Netlify Postgres + Drizzle ORM (relational schema per PRD §3) + Netlify Blobs (weather cache, reserved plan-exports). |
| Weather | WeatherAPI.com (alerts + rainfall). Server-side only. Blob-cached. |
| AI | Current Gemini 3.x (`gemini-3.1-pro-preview` for structured plan JSON) via `@google/genai` SDK. (Per gemini-api skill, 2.x/1.5 are legacy; 3.x is current.) Live-feed/chat (E6/E7) not in scope. |
| UI | HeroUI v3 (installed) + Tailwind v4 via `@tailwindcss/vite`. React Router v6, Zustand, react-i18next (en/hi/bn). |

### Deliberate deviation from PRD §5 ("Zero Client Ingestion")
Google's OAuth **Client ID is public by design** and must run in the browser, so `VITE_GOOGLE_CLIENT_ID` is the single, narrow, documented exception. The client secret and all other keys (`GEMINI_API_KEY`, `DATABASE_URL`, `WEATHER_API_KEY`, `SESSION_SECRET`) remain strictly server-side.

## 2. Architecture

```
Browser (Vite SPA)
  ├── @react-oauth/google  ── credential JWT ──▶ /api/auth/callback
  ├── React Router v6, Zustand, react-i18next (en/hi/bn)
  ├── HeroUI v3 + Tailwind v4 (mobile-first, a11y)
  └── fetch /api/*  (all keys server-side)

Netlify
  ├── Edge:      /api/geo-fallback        (IP→city via context.geo)
  └── Serverless:
        /api/weather        WeatherAPI.com (Blob-cached)
        /api/auth/{callback,logout,me}    Google session lifecycle
        /api/save-profile   onboarding txn (3 tables)
        /api/locations      CRUD, user-scoped, max 5
        /api/generate-plan  Gemini pro JSON schema → plan_data

Stores
  ├── Netlify Postgres (Drizzle): users, monitored_locations, vulnerabilities, preparedness_plans
  └── Netlify Blobs: weather-cache:{lat},{lng}  ·  plan-exports/* (reserved)
```

## 3. Data Model

**Postgres (Drizzle)** — PRD §3 schema, UUID PKs, FKs with `ON DELETE CASCADE`:

- `users`: id, email (unique), preferred_language (default 'en'), household_size (default 1), dwelling_type (enum: ground_floor | high_rise | independent_house), created_at
- `monitored_locations`: id, user_id (FK→users), location_name, latitude, longitude, is_primary (default false)
- `vulnerabilities`: id, user_id (FK→users), type (e.g. elderly, pets, infants, mobility_impaired)
- `preparedness_plans`: id, user_id (FK→users), location_id (FK→monitored_locations), plan_data (JSONB), updated_at

**Netlify Blobs:**
- `weather-cache/{lat},{lng}` — TTL'd WeatherAPI responses (mitigates free-tier rate limits).
- `plan-exports/*` — reserved for future PDF generation (E5+/SOS phase).

## 4. Auth Flow

1. `GoogleOAuthProvider` wraps the app with `VITE_GOOGLE_CLIENT_ID`.
2. `<GoogleLogin/>` returns a Google ID-token credential (JWT).
3. `POST /api/auth/callback` verifies the JWT via `google-auth-library.verifyIdToken`, upserts the `users` row, mints a signed session JWT (`SESSION_SECRET`, 7-day TTL), and sets an HttpOnly + Secure + SameSite=Lax cookie.
4. Protected serverless functions read/verify the cookie to resolve `userId`.
5. Client: `useAuth()` Zustand store, `<ProtectedRoute/>` guard, `GET /api/auth/me`, `POST /api/auth/logout` (clears the cookie).

> **Accepted deviation (decided 2026-07-11):** The original design called for revocable sessions via Netlify Blobs (store a session ID on login, check it in `verifySession`, delete on logout). This MVP ships **pure signed JWTs with no server-side revocation**. Rationale: cookie theft is mitigated by HttpOnly + Secure + SameSite=Lax flags; the 7-day TTL bounds exposure; revocation added complexity for marginal MVP benefit. Trade-off: a stolen cookie remains valid until expiry and cannot be revoked early. Revisit if/when active-session management or force-logout becomes a requirement.

## 5. Netlify Functions Surface

| Endpoint | Type | Protected | Purpose |
|---|---|---|---|
| `/api/geo-fallback` | Edge | no | IP→city fallback when browser geolocation is denied (reads `context.geo` / `x-nf-geo`). |
| `/api/weather` | Serverless | no | WeatherAPI.com wrapper; validates lat/lng; Blob-cached; returns normalized `{ alerts, rainfall, forecast }`. |
| `/api/auth/callback` | Serverless | no | Verify Google JWT, upsert user, set session cookie. |
| `/api/auth/me` | Serverless | yes | Return current profile. |
| `/api/auth/logout` | Serverless | yes | Clear session cookie. (No server-side revocation — see §4 deviation.) |
| `/api/save-profile` | Serverless | yes | Onboarding upsert across users/monitored_locations/vulnerabilities in a transaction. |
| `/api/locations` | Serverless | yes | CRUD for monitored_locations; max 5 per user; user-scoped. |
| `/api/generate-plan` | Serverless | yes | Loop monitored_locations → fetch weather (cache) → Gemini pro-tier with `responseSchema` → persist `plan_data` (JSONB). |

## 6. Frontend Structure

```
src/
  app/            providers (HeroUI, Router, i18n, GoogleOAuth), layout shell, ProtectedRoute
  routes/         / (teaser), /onboarding, /app (command center), /app/locations
  components/     ui primitives, LanguageSwitcher, WeatherCard, LocationItem, Checklist, RiskChip
  hooks/          useUserLocation, useAuth
  stores/         auth, locations (Zustand)
  lib/            api client, typed fetchers
locales/          en.json hi.json bn.json (namespaced: common, landing, onboarding, dashboard)
netlify/          edge-functions/, functions/
db/               schema.ts (Drizzle), client, migrations
```

## 7. Subagent Decomposition

Foundation is a single trunk (config files would conflict if parallelized); afterwards four independent streams run concurrently, converging into two, then the AI engine.

```
Wave 0 ──[0.1 Foundation trunk]──▶ (sequential)
          │
Wave 1 ──┬─[1A i18n + LanguageSwitcher]
         ├─[1B Geolocation + /geo-fallback + /weather]
         ├─[1C Auth + Drizzle schema + session]
         └─[1D Landing teaser UI]                       ◀── 4 parallel
          │
Wave 2 ──┬─[2E Onboarding wizard + /save-profile]  (needs 1A,1C)
         └─[2F Location Hub + /locations CRUD]     (needs 1C,1B) ◀── 2 parallel
          │
Wave 3 ───[3G AI plan engine + Command Center]     (needs 2F,1B) ◀── converges
```

| Task | Wave | Deps | Contract |
|---|---|---|---|
| 0.1 Foundation | 0 | — | Deps, Tailwind v4 + `@import "@heroui/styles"` (no provider needed in v3), `@/` alias, router shell, `.env.example`, `netlify.toml`, demo removed. |
| 1A i18n | 1 | 0.1 | `useTranslation`, `<LanguageSwitcher/>`, en/hi/bn bundles. |
| 1B Geo+Weather | 1 | 0.1 | `useUserLocation()`, `GET /api/weather`, edge `/api/geo-fallback`, Blob cache. |
| 1C Auth+DB | 1 | 0.1 | `<GoogleLogin/>`, `useAuth()`, cookie session, Drizzle schema + migration. |
| 1D Teaser UI | 1 | 0.1 | `/` route: city Autocomplete + weather cards + login CTA blur. |
| 2E Onboarding | 2 | 1A,1C | Wizard → `POST /api/save-profile` (3-table txn). |
| 2F Location Hub | 2 | 1C,1B | Up to 5 locations CRUD, `/api/locations`. |
| 3G AI + Command Ctr | 3 | 2F,1B | `/api/generate-plan` (Gemini schema) + tabbed Command Center + checklists + risk chips. |

Wave 1 runs 4 subagents in parallel (the main speedup). Each task owns a non-overlapping file set and a shared interface contract to avoid merge collisions.

## 8. Standards Gate (every task)

- `npm run lint && npm run build` green before merge (tsc is the type gate).
- Mobile-first; 48×48px touch targets; `aria-live="polite"` for weather/alert streams; WCAG-AAA contrast for severity chips.
- All UI text via `useTranslation()`; Gemini receives `preferred_language`.
- Secrets server-side only; `VITE_GOOGLE_CLIENT_ID` is the sole documented exception.

## 9. Pre-requisites (before Wave 1)

1. Netlify Postgres enabled on the account (else fall back to Neon — Drizzle-compatible).
2. Google Cloud OAuth Web client created with authorized JS origins for dev + Netlify domains.
3. Netlify env keys provisioned: `GEMINI_API_KEY`, `DATABASE_URL`, `WEATHER_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET`.

## 10. Out of Scope (deferred phases)

- Epic 6 — `/sos` dashboard, emergency contacts matrix, `/api/live-feed` (Gemini flash translation).
- Epic 7 — Multilingual live-storm chat assistant, `/api/chat` streaming.
- PDF plan exports (Blobs reservation only).
