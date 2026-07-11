import { useState } from 'react'
import { Button, Input } from '@heroui/react'
import { useTranslation } from 'react-i18next'
import { useTeaserStore } from '@/stores/teaser'

export function CitySearch() {
  const { t } = useTranslation()
  const [q, setQ] = useState('')
  const add = useTeaserStore((s) => s.add)

  async function search() {
    if (!q.trim()) return
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1`,
      )
      const data = (await res.json()) as {
        results?: { latitude: number; longitude: number; name: string }[]
      }
      const hit = data.results?.[0]
      if (hit) add({ lat: hit.latitude, lng: hit.longitude, city: hit.name })
    } catch {
      /* network or parse error: silently ignore so the teaser stays usable */
    }
    setQ('')
  }

  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        void search()
      }}
    >
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label={t('landing.cityNameLabel')}
        placeholder={t('landing.cityNamePlaceholder')}
        fullWidth
      />
      <Button type="submit" variant="primary" size="lg" className="min-h-12 min-w-12">
        {t('landing.addCity')}
      </Button>
    </form>
  )
}
