import { useCallback } from 'react'
import { en, type Dictionary, type MessageKey } from './en'
import { ml } from './ml'
import { formatDate, formatTimeIST } from '@/lib/date'
import { useAppSelector } from '@/store/hooks'
import type { AppError } from '@/store/types'
import type { IsoDate, IsoDateTime, Language, Localized } from '@/types'

const dictionaries: Record<Language, Dictionary> = { en, ml }

export type TranslateVars = Record<string, string | number>

export function translate(lang: Language, key: MessageKey, vars?: TranslateVars): string {
  const template = dictionaries[lang][key]
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  )
}

/** Error codes whose text is the same whatever the request was; these are translated locally. */
const GENERIC_ERRORS = ['NETWORK', 'TIMEOUT', 'UNKNOWN'] as const

export function errorText(lang: Language, error: AppError): string {
  const code = GENERIC_ERRORS.find((c) => c === error.code)
  // Specific errors ("Only 2 tickets are left") come worded from the server.
  return code ? translate(lang, `errors.${code}`) : error.message
}

/**
 * Translation helpers for the current language:
 * `t(key, vars)` for interface text, `pick()` for data stored in both languages,
 * and date/time/error formatters that follow the language too.
 */
export function useT() {
  const lang = useAppSelector((s) => s.i18n.language)
  const t = useCallback(
    (key: MessageKey, vars?: TranslateVars) => translate(lang, key, vars),
    [lang],
  )
  const pick = useCallback((text: Localized) => text[lang] || text.en, [lang])
  const date = useCallback((value: IsoDate) => formatDate(value, lang), [lang])
  const time = useCallback((value: IsoDateTime) => formatTimeIST(value, lang), [lang])
  const err = useCallback((error: AppError) => errorText(lang, error), [lang])
  return { t, pick, date, time, err, lang }
}

export type { MessageKey }
