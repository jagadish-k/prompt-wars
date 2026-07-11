import { describe, it, expect } from 'vitest'
// Import the exported prompt builder + schema to unit-test the deterministic
// parts of the AI request. (The Gemini call + DB writes are integration
// territory — need a live key + DB.)
import { buildPrompt } from '../../../netlify/functions/generate-plan'
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
