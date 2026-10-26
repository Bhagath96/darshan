/** The 27 birth stars, in traditional order, with Malayalam names. */
export const NAKSHATRAS = [
  { id: 'Aswathy', ml: 'അശ്വതി' },
  { id: 'Bharani', ml: 'ഭരണി' },
  { id: 'Karthika', ml: 'കാർത്തിക' },
  { id: 'Rohini', ml: 'രോഹിണി' },
  { id: 'Makayiram', ml: 'മകയിരം' },
  { id: 'Thiruvathira', ml: 'തിരുവാതിര' },
  { id: 'Punartham', ml: 'പുണർതം' },
  { id: 'Pooyam', ml: 'പൂയം' },
  { id: 'Ayilyam', ml: 'ആയില്യം' },
  { id: 'Makam', ml: 'മകം' },
  { id: 'Pooram', ml: 'പൂരം' },
  { id: 'Uthram', ml: 'ഉത്രം' },
  { id: 'Atham', ml: 'അത്തം' },
  { id: 'Chithira', ml: 'ചിത്തിര' },
  { id: 'Chothi', ml: 'ചോതി' },
  { id: 'Vishakam', ml: 'വിശാഖം' },
  { id: 'Anizham', ml: 'അനിഴം' },
  { id: 'Thrikketta', ml: 'തൃക്കേട്ട' },
  { id: 'Moolam', ml: 'മൂലം' },
  { id: 'Pooradam', ml: 'പൂരാടം' },
  { id: 'Uthradam', ml: 'ഉത്രാടം' },
  { id: 'Thiruvonam', ml: 'തിരുവോണം' },
  { id: 'Avittam', ml: 'അവിട്ടം' },
  { id: 'Chathayam', ml: 'ചതയം' },
  { id: 'Puruttathi', ml: 'പൂരുരുട്ടാതി' },
  { id: 'Uthrittathi', ml: 'ഉത്രട്ടാതി' },
  { id: 'Revathi', ml: 'രേവതി' },
] as const

export const NAKSHATRA_IDS = NAKSHATRAS.map((n) => n.id)

export const OFFERING_CATEGORIES = ['POOJA', 'ABHISHEKAM', 'NIVEDYAM', 'SPECIAL'] as const

/** Kinds of temple notice, in the order the filter shows them. */
export const NOTICE_CATEGORIES = ['FESTIVAL', 'TIMING', 'CLOSURE', 'GENERAL'] as const

export const ORDER_STATUSES = ['CONFIRMED', 'CANCELLED', 'COMPLETED'] as const

/** Quantity limits for one cart line. */
export const MIN_QUANTITY = 1
export const MAX_QUANTITY = 10

/** How far ahead an offering can be booked. */
export const MAX_DAYS_AHEAD = 90

export const ORDERS_PAGE_SIZE = 10
export const BOOKINGS_PAGE_SIZE = 10

/** Limits for admin edits. */
export const MAX_SLOT_CAPACITY = 500
export const MAX_OFFERING_PRICE = 100_000
export const NOTICE_TITLE_MAX = 120
export const NOTICE_BODY_MAX = 2000
export const OFFERING_NAME_MAX = 80
export const OFFERING_DESCRIPTION_MAX = 500
export const TEMPLE_TEXT_MAX = 120
export const TEMPLE_ABOUT_MAX = 2000
export const MAX_SCHEDULE_ITEMS = 20

/** Darshan slots can be booked and managed this many days ahead (today included). */
export const SLOT_DAYS = 7
export const SLOT_MIN_MINUTES = 15
export const SLOT_MAX_MINUTES = 240
export const DEFAULT_SLOT_MINUTES = 90

/** Account roles, most powerful first (the order the users page sorts by). */
export const USER_ROLES = ['ADMIN', 'STAFF', 'DEVOTEE'] as const

/** Most rows a CSV export will include. */
export const EXPORT_ROW_LIMIT = 5000

/** Darshan tickets one booking can hold. */
export const MAX_TICKETS_PER_BOOKING = 10

export const IST_TIME_ZONE = 'Asia/Kolkata'
