import { create } from 'zustand'
import type { MonitoredLocation } from '@/lib/types'
import { api } from '@/lib/api'

interface LocState {
  items: MonitoredLocation[]
  loading: boolean
  load: () => Promise<void>
  add: (l: { locationName: string; lat: number; lng: number }) => Promise<void>
  remove: (id: string) => Promise<void>
}

export const useLocationsStore = create<LocState>((set, get) => ({
  items: [],
  loading: true,
  // finally ensures `loading` flips even if the fetch fails, so the UI never
  // gets stuck on the loading state.
  load: async () => {
    try {
      set({ items: await api.listLocations() })
    } finally {
      set({ loading: false })
    }
  },
  add: async (l) => {
    const row = await api.saveLocation(l)
    set((s) => ({ items: [...s.items, row] }))
  },
  remove: async (id) => {
    await api.deleteLocation(id)
    set({ items: get().items.filter((i) => i.id !== id) })
  },
}))
