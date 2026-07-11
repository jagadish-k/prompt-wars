import type { WeatherData, UserProfile, MonitoredLocation, PreparednessPlan } from './types'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { credentials: 'include', ...init })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T)
}

export const api = {
  getWeather: (lat: number, lng: number) => request<WeatherData>(`/api/weather?lat=${lat}&lng=${lng}`),
  getMe: () => request<UserProfile>('/api/auth/me'),
  logout: () => request<void>('/api/auth/logout', { method: 'POST' }),
  saveProfile: (body: unknown) => request<UserProfile>('/api/save-profile', { method: 'POST', body: JSON.stringify(body) }),
  listLocations: () => request<MonitoredLocation[]>('/api/locations'),
  saveLocation: (body: unknown) => request<MonitoredLocation>('/api/locations', { method: 'POST', body: JSON.stringify(body) }),
  deleteLocation: (id: string) => request<void>(`/api/locations?id=${id}`, { method: 'DELETE' }),
  generatePlan: () => request<PreparednessPlan>('/api/generate-plan', { method: 'POST' }),
}
