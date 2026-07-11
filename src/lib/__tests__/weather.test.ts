import { describe, it, expect } from 'vitest'
// Import the server normalizer for pure-logic testing.
import { normalizeWeather, default as weatherHandler } from '../../../netlify/functions/weather'

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

describe('weather handler bad-coords guard', () => {
  // Regression: Number(null)===0 would pass Number.isFinite and silently query
  // WeatherAPI at (0,0), burning upstream quota on an unauthenticated endpoint.
  // The guard returns 400 before touching env/blobs/fetch, so no mocking is needed.
  const cases: Array<[string, string]> = [
    ['missing both', 'https://x.net/.netlify/functions/weather'],
    ['empty both', 'https://x.net/.netlify/functions/weather?lat=&lng='],
    ['lat only empty', 'https://x.net/.netlify/functions/weather?lat=&lng=1'],
    ['lng only empty', 'https://x.net/.netlify/functions/weather?lat=1&lng='],
    ['non-numeric', 'https://x.net/.netlify/functions/weather?lat=foo&lng=bar'],
  ]
  for (const [name, url] of cases) {
    it(`rejects ${name} with 400`, async () => {
      const res = await weatherHandler(new Request(url))
      expect(res.status).toBe(400)
    })
  }
})
