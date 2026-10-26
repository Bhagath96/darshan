import { ApiError } from './errors'
import { getDb } from './db'
import { simulate } from './mockClient'
import { requireUser } from './session'
import type { StoredUser } from './seed'
import { assertTempleScope, cleanLocalized, requireTemple } from './validate'
import { NOTICE_BODY_MAX, NOTICE_CATEGORIES, NOTICE_TITLE_MAX } from '@/lib/constants'
import { isValidIsoDate } from '@/lib/date'
import type { Notice, NoticeInput, NoticeQuery } from '@/types'

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
  assertTempleScope(user, templeId, 'You can only manage notices for your own temple.')
}

/** Checks a notice and returns it cleaned up (text trimmed). */
function cleanNotice(input: NoticeInput): Omit<Notice, 'id' | 'publishedAt'> {
  if (input.templeId !== null) requireTemple(input.templeId)
  if (!(NOTICE_CATEGORIES as readonly string[]).includes(input.category)) {
    throw new ApiError('VALIDATION', 'Please choose a notice type.')
  }
  if (input.eventDate !== null && !isValidIsoDate(input.eventDate)) {
    throw new ApiError('VALIDATION', 'Please choose a valid date.')
  }
  return {
    templeId: input.templeId,
    category: input.category,
    important: input.important,
    title: cleanLocalized(input.title, NOTICE_TITLE_MAX, 'title'),
    body: cleanLocalized(input.body, NOTICE_BODY_MAX, 'notice text'),
    eventDate: input.eventDate,
  }
}

/** Staff/admin: publishes a notice straight away. */
export function createNotice(input: NoticeInput): Promise<Notice> {
  return simulate('content', () => {
    const user = requireUser('notice:manage')
    const db = getDb()
    assertNoticeScope(user, input.templeId)
    const clean = cleanNotice(input)
    db.counters.notice += 1
    const notice: Notice = {
      id: `nt-new-${db.counters.notice}`,
      ...clean,
      publishedAt: new Date().toISOString(),
    }
    db.notices.unshift(notice)
    return notice
  })
}

/** Staff/admin: changes a notice. It keeps its place and publish time. */
export function updateNotice(noticeId: string, input: NoticeInput): Promise<Notice> {
  return simulate('content', () => {
    const user = requireUser('notice:manage')
    const notice = getDb().notices.find((n) => n.id === noticeId)
    if (!notice) throw new ApiError('NOT_FOUND', 'This notice does not exist or has been removed.')
    assertNoticeScope(user, notice.templeId)
    assertNoticeScope(user, input.templeId)
    Object.assign(notice, cleanNotice(input))
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
