import { describe, it, expect } from 'vitest'
// Import the exported Zod schema to unit-test request validation.
// (The transaction itself is integration-test territory — needs a live DB.)
import { Body } from '../../../netlify/functions/save-profile'

describe('save-profile Body schema', () => {
  it('parses a valid body and defaults vulnerabilityTypes to []', () => {
    const out = Body.parse({
      lat: 19.076,
      lng: 72.8777,
      city: 'Mumbai',
      dwellingType: 'high_rise',
      householdSize: 4,
    })
    expect(out).toEqual({
      lat: 19.076,
      lng: 72.8777,
      city: 'Mumbai',
      dwellingType: 'high_rise',
      householdSize: 4,
      vulnerabilityTypes: [],
    })
  })

  it('accepts provided vulnerabilityTypes', () => {
    const out = Body.parse({
      lat: 0,
      lng: 0,
      city: 'X',
      dwellingType: 'ground_floor',
      householdSize: 1,
      vulnerabilityTypes: ['elderly', 'pets'],
    })
    expect(out.vulnerabilityTypes).toEqual(['elderly', 'pets'])
  })

  it('rejects an invalid dwellingType (maps to 400)', () => {
    expect(
      Body.safeParse({
        lat: 1,
        lng: 1,
        city: 'X',
        dwellingType: 'penthouse',
        householdSize: 1,
      }).success,
    ).toBe(false)
  })

  it('rejects householdSize below 1', () => {
    expect(
      Body.safeParse({
        lat: 1,
        lng: 1,
        city: 'X',
        dwellingType: 'independent_house',
        householdSize: 0,
      }).success,
    ).toBe(false)
  })

  it('rejects non-integer householdSize', () => {
    expect(
      Body.safeParse({
        lat: 1,
        lng: 1,
        city: 'X',
        dwellingType: 'independent_house',
        householdSize: 1.5,
      }).success,
    ).toBe(false)
  })

  it('rejects a missing latitude', () => {
    expect(
      Body.safeParse({
        lng: 1,
        city: 'X',
        dwellingType: 'independent_house',
        householdSize: 1,
      }).success,
    ).toBe(false)
  })
})
