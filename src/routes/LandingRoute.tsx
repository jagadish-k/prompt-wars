import { useTranslation } from 'react-i18next'
import { CitySearch } from '@/components/CitySearch'
import { WeatherCard } from '@/components/WeatherCard'
import { GoogleLoginButton } from '@/components/GoogleLoginButton'
import { useTeaserStore } from '@/stores/teaser'
import { useAuthStore } from '@/stores/auth'

export default function LandingRoute() {
  const { t } = useTranslation()
  const cities = useTeaserStore((s) => s.cities)
  const remove = useTeaserStore((s) => s.remove)
  const user = useAuthStore((s) => s.user)

  return (
    <main className="mx-auto max-w-md p-4">
      <h1 className="text-2xl font-semibold">{t('landing.title')}</h1>
      <p className="text-default-500">{t('landing.subtitle')}</p>

      <div className="mt-4">
        <CitySearch />
      </div>

      <section className="mt-4 grid gap-3" aria-live="polite">
        {cities.map((c) => (
          <WeatherCard key={`${c.lat},${c.lng}`} city={c} onRemove={() => remove(c.lat, c.lng)} />
        ))}
      </section>

      {!user && (
        <div className="mt-6 rounded-lg border p-4 text-center">
          <p>{t('landing.loginForPlan')}</p>
          <div className="mt-3 flex justify-center">
            <GoogleLoginButton />
          </div>
        </div>
      )}
    </main>
  )
}
