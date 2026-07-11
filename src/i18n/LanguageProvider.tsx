import { Suspense, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation()
  if (!i18n.isInitialized) return null
  return <Suspense fallback={null}>{children}</Suspense>
}
