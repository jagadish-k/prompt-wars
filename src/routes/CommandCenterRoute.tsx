import { useEffect, useState } from 'react'
import { Button, Tabs } from '@heroui/react'
import { useTranslation } from 'react-i18next'
import { api } from '@/lib/api'
import { useLocationsStore } from '@/stores/locations'
import { Checklist } from '@/components/Checklist'
import { RiskChip } from '@/components/RiskChip'
import type { PreparednessPlan, WeatherData } from '@/lib/types'

export default function CommandCenterRoute() {
  const { t } = useTranslation()
  const items = useLocationsStore((s) => s.items)
  const load = useLocationsStore((s) => s.load)

  const [plan, setPlan] = useState<PreparednessPlan | null>(null)
  const [weather, setWeather] = useState<WeatherData[]>([])
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    let cancelled = false
    // Promise.all([]) resolves asynchronously, so even the empty-items case
    // routes through the .then callback (avoids synchronous setState in the
    // effect body, which the react-hooks/set-state-in-effect rule forbids).
    Promise.all(items.map((l) => api.getWeather(l.lat, l.lng).catch(() => null))).then((w) => {
      if (cancelled) return
      setWeather(w.filter(Boolean) as WeatherData[])
    })
    return () => {
      cancelled = true
    }
  }, [items])

  async function generate() {
    if (generating) return
    setGenerating(true)
    setError(null)
    try {
      setPlan(await api.generatePlan())
    } catch {
      setError(t('dashboard.planError'))
    } finally {
      setGenerating(false)
    }
  }

  return (
    <main className="mx-auto max-w-md p-4">
      <h1 className="mb-4 text-xl font-semibold">{t('dashboard.commandCenter')}</h1>

      <Tabs>
        <Tabs.ListContainer>
          <Tabs.List aria-label={t('dashboard.commandCenter')}>
            <Tabs.Tab id="primary">
              {t('dashboard.primaryStatus')}
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="zones">
              {t('dashboard.savedZones')}
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="plan">
              {t('dashboard.actionPlan')}
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        {/* Primary status: live weather + risk chips per location. */}
        <Tabs.Panel id="primary" className="pt-4">
          <div className="grid gap-2">
            {weather.length === 0 ? (
              <p className="text-default-500">{t('common.loading')}</p>
            ) : (
              weather.map((w) => (
                <div
                  key={w.location}
                  className="flex min-h-12 items-center justify-between rounded-lg border p-3"
                >
                  <span className="font-medium">{w.location}</span>
                  {w.alerts[0] ? (
                    <RiskChip severity={w.alerts[0].severity} label={w.alerts[0].event} />
                  ) : (
                    <span className="text-sm text-default-500">{t('dashboard.allClear')}</span>
                  )}
                </div>
              ))
            )}
          </div>
        </Tabs.Panel>

        {/* Saved zones: the user's monitored locations. */}
        <Tabs.Panel id="zones" className="pt-4">
          {items.length === 0 ? (
            <p className="text-default-500">{t('dashboard.noSavedZones')}</p>
          ) : (
            <ul className="grid gap-1">
              {items.map((l) => (
                <li
                  key={l.id}
                  className="flex min-h-12 items-center justify-between rounded-lg border p-3"
                >
                  <span>{l.locationName}</span>
                  {l.isPrimary && (
                    <span className="text-primary" title={t('dashboard.primaryBadge')}>
                      ★<span className="sr-only">{t('dashboard.primaryBadge')}</span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Tabs.Panel>

        {/* Action plan: AI-generated preparedness plan with checklists. */}
        <Tabs.Panel id="plan" className="pt-4">
          <Button
            variant="primary"
            className="min-h-12 w-full"
            isPending={generating}
            onPress={() => void generate()}
          >
            {t('dashboard.generatePlan')}
          </Button>

          {error && (
            <p role="alert" aria-live="assertive" className="mt-3 text-sm text-danger">
              {error}
            </p>
          )}

          {plan && (
            <div aria-live="polite" className="mt-4 grid gap-4">
              <p>{plan.overview}</p>
              {plan.locations.map((loc) => (
                <section key={loc.locationName} className="rounded-lg border p-3">
                  <h2 className="font-medium">{loc.locationName}</h2>
                  <p className="text-sm text-default-500">{loc.summary}</p>
                  <h3 className="mt-2 text-sm font-medium">{t('dashboard.immediateHeading')}</h3>
                  <Checklist items={loc.immediate} />
                  <h3 className="mt-2 text-sm font-medium">{t('dashboard.suppliesHeading')}</h3>
                  <Checklist items={loc.supplies} />
                  <h3 className="mt-2 text-sm font-medium">{t('dashboard.evacuationHeading')}</h3>
                  <p className="mt-1 text-sm">{loc.evacuation}</p>
                </section>
              ))}
            </div>
          )}
        </Tabs.Panel>
      </Tabs>
    </main>
  )
}
