import { describe, it, expect } from 'vitest'
import i18n from '@/i18n'

describe('i18n', () => {
  it('falls back to en and resolves keys per language', async () => {
    await i18n.changeLanguage('hi')
    expect(i18n.t('landing.addCity')).toBe('शहर जोड़ें')
    await i18n.changeLanguage('bn')
    expect(i18n.t('landing.addCity')).toBe('একটি শহর যোগ করুন')
    await i18n.changeLanguage('en')
    expect(i18n.t('landing.addCity')).toBe('Add a city')
  })
})
