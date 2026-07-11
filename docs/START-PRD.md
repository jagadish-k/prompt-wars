# 📋 PRD: GenAI-Powered Monsoon Preparedness & Crisis Response App

## 1. Project Overview & Architecture

- **Objective:** Build a personalized, mobile-first, AI-driven monsoon preparedness web app providing dynamic emergency plans, multi-location weather monitoring, real-time crisis updates, and localized emergency assistance.
- **Core Tech Stack:**
  - **Frontend:** React 18+, TypeScript, Vite
  - **UI Framework:** Hero UI v3, Tailwind CSS
  - **Routing & State:** React Router DOM v6, Zustand (for global state management)
  - **Localization:** `react-i18next`
  - **Backend/API:** Netlify Edge Functions (for geo-routing) & Netlify Serverless Functions (for API logic)
  - **Database:** Netlify Database (Serverless Postgres)
  - **AI Provider:** Google Gemini API (`@google/generative-ai` SDK) using `gemini-1.5-flash` for high-speed chat/updates and `gemini-1.5-pro` for structured configuration tasks.

---

## 2. Global Engineering Standards (Strict Agent Rules)

### A. Accessibility (a11y) & Mobile-First

- **Mobile-First Realities:** All layouts must be optimized for single-handed mobile use (`sm` breakpoint). High-frequency elements like SOS controls must occupy prominent thumb-zones. Touch targets must be a minimum of 48x48px.
- **Screen Readers:** Enforce full semantic HTML. Every interactive widget, checklist item, and severe weather chip must feature descriptive `aria-label`, `aria-live="polite"` for real-time streams, or `aria-describedby` tags.
- **Contrast & Modes:** Maintain high-contrast visual safety indicators (e.g., severe alerts must pass WCAG AAA contrast ratios against light/dark themes using Hero UI semantic tokens).

### B. Internationalization (i18n)

- Wrap all interface text strings across components inside the `useTranslation()` hook from `react-i18next`.
- Maintain explicit localization dictionaries (`en.json`, `hi.json`, `bn.json`) within a root `/locales` directory.
- Direct system prompts to pass the user's active `preferred_language` to the Gemini API, forcing all dynamically generated advice to return matching the local syntax.

### C. Geolocation Strategy

- **Primary System:** Execute browser HTML5 Geolocation API validation (`navigator.geolocation.getCurrentPosition`) immediately upon layout mount.
- **Unauthenticated Fallback:** If permission is denied or pending, process incoming telemetry using Netlify Edge Functions via the `x-nf-geo` header or `context.geo` object to identify the user's city via IP address geolocation instantly.

---

## 3. Database Schema (Netlify Postgres)

_Agent Instruction: Generate migration files or initialize schemas via Drizzle/Prisma using this relational model._

- `users`
  - `id` (UUID, Primary Key, Default: `gen_random_uuid()`)
  - `email` (String, Unique)
  - `preferred_language` (String, Default: 'en')
  - `household_size` (Integer, Default: 1)
  - `dwelling_type` (Enum: 'ground_floor', 'high_rise', 'independent_house')
  - `created_at` (Timestamp)

- `monitored_locations`
  - `id` (UUID, Primary Key)
  - `user_id` (UUID, Foreign Key referencing `users.id` ON DELETE CASCADE)
  - `location_name` (String, e.g., "Home", "Parents' House", "Office Workplace")
  - `latitude` (Float)
  - `longitude` (Float)
  - `is_primary` (Boolean, Default: false)

- `vulnerabilities`
  - `id` (UUID, Primary Key)
  - `user_id` (UUID, Foreign Key referencing `users.id` ON DELETE CASCADE)
  - `type` (String, e.g., 'elderly', 'pets', 'infants', 'mobility_impaired')

- `preparedness_plans`
  - `id` (UUID, Primary Key)
  - `user_id` (UUID, Foreign Key referencing `users.id` ON DELETE CASCADE)
  - `location_id` (UUID, Foreign Key referencing `monitored_locations.id`)
  - `plan_data` (JSONB - Stores the explicit Gemini tailored preparation payload)
  - `updated_at` (Timestamp)

---

## 4. Epic & Task Breakdown (Agent Execution Plan)

### Epic 1: Project Setup & Core Configuration

- **Task 1.1:** Initialize the frontend runtime using Vite, React, and TypeScript. Install dependencies: `@hero-ui/react`, `tailwindcss`, `framer-motion`, `lucide-react`, `zustand`, and `react-router-dom`.
- **Task 1.2:** Configure `react-i18next` localized configuration. Construct template translation bundles under `/locales` for required geographies. Build a reusable global language selection component utilizing Hero UI `Dropdown`.
- **Task 1.3:** Configure the root `netlify.toml` file setting target rewrites for Single Page Application assets and declare the serverless source paths for the downstream Netlify Functions.

### Epic 2: Geolocation & Unauthenticated Multi-Location Teaser

- **Task 2.1:** Implement a custom React hook `useUserLocation()` executing the HTML5 tracking pattern with an asynchronous fallback path invoking a edge function route (`/api/geo-fallback`) to grab city names from IP headers.
- **Task 2.2:** Build an external Netlify weather ingestion routing function (`/api/weather`) that wraps third-party Weather APIs, pulling alerts and rainfall tracking safely using back-end environment authorization.
- **Task 2.3:** Build a login-free Landing Dashboard template. Render an input using Hero UI `Autocomplete` allowing unauthenticated visitors to search and add multiple cities to a local state tracking array. Show live severe weather cards for each selected location, blurring detailed preparedness matrices behind a clear log-in call-to-action (CTA).

### Epic 3: Authentication & Onboarding Engine

- **Task 3.1:** Integrate a robust authentication bridge matching your project requirements, wiring secure tokens back directly into the serverless Postgres instance.
- **Task 3.2:** Build an interactive client onboarding wizard using Hero UI `Card`, `Input`, `RadioGroup`, and `CheckboxGroup`. Collect structural metrics: primary coordinates, home architecture categories, household population, and family vulnerability tags.
- **Task 3.3:** Construct an onboarding persistence function (`/api/save-profile`) that commits entries across the `users`, `monitored_locations`, and `vulnerabilities` tables concurrently.

### Epic 4: Multi-Location Management & AI Engine

- **Task 4.1:** Design a "Location Hub" control panel inside the main application interface. Allow authenticated users to add up to 5 custom tracking points (e.g., family members' cities or commute paths) using a clean list layout built with Hero UI `User` and `Button` components.
- **Task 4.2:** Extend the serverless plan compiler (`/api/generate-plan`). It must execute a loop fetching distinct weather alert inputs for _every_ unique location saved under the profile.
- **Task 4.3:** Direct requests to `gemini-1.5-pro` with rigid execution commands enforcing JSON structure (`responseMimeType: 'application/json'`). Instruct the model to analyze multi-location parameters and compile distinct preparedness blocks customized to the active language configuration. Save the payload directly into the database `JSONB` parameters.

### Epic 5: The Authenticated Command Center

- **Task 5.1:** Construct the central user view using a responsive multi-tab arrangement. Use Hero UI `Tabs` to slice metrics clean: "Primary Status", "Saved Zones Monitoring", and "Action Plan Checklist".
- **Task 5.2:** Render dynamic household checklists utilizing Hero UI `Checkbox` arrays grouped cleanly inside semantic boxes. Persist mutations directly back to browser space or remote tracking endpoints to preserve active data records.
- **Task 5.3:** Build a multi-location notification bar that uses distinct visual indicator chips to flag real-time structural risks at auxiliary tracking addresses immediately when alerts change.

### Epic 6: Live SOS & Real-Time Incident Dashboard

- **Task 6.1:** Build a dedicated high-priority safety view: `/sos`. This screen must use high-visibility layouts optimized for immediate discovery under high-stress conditions.
- **Task 6.2:** Create a Local Emergency Contact matrix using Hero UI `Card` components. Populate clickable action elements wrapping semantic mobile dialing links (`href="tel:..."`) for local disaster management departments, medical centers, emergency service vehicles, and active local flood rescue units based on the user's primary or currently active coordinates.
- **Task 6.3:** Build a Real-Time Incident Streaming feed powered by an internal serverless integration routing endpoint (`/api/live-feed`). This function must pull raw regional weather alerts, feed updates, or public bulletins, pass them to `gemini-1.5-flash` with a strict translation prompt, and return brief, actionable hazard summaries. Display this output stream in the client UI via a high-priority `aria-live` container.

### Epic 7: Multilingual Live-Storm Assistant

- **Task 7.1:** Construct an immediate safety chat interface anchored persistently to the core layout using a floating floating trigger or a fixed action layout using Hero UI components.
- **Task 7.2:** Deploy a Netlify processing function (`/api/chat`) driving the core Gemini Streaming API configurations directly to support live textual rendering.
- **Task 7.3:** Wire an internal context injector passing active data parameters (user profile data, weather alert states, and active locations metrics) alongside the user input prompt down to the system level. Mandate concise, safe, localized outputs using clear, unambiguous guidelines tailored directly to the active geography.

---

## 5. Security & Environment Configuration

- **Agent Rule:** All infrastructure keys must load through system variable configurations. Ensure the project repository includes a descriptive `.env.example` defining these parameters:
  - `GEMINI_API_KEY=` (Target Google GenAI Authorization Credential)
  - `DATABASE_URL=` (Fully managed Netlify serverless Postgres connection endpoint)
  - `WEATHER_API_KEY=` (Target Third-party meteorological tracking access key)
- **Zero Client Ingestion Principle:** Block the assignment of application keys to client-side Vite configurations (`VITE_...`). Force all analytical API lookups, translation steps, or state evaluation metrics through Netlify Serverless Functions to preserve absolute system security.
