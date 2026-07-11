import { eq } from 'drizzle-orm'
import { getDb } from '../../db/client' // CORRECTED: brief said '../db' (resolves to netlify/db); this is '../../db'.
import { users, monitoredLocations, vulnerabilities, preparednessPlans } from '../../db/schema'
import { verifySession } from './auth/_session'
import { gemini, PLAN_SCHEMA } from './_gemini'
import { normalizeWeather } from './weather'
import type { WeatherData, PreparednessPlan, PlanChecklistItem, LocationPlan } from '../../src/lib/types'

interface PromptUser {
  preferredLanguage: string | null
  householdSize: number | null
  dwellingType: string | null
}
interface PromptVuln {
  type: string
}

// --- Plan boundary normalizer ------------------------------------------------
// Gemini's PLAN_SCHEMA intentionally omits `done` (client-only state) and emits
// `{ id, label }` per checklist item. The parsed JSON flows through `any`, so
// TypeScript never validates the model ↔ type boundary. `normalizePlan` closes
// that gap: it coerces the raw model output into an honest `PreparednessPlan`,
// guaranteeing every checklist item is `{ id: string, label: string, done: false }`
// and defending against schema-violating output (missing/non-array `locations`).
// Pure (no I/O) so it is unit-testable. See src/lib/__tests__/generate-plan.test.ts.

function normalizeItem(item: unknown): PlanChecklistItem {
  const i = (item ?? {}) as { id?: unknown; label?: unknown }
  return { id: String(i.id ?? ''), label: String(i.label ?? ''), done: false }
}

function normalizeLocation(loc: unknown): LocationPlan {
  const l = (loc ?? {}) as {
    locationName?: unknown
    summary?: unknown
    immediate?: unknown
    supplies?: unknown
    evacuation?: unknown
  }
  const immediate = Array.isArray(l.immediate) ? l.immediate : []
  const supplies = Array.isArray(l.supplies) ? l.supplies : []
  return {
    locationName: String(l.locationName ?? ''),
    summary: String(l.summary ?? ''),
    immediate: immediate.map(normalizeItem),
    supplies: supplies.map(normalizeItem),
    evacuation: String(l.evacuation ?? ''),
  }
}

export function normalizePlan(raw: unknown, updatedAt: string): PreparednessPlan {
  const plan = (raw ?? {}) as { overview?: unknown; locations?: unknown }
  const locations = Array.isArray(plan.locations) ? plan.locations : []
  return {
    overview: String(plan.overview ?? ''),
    locations: locations.map(normalizeLocation),
    updatedAt,
  }
}

// Pure prompt builder — exported for unit testing (see src/lib/__tests__/generate-plan.test.ts).
// Kept free of any I/O so the deterministic parts of the AI request can be tested.
export function buildPrompt(user: PromptUser | undefined, vulns: PromptVuln[], weather: WeatherData[]): string {
  const lang = user?.preferredLanguage ?? 'en'
  const household = user?.householdSize ?? 1
  const dwelling = user?.dwellingType ?? 'unknown'
  const needs = vulns.map((v) => v.type).join(', ') || 'none'
  const instructions = `You are a monsoon preparedness expert. Produce a personalized plan in language code "${lang}".\nHousehold size: ${household}. Dwelling: ${dwelling}. Special needs: ${needs}.\nFor each location, consider its weather alerts and rainfall. Return concise, actionable items.`
  return `${instructions}\n\nWeather data:\n${JSON.stringify(weather)}`
}

const json = (status: number, body: unknown): Response => Response.json(body, { status })

export default async (req: Request): Promise<Response> => {
  try {
    const session = await verifySession(req)
    if (!session) return new Response('unauthorized', { status: 401 })
    const db = getDb()

    const [user] = await db.select().from(users).where(eq(users.id, session.sub)).limit(1)
    const locs = await db.select().from(monitoredLocations).where(eq(monitoredLocations.userId, session.sub))
    const vulns = await db.select().from(vulnerabilities).where(eq(vulnerabilities.userId, session.sub))
    if (!locs.length) return json(400, { error: 'no locations' })

    // Fetch + normalize weather for each location (reuses weather.ts pure normalizer).
    const weatherKey = process.env.WEATHER_API_KEY
    const weather: WeatherData[] = []
    if (weatherKey) {
      const results = await Promise.all(
        locs.map(async (l) => {
          const res = await fetch(
            `https://api.weatherapi.com/v1/forecast.json?key=${weatherKey}&q=${l.latitude},${l.longitude}&days=1&alerts=yes`,
            { headers: { Accept: 'application/json' } },
          )
          if (!res.ok) return null
          const d = await res.json()
          return normalizeWeather(l.locationName, d.alerts?.alert ?? [], {
            precip_mm: d.current?.precip_mm,
            condition: { text: d.current?.condition?.text },
          })
        }),
      )
      weather.push(...(results.filter(Boolean) as WeatherData[]))
    }

    const ai = gemini()
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: buildPrompt(user, vulns, weather),
      config: { responseMimeType: 'application/json', responseSchema: PLAN_SCHEMA },
    })

    const planData = JSON.parse(response.text ?? '{}')
    const updatedAt = new Date().toISOString()
    // Normalize the AI output at the boundary so persisted + returned data
    // honestly matches PreparednessPlan (checklist items get done:false, string
    // id/label; locations guarded against missing/non-array).
    const payload: PreparednessPlan = normalizePlan(planData, updatedAt)

    // Replace any existing plan for the user (keep at most one current plan).
    await db.delete(preparednessPlans).where(eq(preparednessPlans.userId, session.sub))
    await db.insert(preparednessPlans).values({ userId: session.sub, locationId: locs[0].id, planData: payload })

    return Response.json(payload)
  } catch (err) {
    console.error('generate-plan failed', err)
    return json(500, { error: 'internal error' })
  }
}
