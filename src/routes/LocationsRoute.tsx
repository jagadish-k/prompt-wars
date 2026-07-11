import { useEffect, useState } from 'react'
import { Button, Card, Input } from '@heroui/react'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useLocationsStore } from '@/stores/locations'

interface GeoHit {
  latitude: number
  longitude: number
  name: string
}

export default function LocationsRoute() {
  const { t } = useTranslation()
  const items = useLocationsStore((s) => s.items)
  const loading = useLocationsStore((s) => s.loading)
  const load = useLocationsStore((s) => s.load)
  const add = useLocationsStore((s) => s.add)
  const remove = useLocationsStore((s) => s.remove)

  const [q, setQ] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void load()
  }, [load])

  async function addCity() {
    if (!q.trim() || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1`,
      )
      const data = (await res.json()) as { results?: GeoHit[] }
      const hit = data.results?.[0]
      if (!hit) {
        setError(t('dashboard.locationsError'))
        return
      }
      await add({ locationName: hit.name, lat: hit.latitude, lng: hit.longitude })
      setQ('')
    } catch (err) {
      // api.request throws `Error("${status} ${statusText}")`; a 409 means the
      // per-user cap of 5 was hit server-side — surface the specific message.
      setError(
        err instanceof Error && err.message.startsWith('409')
          ? t('dashboard.locationsMaxReached')
          : t('dashboard.locationsError'),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="mx-auto max-w-md p-4">
      <h1 className="mb-4 text-xl font-semibold">{t('dashboard.locationsTitle')}</h1>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          void addCity()
        }}
      >
        <Input
          className="min-h-12 flex-1"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label={t('landing.cityNameLabel')}
          placeholder={t('landing.cityNamePlaceholder')}
          fullWidth
        />
        <Button
          type="submit"
          variant="primary"
          className="min-h-12 min-w-12"
          isDisabled={!q.trim() || submitting}
          isPending={submitting}
        >
          {t('dashboard.addLocation')}
        </Button>
      </form>

      {error && (
        <p role="alert" aria-live="assertive" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-6 text-default-500">{t('common.loading')}</p>
      ) : items.length === 0 ? (
        <p className="mt-6 text-default-500">{t('dashboard.locationsEmpty')}</p>
      ) : (
        <ul className="mt-4 grid gap-2">
          {items.map((l) => (
            <li key={l.id}>
              <Card>
                <Card.Content className="flex items-center justify-between">
                  <span>
                    {l.locationName}
                    {l.isPrimary && (
                      <span className="ml-2 text-primary" title={t('dashboard.primaryBadge')}>
                        ★<span className="sr-only">{t('dashboard.primaryBadge')}</span>
                      </span>
                    )}
                  </span>
                  <Button
                    variant="danger"
                    className="min-h-12 min-w-12"
                    aria-label={t('dashboard.removeLocation')}
                    onPress={() => void remove(l.id)}
                  >
                    <X aria-hidden="true" />
                  </Button>
                </Card.Content>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
