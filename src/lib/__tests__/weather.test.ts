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
