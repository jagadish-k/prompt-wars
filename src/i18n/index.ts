import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import en from '../../locales/en.json'
import hi from '../../locales/hi.json'
import bn from '../../locales/bn.json'

i18n.use(initReactI18next).use(LanguageDetector).init({
  fallbackLng: 'en',
  supportedLngs: ['en', 'hi', 'bn'],
  load: 'languageOnly',
  resources: { en: { translation: en }, hi: { translation: hi }, bn: { translation: bn } },
  detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] },
  interpolation: { escapeValue: false },
})

export default i18n
