import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

i18n.use(initReactI18next).use(LanguageDetector).init({
  fallbackLng: 'en',
  resources: { en: { translation: { app: { title: 'Monsoon Ready' } } } },
})

export default i18n
