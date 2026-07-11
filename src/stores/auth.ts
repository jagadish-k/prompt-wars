import { create } from 'zustand'
import type { UserProfile } from '@/lib/types'
import { api } from '@/lib/api'

interface AuthState {
  user: UserProfile | null
  loading: boolean
  load: () => Promise<void>
  setUser: (u: UserProfile | null) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  load: async () => {
    try {
      set({ user: await api.getMe(), loading: false })
    } catch {
      set({ user: null, loading: false })
    }
  },
  setUser: (user) => set({ user, loading: false }),
}))
