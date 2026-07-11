import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Checkbox, CheckboxGroup, Input, Label, Radio, RadioGroup } from '@heroui/react'
import { useTranslation } from 'react-i18next'
import { useUserLocation } from '@/hooks/useUserLocation'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import type { DwellingType } from '@/lib/types'

const DWELLINGS: { value: DwellingType; label: string }[] = [
  { value: 'ground_floor', label: 'onboarding.groundFloor' },
  { value: 'high_rise', label: 'onboarding.highRise' },
  { value: 'independent_house', label: 'onboarding.independentHouse' },
]

const VULNS = ['elderly', 'pets', 'infants', 'mobility_impaired']
const VULN_LABELS: Record<string, string> = {
  elderly: 'onboarding.elderly',
  pets: 'onboarding.pets',
  infants: 'onboarding.infants',
  mobility_impaired: 'onboarding.mobilityImpaired',
}

export default function OnboardingRoute() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const loc = useUserLocation()
  const setUser = useAuthStore((s) => s.setUser)
  const user = useAuthStore((s) => s.user)

  const [dwelling, setDwelling] = useState<DwellingType>('independent_house')
  const [size, setSize] = useState(1)
  const [vulns, setVulns] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Defensive: ProtectedRoute already redirects when there is no user, but keep
  // an explicit guard so the route is safe if mounted elsewhere.
  useEffect(() => {
    if (!user) nav('/', { replace: true })
  }, [user, nav])

  async function save() {
    if (!loc || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await api.saveProfile({
        lat: loc.lat,
        lng: loc.lng,
        city: loc.city ?? 'Home',
        dwellingType: dwelling,
        householdSize: size,
        vulnerabilityTypes: vulns,
      })
      const me = await api.getMe()
      setUser(me)
      nav('/app', { replace: true })
    } catch {
      setError(t('onboarding.error'))
      setSubmitting(false)
    }
  }

  return (
    <main className="mx-auto max-w-md p-4">
      <Card>
        <Card.Header>
          <Card.Title>{t('onboarding.title')}</Card.Title>
        </Card.Header>
        <Card.Content className="grid gap-5">
          <div>
            <p className="font-medium">{t('onboarding.homeLocation')}</p>
            <p className="text-default-500">
              {loc
                ? `${loc.city ?? ''} (${loc.lat.toFixed(2)}, ${loc.lng.toFixed(2)})`
                : t('onboarding.waitingLocation')}
            </p>
          </div>

          <RadioGroup value={dwelling} onChange={(v: string) => setDwelling(v as DwellingType)}>
            <Label>{t('onboarding.dwelling')}</Label>
            {DWELLINGS.map((d) => (
              <Radio key={d.value} value={d.value}>
                <Radio.Content className="min-h-12">
                  <Radio.Control>
                    <Radio.Indicator />
                  </Radio.Control>
                  {t(d.label)}
                </Radio.Content>
              </Radio>
            ))}
          </RadioGroup>

          <div className="flex flex-col gap-1">
            <Label htmlFor="household-size">{t('onboarding.household')}</Label>
            <Input
              id="household-size"
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              className="min-h-12"
              value={String(size)}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const n = Number(e.target.value)
                setSize(Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1)
              }}
            />
          </div>

          <CheckboxGroup value={vulns} onChange={setVulns}>
            <Label>{t('onboarding.vulnerabilities')}</Label>
            {VULNS.map((v) => (
              <Checkbox key={v} value={v}>
                <Checkbox.Content className="min-h-12">
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  {t(VULN_LABELS[v])}
                </Checkbox.Content>
              </Checkbox>
            ))}
          </CheckboxGroup>

          {error && (
            <p role="alert" aria-live="assertive" className="text-danger text-sm">
              {error}
            </p>
          )}

          <Button
            className="min-h-12 w-full"
            isDisabled={!loc || submitting}
            isPending={submitting}
            onPress={save}
          >
            {t('onboarding.save')}
          </Button>
        </Card.Content>
      </Card>
    </main>
  )
}
