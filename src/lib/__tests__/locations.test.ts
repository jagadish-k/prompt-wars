import { describe, it, expect } from 'vitest'
// Import the exported Zod schema to unit-test request validation.
// (The DB operations are integration-test territory — need a live DB.)
import { Body } from '../../../netlify/functions/locations'

describe('locations Body schema', () => {
  it('parses a valid body and defaults isPrimary to false', () => {
    const out = Body.parse({ locationName: 'Mumbai', lat: 19.076, lng: 72.8777 })
    expect(out).toEqual({ locationName: 'Mumbai', lat: 19.076, lng: 72.8777, isPrimary: false })
  })

  it('accepts an explicit isPrimary', () => {
    const out = Body.parse({ locationName: 'Pune', lat: 18.52, lng: 73.85, isPrimary: true })
    expect(out.isPrimary).toBe(true)
  })

  it('rejects a missing latitude (maps to 400)', () => {
    expect(Body.safeParse({ locationName: 'X', lng: 1 }).success).toBe(false)
  })

  it('rejects a missing longitude', () => {
    expect(Body.safeParse({ locationName: 'X', lat: 1 }).success).toBe(false)
  })

  it('rejects a non-string locationName', () => {
    expect(Body.safeParse({ locationName: 5, lat: 1, lng: 1 }).success).toBe(false)
  })

  it('rejects an empty locationName', () => {
    expect(Body.safeParse({ locationName: '', lat: 1, lng: 1 }).success).toBe(false)
  })

  it('rejects a non-numeric latitude', () => {
    expect(Body.safeParse({ locationName: 'X', lat: 'a', lng: 1 }).success).toBe(false)
  })

  it('rejects NaN latitude (maps to 400)', () => {
    expect(Body.safeParse({ locationName: 'X', lat: Number.NaN, lng: 1 }).success).toBe(false)
  })

  it('rejects Infinity longitude', () => {
    expect(Body.safeParse({ locationName: 'X', lat: 1, lng: Number.POSITIVE_INFINITY }).success).toBe(
      false,
    )
  })
})
