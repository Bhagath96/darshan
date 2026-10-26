import { z } from '@/lib/zod'
import { isValidPhone } from './phone'
import { isStrongPassword, NAME_PATTERN, USERNAME_PATTERN } from './validators'
import type { MessageKey } from '@/i18n'

/**
 * Zod field schemas for the forms. Messages are translation keys; forms show t(message).
 * The rules come from validators.ts, which the mock server uses too.
 */
const msg = (key: MessageKey) => key

export const nameSchema = z
  .string()
  .transform((v) => v.trim().replace(/\s+/g, ' '))
  .pipe(z.string().regex(NAME_PATTERN, msg('validation.nameInvalid')))

export const phoneSchema = z.string().trim().refine(isValidPhone, msg('validation.phoneInvalid'))

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(USERNAME_PATTERN, msg('validation.usernameInvalid'))

export const newPasswordSchema = z.string().refine(isStrongPassword, msg('validation.passwordWeak'))

export const requiredSchema = z.string().min(1, msg('validation.required'))
