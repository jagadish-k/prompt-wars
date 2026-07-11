import { create } from 'zustand'
import type { GeoPoint } from '@/lib/types'

interface TeaserState {
  cities: GeoPoint[]
  add: (c: GeoPoint) => void
  remove: (lat: number, lng: number) => void
}

export const useTeaserStore = create<TeaserState>((set) => ({
  cities: [],
  add: (c) =>
    set((s) =>
      s.cities.find((x) => x.lat === c.lat && x.lng === c.lng) ? s : { cities: [...s.cities, c] },
    ),
  remove: (lat, lng) =>
    set((s) => ({ cities: s.cities.filter((c) => !(c.lat === lat && c.lng === lng)) })),
}))
