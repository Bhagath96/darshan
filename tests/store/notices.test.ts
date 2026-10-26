import { describe, expect, it } from 'vitest'
import { makeStore } from '@/store'
import {
  latestNoticesLoaded,
  noticesLoaded,
  noticesRequested,
  noticesSeen,
  selectUnreadNoticeCount,
} from '@/store/notices/noticesSlice'
import type { Notice } from '@/types'

const notice = (id: string, publishedAt: string): Notice => ({
  id,
  templeId: null,
  category: 'GENERAL',
  important: false,
  title: { en: id, ml: id },
  body: { en: '', ml: '' },
  publishedAt,
  eventDate: null,
})

describe('notices slice', () => {
  it('ignores a slow answer to an older filter', () => {
    const store = makeStore()
    const first = store.dispatch(noticesRequested({ templeId: 'tm-krishna' }))
    const second = store.dispatch(noticesRequested({ templeId: 'tm-sastha' }))

    store.dispatch(
      noticesLoaded({
        notices: [notice('sastha', '2026-10-25T00:00:00Z')],
        requestId: second.payload.requestId,
      }),
    )
    store.dispatch(
      noticesLoaded({
        notices: [notice('krishna', '2026-10-25T00:00:00Z')],
        requestId: first.payload.requestId,
      }),
    )

    expect(store.getState().notices.list.data.map((n) => n.id)).toEqual(['sastha'])
  })

  it('counts notices published after the last visit', () => {
    const store = makeStore()
    store.dispatch(
      latestNoticesLoaded([
        notice('new', '2026-10-26T05:00:00Z'),
        notice('older', '2026-10-24T05:00:00Z'),
        notice('ancient', '2026-09-01T05:00:00Z'),
      ]),
    )
    const now = Date.parse('2026-10-26T06:00:00Z')
    // Never visited: the last 7 days count.
    expect(selectUnreadNoticeCount(store.getState(), now)).toBe(2)

    store.dispatch(noticesSeen('2026-10-25T00:00:00Z'))
    expect(selectUnreadNoticeCount(store.getState(), now)).toBe(1)

    store.dispatch(noticesSeen('2026-10-26T06:00:00Z'))
    expect(selectUnreadNoticeCount(store.getState(), now)).toBe(0)
  })
})
