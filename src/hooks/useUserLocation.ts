import { useEffect, useState } from 'react'
import type { GeoPoint } from '@/lib/types'

export function useUserLocation() {
  const [location, setLocation] = useState<GeoPoint | null>(null)
  useEffect(() => {
    async function fallback() {
      try {
        const res = await fetch('/api/geo-fallback')
        if (res.ok) setLocation((await res.json()) as GeoPoint)
      } catch { /* ignore */ }
    }
    if (!('geolocation' in navigator)) {
      void fallback()
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => fallback(),
      { enableHighAccuracy: false, timeout: 8000 },
    )
  }, [])
  return location
}
