/// <reference types="node" />
import type { WeatherData, WeatherAlert } from '../../src/lib/types'

interface WaAlert { headline?: string; event?: string; severity?: string; description?: string; effective?: string; expires?: string }

export function normalizeWeather(locName: string, alerts: WaAlert[], current: { precip_mm?: number; condition?: { text?: string } }): WeatherData {
  const sevMap: Record<string, WeatherAlert['severity']> = { moderate: 'moderate', severe: 'severe', extreme: 'extreme' }
  return {
    location: locName,
    alerts: (alerts ?? []).map((a) => ({
      event: a.event ?? a.headline ?? 'Weather alert',
      severity: sevMap[(a.severity ?? '').toLowerCase()] ?? 'minor',
      description: a.description ?? '',
      starts: a.effective, expires: a.expires,
    })),
    rainfallMm: current.precip_mm ?? 0,
    forecast: current.condition?.text ?? '',
  }
}

export default async (req: Request): Promise<Response> => {
  const url = new URL(req.url)
  const lat = Number(url.searchParams.get('lat'))
  const lng = Number(url.searchParams.get('lng'))
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return new Response('bad coords', { status: 400 })

  const key = process.env.WEATHER_API_KEY
  if (!key) return new Response('weather not configured', { status: 503 })

  const { getStore } = await import('@netlify/blobs')
  const store = getStore('weather-cache')
  const cacheKey = `${lat.toFixed(2)},${lng.toFixed(2)}`
  const cached = await store.getWithMetadata(cacheKey)
  if (cached?.data && typeof cached.metadata.ttl === 'string' && Date.now() - Number(cached.metadata.ttl) < 10 * 60 * 1000) {
    return Response.json(JSON.parse(cached.data))
  }

  const base = 'https://api.weatherapi.com/v1/forecast.json'
  const q = `${lat},${lng}`
  const res = await fetch(`${base}?key=${key}&q=${q}&days=1&alerts=yes`, { headers: { Accept: 'application/json' } })
  if (!res.ok) return new Response('weather upstream error', { status: 502 })
  const data = await res.json()
  const normalized = normalizeWeather(
    data.location?.name ?? cacheKey,
    data.alerts?.alert ?? [],
    { precip_mm: data.current?.precip_mm, condition: { text: data.current?.condition?.text } },
  )
  await store.setJSON(cacheKey, normalized, { metadata: { ttl: String(Date.now()) } })
  return Response.json(normalized)
}
