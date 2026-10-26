import { ApiError } from './errors'
import { getDb } from './db'
import { simulate } from './mockClient'
import { requireUser } from './session'
import type { StoredUser } from './seed'
import { NOTICE_BODY_MAX, NOTICE_CATEGORIES, NOTICE_TITLE_MAX } from '@/lib/constants'
import { isValidIsoDate } from '@/lib/date'
import type { Localized, Notice, NoticeInput, NoticeQuery } from '@/types'

/**
 * Public: notices, newest first. Filtering by a temple also includes the notices
 * that apply to every temple (templeId null).
 */
export function getNotices(query: NoticeQuery = {}): Promise<Notice[]> {
  return simulate('content', () => {
    const { templeId, category, limit } = query
    if (templeId && !getDb().temples.some((t) => t.id === templeId)) {
      throw new ApiError('NOT_FOUND', 'Temple not found.')
    }
    const matches = getDb().notices.filter(
      (n) =>
        (!templeId || n.templeId === templeId || n.templeId === null) &&
        (!category || n.category === category),
    )
    return limit === undefined ? matches : matches.slice(0, Math.max(0, limit))
  })
}

/** Public: one notice. */
export function getNotice(noticeId: string): Promise<Notice> {
  return simulate('content', () => {
    const notice = getDb().notices.find((n) => n.id === noticeId)
    if (!notice) throw new ApiError('NOT_FOUND', 'This notice does not exist or has been removed.')
    return notice
  })
}

/** Staff may only post for their own temple; admins for any temple or all of them. */
function assertNoticeScope(user: StoredUser, templeId: string | null) {
  if (user.templeId !== null && templeId !== user.templeId) {
    throw new ApiError('FORBIDDEN', 'You can only manage notices for your own temple.')
  }
}

function cleanText(text: Localized, max: number, what: string): Localized {
  const en = text.en.trim()
  const ml = text.ml.trim()
  if (!en || !ml)
    throw new ApiError('VALIDATION', `Please enter the ${what} in English and Malayalam.`)
  if (en.length > max || ml.length > max)
    throw new ApiError('VALIDATION', `The ${what} can be at most ${max} characters.`)
  return { en, ml }
}

/** Staff/admin: publishes a notice straight away. */
export function createNotice(input: NoticeInput): Promise<Notice> {
  return simulate('content', () => {
    const user = requireUser('notice:manage')
    const db = getDb()
    assertNoticeScope(user, input.templeId)
    if (input.templeId !== null && !db.temples.some((t) => t.id === input.templeId)) {
      throw new ApiError('NOT_FOUND', 'Temple not found.')
    }
    if (!(NOTICE_CATEGORIES as readonly string[]).includes(input.category)) {
      throw new ApiError('VALIDATION', 'Please choose a notice type.')
    }
    if (input.eventDate !== null && !isValidIsoDate(input.eventDate)) {
      throw new ApiError('VALIDATION', 'Please choose a valid date.')
    }
    db.counters.notice += 1
    const notice: Notice = {
      id: `nt-new-${db.counters.notice}`,
      templeId: input.templeId,
      category: input.category,
      important: input.important,
      title: cleanText(input.title, NOTICE_TITLE_MAX, 'title'),
      body: cleanText(input.body, NOTICE_BODY_MAX, 'notice text'),
      publishedAt: new Date().toISOString(),
      eventDate: input.eventDate,
    }
    db.notices.unshift(notice)
    return notice
  })
}

/** Staff/admin: removes a notice. Removing one that is already gone is harmless. */
export function deleteNotice(noticeId: string): Promise<void> {
  return simulate('content', () => {
    const user = requireUser('notice:manage')
    const db = getDb()
    const notice = db.notices.find((n) => n.id === noticeId)
    if (!notice) return
    assertNoticeScope(user, notice.templeId)
    db.notices = db.notices.filter((n) => n.id !== noticeId)
  })
}
