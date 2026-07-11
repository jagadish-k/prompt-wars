import { describe, it, expect } from 'vitest'
// Import the exported prompt builder + schema to unit-test the deterministic
// parts of the AI request. (The Gemini call + DB writes are integration
// territory — need a live key + DB.)
import { buildPrompt, normalizePlan } from '../../../netlify/functions/generate-plan'
import { PLAN_SCHEMA } from '../../../netlify/functions/_gemini'
import type { WeatherData } from '@/lib/types'

describe('buildPrompt', () => {
  const weather: WeatherData[] = [
    { location: 'Mumbai', alerts: [{ event: 'Flood', severity: 'severe', description: 'x' }], rainfallMm: 120, forecast: 'Heavy rain' },
  ]

  it('injects the preferred language', () => {
    expect(buildPrompt({ preferredLanguage: 'hi', householdSize: 2, dwellingType: 'high_rise' }, [], weather)).toContain(
      'language code "hi"',
    )
  })

  it('defaults to en when language is missing/null', () => {
    expect(buildPrompt({ preferredLanguage: null, householdSize: 1, dwellingType: null }, [], weather)).toContain(
      'language code "en"',
    )
  })

  it('defaults household size to 1 and dwelling to unknown', () => {
    const p = buildPrompt(undefined, [], weather)
    expect(p).toContain('Household size: 1')
    expect(p).toContain('Dwelling: unknown')
  })

  it('lists vulnerability types', () => {
    const p = buildPrompt(undefined, [{ type: 'elderly' }, { type: 'pets' }], weather)
    expect(p).toContain('Special needs: elderly, pets')
  })

  it('falls back to "none" when there are no vulnerabilities', () => {
    expect(buildPrompt(undefined, [], weather)).toContain('Special needs: none')
  })

  it('embeds the weather context as JSON', () => {
    const p = buildPrompt(undefined, [], weather)
    expect(p).toContain('Weather data:')
    expect(p).toContain('Mumbai')
    expect(p).toContain('Heavy rain')
  })
})

describe('PLAN_SCHEMA shape (schema ↔ type alignment)', () => {
  // The schema must drive the model to emit JSON that fits PreparednessPlan /
  // LocationPlan. Verifying structure here guards the contract.
  it('requires top-level overview and locations', () => {
    expect(PLAN_SCHEMA.required).toEqual(['overview', 'locations'])
  })

  it('models locations as an array of objects with all LocationPlan fields', () => {
    const loc = PLAN_SCHEMA.properties.locations.items
    expect(loc.required).toEqual(['locationName', 'summary', 'immediate', 'supplies', 'evacuation'])
  })

  it('models checklist items as { id, label } (done is client-only)', () => {
    const item = PLAN_SCHEMA.properties.locations.items.properties.immediate.items
    expect(item.required).toEqual(['id', 'label'])
    expect(Object.keys(item.properties).sort()).toEqual(['id', 'label'])
  })
})

describe('normalizePlan (AI-output boundary normalizer)', () => {
  // Gemini omits `done` and may emit non-string id/label despite the schema.
  // The normalizer must coerce everything into an honest PreparednessPlan.
  const sampleRaw = {
    overview: 'Stay safe',
    locations: [
      {
        locationName: 'Mumbai',
        summary: 'Flood risk',
        immediate: [{ id: 1, label: 'Move to higher floor' }], // numeric id, no done
        supplies: [{ id: 'w', label: 42 }], // numeric label, no done
        evacuation: 'Go west',
      },
    ],
  }

  it('coerces checklist item id/label to strings and sets done:false', () => {
    const plan = normalizePlan(sampleRaw, '2024-01-01T00:00:00.000Z')
    const item = plan.locations[0].immediate[0]
    expect(item.id).toBe('1') // number -> string
    expect(item.label).toBe('Move to higher floor')
    expect(item.done).toBe(false) // client-only default added at the boundary
    const supply = plan.locations[0].supplies[0]
    expect(supply.id).toBe('w')
    expect(supply.label).toBe('42') // number -> string
    expect(supply.done).toBe(false)
  })

  it('preserves overview and updatedAt', () => {
    const plan = normalizePlan({ overview: 'x', locations: [] }, '2024-02-02T00:00:00.000Z')
    expect(plan.overview).toBe('x')
    expect(plan.updatedAt).toBe('2024-02-02T00:00:00.000Z')
  })

  it('defaults locations to [] when missing or not an array', () => {
    expect(normalizePlan({}, 't').locations).toEqual([])
    expect(normalizePlan({ locations: 'nope' }, 't').locations).toEqual([])
    expect(normalizePlan({ locations: null }, 't').locations).toEqual([])
  })

  it('guards missing immediate/supplies arrays per location', () => {
    const plan = normalizePlan(
      { overview: 'o', locations: [{ locationName: 'Pune', summary: 's', evacuation: 'e' }] },
      't',
    )
    expect(plan.locations[0].immediate).toEqual([])
    expect(plan.locations[0].supplies).toEqual([])
  })
})
