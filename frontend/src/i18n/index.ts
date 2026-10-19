import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { MRT_Localization_RU } from 'material-react-table/locales/ru/index.js'

import commonRu from './locales/ru/common.json'
import dashboardRu from './locales/ru/dashboard.json'
import authRu from './locales/ru/auth.json'

import commonEn from './locales/en/common.json'
import dashboardEn from './locales/en/dashboard.json'
import authEn from './locales/en/auth.json'

export const defaultNS = 'common'

export const resources = {
  ru: {
    common: commonRu,
    dashboard: dashboardRu,
    auth: authRu,
  },
  en: {
    common: commonEn,
    dashboard: dashboardEn,
    auth: authEn,
  },
} as const

export const supportedLanguages = [
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
] as const

export type SupportedLanguage = (typeof supportedLanguages)[number]['code']

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ru',
    defaultNS,
    ns: ['common', 'dashboard', 'auth'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'chgk_language',
      caches: ['localStorage'],
    },
  })

export function getMrtLocalization(lang: string) {
  if (lang.startsWith('ru')) {
    return MRT_Localization_RU
  }
  // MRT по умолчанию на английском
  return undefined
}

export default i18n
