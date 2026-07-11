import { useEffect, useState } from 'react'
import { Button, Card } from '@heroui/react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { api } from '@/lib/api'
import type { GeoPoint, WeatherData } from '@/lib/types'

export function WeatherCard({ city, onRemove }: { city: GeoPoint; onRemove: () => void }) {
  const { t } = useTranslation()
  const [w, setW] = useState<WeatherData | null>(null)

  useEffect(() => {
    let active = true
    api
      .getWeather(city.lat, city.lng)
      .then((data) => {
        if (active) setW(data)
      })
      .catch(() => {
        if (active) setW(null)
      })
    return () => {
      active = false
    }
  }, [city.lat, city.lng])

  const severe = w?.alerts.some((a) => a.severity === 'severe' || a.severity === 'extreme')
  const label = city.city ?? `${city.lat.toFixed(2)}, ${city.lng.toFixed(2)}`

  return (
    <Card>
      <Card.Header>
        <Card.Title>{label}</Card.Title>
        {severe && (
          <span
            className="ml-2 rounded bg-red-600 px-2 text-white"
            role="status"
            aria-live="polite"
          >
            {t('landing.severe')}
          </span>
        )}
        <Button
          isIconOnly
          variant="tertiary"
          size="lg"
          aria-label={t('landing.removeCity')}
          onPress={onRemove}
          className="ml-auto"
        >
          <X aria-hidden="true" />
        </Button>
      </Card.Header>
      <Card.Content>
        <p>{w ? `${w.rainfallMm} mm · ${w.forecast}` : t('common.loading')}</p>
        <div className="mt-2 blur-sm select-none pointer-events-none" aria-hidden="true">
          {t('landing.loginForPlan')}
        </div>
      </Card.Content>
    </Card>
  )
}
